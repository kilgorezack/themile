"use client";

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    mapkit?: any;
    __themileMapkitReady?: () => void;
  }
}

export interface AppleMarker {
  id: string;
  lat: number;
  lon: number;
  title: string;
  subtitle: string;
  kind: "dam" | "gauge";
}

export interface AppleView {
  lat: number;
  lon: number;
  spanDeg: number;
  /** bump to re-apply the same view */
  n: number;
}

let loader: Promise<any> | null = null;

/** Loads MapKit JS once per page and wires it to our token endpoint. */
function loadMapKit(): Promise<any> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    window.__themileMapkitReady = () => {
      window.mapkit.init({
        authorizationCallback: (done: (t: string) => void) => {
          fetch("/api/mapkit-token", { cache: "no-store" })
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
            .then(done)
            .catch(() => {});
        },
      });
      resolve(window.mapkit);
    };
    const s = document.createElement("script");
    s.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.core.js";
    s.crossOrigin = "anonymous";
    s.async = true;
    s.dataset.libraries = "map,annotations,overlays";
    s.dataset.callback = "__themileMapkitReady";
    s.onerror = () => {
      loader = null;
      reject(new Error("MapKit JS failed to load"));
    };
    document.head.appendChild(s);
  });
  return loader;
}

type Status = "checking" | "unconfigured" | "loading" | "ready" | "error";

/**
 * Apple Maps satellite view with our sites and the Mile drawn on top.
 * Selection is shared with the field map through `selected` / `onSelect`.
 */
export function AppleMap({
  markers,
  mile,
  selected,
  onSelect,
  view,
  showLabels,
}: {
  markers: AppleMarker[];
  mile: [number, number][]; // [lat, lon]
  selected: string | null;
  onSelect: (id: string) => void;
  view: AppleView;
  showLabels: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const anns = useRef<Map<string, any>>(new Map());
  const [status, setStatus] = useState<Status>("checking");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // 1. Is a key configured? Avoid loading Apple's script if not.
  useEffect(() => {
    let alive = true;
    fetch("/api/mapkit-token", { cache: "no-store" })
      .then((r) => {
        if (!alive) return;
        if (r.status === 503) setStatus("unconfigured");
        else if (!r.ok) setStatus("error");
        else setStatus("loading");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, []);

  // 2. Create the map. Keyed on "allowed", which stays true from loading → ready,
  // so finishing the load doesn't tear down the map it just made.
  const allowed = status === "loading" || status === "ready";
  useEffect(() => {
    if (!allowed || !el.current) return;
    let alive = true;
    loadMapKit()
      .then((mk) => {
        if (!alive || !el.current) return;
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const m = new mk.Map(el.current, {
          mapType: mk.Map.MapTypes.Hybrid,
          colorScheme: dark ? mk.Map.ColorSchemes.Dark : mk.Map.ColorSchemes.Light,
          showsCompass: mk.FeatureVisibility.Adaptive,
          showsScale: mk.FeatureVisibility.Adaptive,
          showsMapTypeControl: false, // our Field map / Satellite switch replaces it
          isRotationEnabled: false,
          showsPointsOfInterest: false,
        });
        m.addEventListener("select", (e: any) => {
          const id = e.annotation?.data?.id;
          if (id) onSelectRef.current(id);
        });
        mk.addEventListener("error", () => setStatus("error"));
        map.current = m;
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
      map.current?.destroy();
      map.current = null;
      anns.current.clear();
    };
  }, [allowed]);

  // 3. The Mile as a polyline.
  useEffect(() => {
    const m = map.current, mk = window.mapkit;
    if (status !== "ready" || !m || !mile.length) return;
    const line = new mk.PolylineOverlay(
      mile.map(([la, lo]) => new mk.Coordinate(la, lo)),
      { style: new mk.Style({ strokeColor: "#8fe0b0", strokeOpacity: 0.95, lineWidth: 5, lineCap: "round", lineJoin: "round" }) },
    );
    m.addOverlay(line);
    return () => m.removeOverlay(line);
  }, [status, mile]);

  // 4. Markers (rebuilt when values or label setting change; there are only a handful).
  useEffect(() => {
    const m = map.current, mk = window.mapkit;
    if (status !== "ready" || !m) return;
    const list = markers.map(
      (s) =>
        new mk.MarkerAnnotation(new mk.Coordinate(s.lat, s.lon), {
          title: s.title,
          subtitle: s.subtitle,
          color: s.kind === "dam" ? "#1c231f" : "#4b6676",
          glyphColor: "#ffffff",
          glyphText: s.kind === "dam" ? "▪" : "≈",
          titleVisibility: showLabels ? mk.FeatureVisibility.Visible : mk.FeatureVisibility.Hidden,
          subtitleVisibility: showLabels ? mk.FeatureVisibility.Visible : mk.FeatureVisibility.Hidden,
          displayPriority: s.kind === "dam" ? mk.Annotation.DisplayPriority.Required : mk.Annotation.DisplayPriority.High,
          data: { id: s.id },
        }),
    );
    m.addAnnotations(list);
    anns.current = new Map(list.map((a: any) => [a.data.id, a]));
    return () => {
      m.removeAnnotations(list);
      anns.current.clear();
    };
  }, [status, markers, showLabels]);

  // 5. Keep the map's selection in step with the panel.
  useEffect(() => {
    const m = map.current;
    if (status !== "ready" || !m) return;
    const a = selected ? anns.current.get(selected) : null;
    if (a && m.selectedAnnotation !== a) m.selectedAnnotation = a;
    if (!a && m.selectedAnnotation) m.selectedAnnotation = null;
  }, [status, selected, markers, showLabels]);

  // 6. Move when asked (preset buttons, list taps).
  useEffect(() => {
    const m = map.current, mk = window.mapkit;
    if (status !== "ready" || !m) return;
    const lonSpan = view.spanDeg / Math.cos((view.lat * Math.PI) / 180);
    const region = new mk.CoordinateRegion(new mk.Coordinate(view.lat, view.lon), new mk.CoordinateSpan(view.spanDeg, lonSpan));
    m.setRegionAnimated(region, view.n > 0);
  }, [status, view.n]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="applemap">
      <div ref={el} className="applemap__map" />
      {status !== "ready" && (
        <div className="applemap__msg">
          {status === "unconfigured" ? (
            <>
              <strong>Satellite view isn&rsquo;t switched on yet</strong>
              <span>It needs an Apple Maps key added to the site&rsquo;s settings. See docs/apple-maps.md.</span>
            </>
          ) : status === "error" ? (
            <>
              <strong>Couldn&rsquo;t load Apple Maps</strong>
              <span>Check the connection, or the Apple Maps key settings.</span>
            </>
          ) : (
            <span>Loading satellite…</span>
          )}
        </div>
      )}
    </div>
  );
}
