"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RegionData } from "@/lib/region";
import { REGION_GEO as G } from "@/lib/regionGeo";
import { PARAM_LABEL, SITES, type SiteDef } from "@/lib/sites";
import { MILE } from "@/lib/config";
import { useLive, useNow } from "../hooks";
import { TopBar } from "../TopBar";
import { Footer } from "../Footer";
import { TimeSeries } from "../TimeSeries";
import { RequireAuth } from "../auth/RequireAuth";
import { AppleMap, type AppleMarker, type AppleView } from "./AppleMap";

const [LAT0, LAT1, LON0, LON1] = G.bounds;
/** svg units per degree of latitude, for converting view spans to Apple Maps spans */
const UNITS_PER_DEG = G.h / (LAT1 - LAT0);

/** The Mile's path back to [lat, lon] pairs, for drawing on Apple Maps. */
const MILE_LATLON: [number, number][] = (G.mile.match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g) ?? []).map((pair) => {
  const [x, y] = pair.split(",").map(Number);
  return [LAT1 - (y / G.h) * (LAT1 - LAT0), LON0 + (x / G.w) * (LON1 - LON0)];
});

type MapStyle = "field" | "satellite";
const STYLE_KEY = "themile.map.style";

const project = (lat: number, lon: number) => ({
  x: ((lon - LON0) / (LON1 - LON0)) * G.w,
  y: ((LAT1 - lat) / (LAT1 - LAT0)) * G.h,
});

/** Preset views: center (svg units) + span in svg units across the shorter side. */
const VIEWS = {
  system: { label: "Whole system", lat: 42.24, lon: -106.88, span: 1300 },
  mile: { label: "The Mile", lat: 42.205, lon: -106.875, span: 150 },
  pathfinder: { label: "Pathfinder", lat: 42.4, lon: -106.95, span: 420 },
  alcova: { label: "Alcova", lat: 42.54, lon: -106.76, span: 200 },
} as const;
type ViewKey = keyof typeof VIEWS;

const LAYERS = [
  { id: "reservoirs", label: "Reservoirs" },
  { id: "fill", label: "Shade by % full" },
  { id: "rivers", label: "Rivers" },
  { id: "dams", label: "Dams" },
  { id: "gauges", label: "Gauges" },
  { id: "labels", label: "Labels" },
] as const;
type LayerId = (typeof LAYERS)[number]["id"];

type Metric = "QD" | "IN" | "AF" | "FB" | "Q";
const METRIC_LABEL: Record<Metric, string> = { ...PARAM_LABEL, Q: "Streamflow" };
const METRIC_UNIT: Record<Metric, string> = { QD: "cfs", IN: "cfs", AF: "ac-ft", FB: "ft", Q: "cfs" };

const fmtDay = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: MILE.timezone });
const fmtVal = (m: Metric, v: number) =>
  m === "AF" ? `${Math.round(v).toLocaleString()}` : m === "FB" ? v.toFixed(1) : Math.round(v).toLocaleString();

function headline(site: SiteDef, r: RegionData) {
  const d = r.sites[site.id];
  if (!d) return null;
  if (site.kind === "gauge") return d.latest.Q ? `${Math.round(d.latest.Q.v)} cfs` : null;
  return d.latest.QD ? `${Math.round(d.latest.QD.v)} cfs` : null;
}

export function MapApp({ region, serverNow, initialSite }: { region: RegionData; serverNow: number; initialSite: string | null }) {
  const now = useNow(serverNow, 60_000);
  return (
    <>
      <TopBar active="map" now={now} />
      <RequireAuth plans feature="Map" blurb="Seminoe to Alcova: every dam's release, inflow, storage and elevation, plus the river gauges, on one map you can explore.">
        <MapView region={region} initialSite={initialSite} />
      </RequireAuth>
      <Footer source={null} fetchedAt={region.fetchedAt} />
    </>
  );
}

function MapView({ region, initialSite }: { region: RegionData; initialSite: string | null }) {
  const { data: r } = useLive("/api/region", region, 30 * 60_000);
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    reservoirs: true,
    fill: false,
    rivers: true,
    dams: true,
    gauges: true,
    labels: true,
  });
  const [selected, setSelected] = useState<string | null>(initialSite && SITES.some((s) => s.id === initialSite) ? initialSite : null);
  const [metric, setMetric] = useState<Metric | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [style, setStyleState] = useState<MapStyle>("field");
  const [satView, setSatView] = useState<AppleView>(() => {
    const s0 = SITES.find((x) => x.id === initialSite);
    return s0 ? { lat: s0.lat, lon: s0.lon, spanDeg: 0.16, n: 0 } : { lat: VIEWS.system.lat, lon: VIEWS.system.lon, spanDeg: VIEWS.system.span / UNITS_PER_DEG, n: 0 };
  });
  useEffect(() => {
    try {
      if (localStorage.getItem(STYLE_KEY) === "satellite") setStyleState("satellite");
    } catch {}
  }, []);
  const setStyle = (v: MapStyle) => {
    setStyleState(v);
    try {
      localStorage.setItem(STYLE_KEY, v);
    } catch {}
  };
  const jump = (key: ViewKey) => {
    if (style === "satellite") {
      const v = VIEWS[key];
      setSatView((o) => ({ lat: v.lat, lon: v.lon, spanDeg: v.span / UNITS_PER_DEG, n: o.n + 1 }));
    } else setCam(fitView(key));
  };

  /* ── pan / zoom state: center in svg units + k = svg units per screen px ── */
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [cam, setCam] = useState<{ cx: number; cy: number; k: number } | null>(null);

  const fitView = useCallback(
    (key: ViewKey, s = size) => {
      const v = VIEWS[key];
      const c = project(v.lat, v.lon);
      return { cx: c.x, cy: c.y, k: v.span / Math.min(s.w, s.h) };
    },
    [size],
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const s = { w: e.contentRect.width, h: e.contentRect.height };
      setSize(s);
      setCam((c) => {
        if (c) return c;
        const site = SITES.find((x) => x.id === selected);
        if (site) {
          const p = project(site.lat, site.lon);
          return { cx: p.x, cy: p.y, k: 260 / Math.min(s.w, s.h) };
        }
        return fitView("system", s);
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const k = cam?.k ?? 1;
  const vb = cam ? `${cam.cx - (size.w * k) / 2} ${cam.cy - (size.h * k) / 2} ${size.w * k} ${size.h * k}` : `0 0 ${G.w} ${G.h}`;
  const clampK = (v: number) => Math.min(4, Math.max(0.05, v));

  const zoomAt = (factor: number, px?: number, py?: number) =>
    setCam((c) => {
      if (!c) return c;
      const nk = clampK(c.k * factor);
      const sx = px ?? size.w / 2, sy = py ?? size.h / 2;
      // keep the svg point under the cursor fixed
      const wx = c.cx + (sx - size.w / 2) * c.k, wy = c.cy + (sy - size.h / 2) * c.k;
      return { k: nk, cx: wx - (sx - size.w / 2) * nk, cy: wy - (sy - size.h / 2) * nk };
    });

  // Wheel needs a non-passive listener to prevent page scroll.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(Math.exp(e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const moved = useRef(0);
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = 0;
    pinch.current = null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinch.current) {
        const rect = box.current!.getBoundingClientRect();
        zoomAt(pinch.current / d, (pts[0].x + pts[1].x) / 2 - rect.left, (pts[0].y + pts[1].y) / 2 - rect.top);
      }
      pinch.current = d;
      moved.current += 10;
      return;
    }
    const dx = cur.x - prev.x, dy = cur.y - prev.y;
    moved.current += Math.abs(dx) + Math.abs(dy);
    setCam((c) => (c ? { ...c, cx: c.cx - dx * c.k, cy: c.cy - dy * c.k } : c));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const select = (id: string | null) => {
    if (moved.current > 6) return; // that was a drag, not a tap
    setSelected(id);
    setMetric(null);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("site", id);
    else url.searchParams.delete("site");
    window.history.replaceState(null, "", url);
  };

  const goTo = (id: string) => {
    const s = SITES.find((x) => x.id === id)!;
    const p = project(s.lat, s.lon);
    setCam((c) => ({ cx: p.x, cy: p.y, k: Math.min(c?.k ?? 1, 260 / Math.min(size.w, size.h)) }));
    setSatView((o) => ({ lat: s.lat, lon: s.lon, spanDeg: Math.min(o.spanDeg, 0.16), n: o.n + 1 }));
    moved.current = 0;
    select(id);
  };

  const site = SITES.find((s) => s.id === selected) ?? null;
  const sd = site ? r.sites[site.id] : null;
  const metrics = useMemo<Metric[]>(() => {
    if (!site || !sd) return [];
    return (site.kind === "gauge" ? ["Q"] : site.params!).filter((m) => (sd.series[m as Metric]?.length ?? 0) > 1) as Metric[];
  }, [site, sd]);
  const activeMetric = metric && metrics.includes(metric) ? metric : metrics[0] ?? null;

  const resPct = (key: string) => SITES.find((s) => s.reservoir === key)?.id;
  const fillOpacity = (key: string) => {
    if (!layers.fill) return 1;
    const id = resPct(key);
    const pct = id ? r.sites[id]?.pctFull : null;
    return pct == null ? 0.35 : 0.25 + Math.min(1, pct / 100) * 0.75;
  };

  const appleMarkers = useMemo<AppleMarker[]>(
    () =>
      SITES.filter((s) => (s.kind === "dam" ? layers.dams : layers.gauges)).map((s) => ({
        id: s.id,
        lat: s.lat,
        lon: s.lon,
        kind: s.kind,
        title: s.short,
        subtitle: headline(s, r) ?? (s.kind === "gauge" ? "seasonal" : ""),
      })),
    [r, layers.dams, layers.gauges],
  );
  const satellite = style === "satellite";
  const shownLayers = satellite ? LAYERS.filter((l) => l.id === "dams" || l.id === "gauges" || l.id === "labels") : LAYERS;

  const toggle = (id: LayerId) => setLayers((l) => ({ ...l, [id]: !l[id] }));
  const updated = new Date(r.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: MILE.timezone });

  return (
    <>
      <main className="mapx">
        <div className="mapx__stage">
          <div
            ref={box}
            style={satellite ? { visibility: "hidden", pointerEvents: "none" } : undefined}
            aria-hidden={satellite}
            className="mapx__canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={(e) => e.target === e.currentTarget.querySelector("svg") && select(null)}
          >
            <svg viewBox={vb} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of the North Platte from Seminoe Reservoir to Alcova">
              <defs>
                <pattern id="mhatch" width={8 * k} height={8 * k} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2={8 * k} stroke="var(--slate)" strokeWidth={0.8 * k} opacity="0.3" />
                </pattern>
              </defs>

              {/* graticule */}
              <g stroke="var(--rule)" strokeWidth={k} strokeDasharray={`${2 * k} ${5 * k}`}>
                {[41.9, 42.0, 42.1, 42.2, 42.3, 42.4, 42.5, 42.6].map((la) => (
                  <line key={la} x1={-5000} x2={6000} y1={project(la, 0).y} y2={project(la, 0).y} />
                ))}
                {[-107.2, -107.1, -107.0, -106.9, -106.8, -106.7, -106.6, -106.5].map((lo) => (
                  <line key={lo} y1={-5000} y2={6000} x1={project(0, lo).x} x2={project(0, lo).x} />
                ))}
              </g>

              <path d={G.lakes} fill="color-mix(in srgb, var(--slate) 14%, var(--paper))" stroke="var(--slate)" strokeWidth={0.6 * k} opacity="0.7" />

              {layers.rivers && (
                <g fill="none" stroke="var(--slate)" strokeLinejoin="round" strokeLinecap="round">
                  <path d={G.rivers.northPlatte} strokeWidth={2 * k} />
                  <path d={G.rivers.medicineBow} strokeWidth={1.4 * k} opacity="0.8" />
                  <path d={G.rivers.sweetwater} strokeWidth={1.4 * k} opacity="0.8" />
                </g>
              )}

              {layers.reservoirs &&
                (Object.keys(G.reservoirs) as (keyof typeof G.reservoirs)[]).map((key) => (
                  <g key={key} opacity={fillOpacity(key)} style={{ transition: "opacity .4s" }}>
                    <path d={G.reservoirs[key]} fill="color-mix(in srgb, var(--slate) 34%, var(--card))" fillRule="evenodd" />
                    <path d={G.reservoirs[key]} fill="url(#mhatch)" fillRule="evenodd" />
                    <path d={G.reservoirs[key]} fill="none" stroke="var(--slate)" strokeWidth={1.1 * k} strokeLinejoin="round" />
                  </g>
                ))}

              {/* the Mile */}
              <path d={G.mile} fill="none" stroke="var(--river)" strokeWidth={9 * k} strokeLinecap="round" opacity="0.25" />
              <path d={G.mile} fill="none" stroke="var(--river)" strokeWidth={3.5 * k} strokeLinecap="round" />

              {layers.labels &&
                (Object.keys(G.labels) as (keyof typeof G.labels)[])
                  .filter((key) => (key === "kortes" ? k < 0.5 : key === "alcova" ? k < 1 : true))
                  .map((key) => {
                    const [x, y] = G.labels[key];
                    const id = resPct(key);
                    const pct = id ? r.sites[id]?.pctFull : null;
                    return (
                      <g key={key} transform={`translate(${x} ${y}) scale(${k})`} pointerEvents="none">
                        <text textAnchor="middle" className="mapx__reslabel" fontStyle="italic">
                          {key[0].toUpperCase() + key.slice(1)}
                        </text>
                        {pct != null && (
                          <text textAnchor="middle" y="16" className="mapx__sub">
                            {Math.round(pct)}% full
                          </text>
                        )}
                      </g>
                    );
                  })}

              {layers.labels && k < 0.9 && (
                <g transform={`translate(${project(42.21, -106.86).x} ${project(42.21, -106.86).y}) scale(${k})`} pointerEvents="none">
                  <text x="14" className="mapx__mile" fontStyle="italic">
                    Miracle Mile
                  </text>
                </g>
              )}

              {SITES.filter((s) => (s.kind === "dam" ? layers.dams : layers.gauges)).map((s) => {
                const p = project(s.lat, s.lon);
                const on = s.id === selected;
                const val = headline(s, r);
                return (
                  <g
                    key={s.id}
                    transform={`translate(${p.x} ${p.y}) scale(${k})`}
                    className={`mapx__marker ${on ? "is-on" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${s.name}${val ? `, ${val}` : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      select(s.id);
                    }}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), select(s.id))}
                  >
                    <circle r="22" fill="transparent" />
                    {s.kind === "dam" ? (
                      <rect x="-7" y="-7" width="14" height="14" rx="2" className="mapx__dam" />
                    ) : (
                      <circle r="7" className="mapx__gauge" />
                    )}
                    {layers.labels && (
                      <g transform={s.labelSide === "left" ? "translate(-12 4)" : "translate(12 4)"}>
                        <text className="mapx__mlabel" textAnchor={s.labelSide === "left" ? "end" : "start"}>
                          {s.short}
                          {val && <tspan className="mapx__mval"> {val}</tspan>}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {satellite && (
            <AppleMap
              markers={appleMarkers}
              mile={MILE_LATLON}
              selected={selected}
              onSelect={(id) => {
                moved.current = 0;
                select(id);
              }}
              view={satView}
              showLabels={layers.labels}
            />
          )}

          <div className="mapx__style" role="radiogroup" aria-label="Map style">
            {(["field", "satellite"] as MapStyle[]).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={style === v} className={style === v ? "on" : ""} onClick={() => setStyle(v)}>
                {v === "field" ? "Field map" : "Satellite"}
              </button>
            ))}
          </div>

          <button type="button" className="btn mapx__layersbtn" aria-expanded={layersOpen} onClick={() => setLayersOpen((o) => !o)}>
            Layers {layersOpen ? "▴" : "▾"}
          </button>
          <div className={`mapx__layers ${layersOpen ? "is-open" : ""}`} role="group" aria-label="Layers">
            {shownLayers.map((l) => (
              <button key={l.id} type="button" className={`chip ${layers[l.id] ? "on" : ""}`} aria-pressed={layers[l.id]} onClick={() => toggle(l.id)}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="mapx__zoom" hidden={satellite}>
            <button type="button" aria-label="Zoom in" onClick={() => zoomAt(1 / 1.5)}>
              +
            </button>
            <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1.5)}>
              −
            </button>
          </div>

          <div className="mapx__views" role="group" aria-label="Jump to">
            {(Object.keys(VIEWS) as ViewKey[]).map((key) => (
              <button key={key} type="button" className="btn" onClick={() => jump(key)}>
                {VIEWS[key].label}
              </button>
            ))}
          </div>
        </div>

        <aside className="mapx__panel" aria-live="polite">
          {site && sd ? (
            <div className="mapx__detail">
              <button type="button" className="mapx__back" onClick={() => select(null)}>
                ← All sites
              </button>
              <div className="label">{site.kind === "dam" ? "Dam · USBR Hydromet" : `USGS ${site.usgs}`}</div>
              <h1>{site.name}</h1>
              <p className="muted">{site.blurb}</p>

              <div className="mapx__metrics">
                {(site.kind === "gauge" ? (["Q"] as Metric[]) : (site.params as Metric[])).map((m) => {
                  const l = sd.latest[m];
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`mapx__metric ${activeMetric === m ? "is-on" : ""}`}
                      onClick={() => setMetric(m)}
                      disabled={!metrics.includes(m)}
                      aria-pressed={activeMetric === m}
                    >
                      <span className="label">{METRIC_LABEL[m]}</span>
                      <span className="num">{l ? fmtVal(m, l.v) : "—"}</span>
                      <span className="unit">
                        {METRIC_UNIT[m]}
                        {m === "AF" && sd.pctFull != null ? ` · ${Math.round(sd.pctFull)}% full` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeMetric ? (
                <div>
                  <TimeSeries
                    key={`${site.id}-${activeMetric}`}
                    label={`${site.name} ${METRIC_LABEL[activeMetric]}`}
                    series={[
                      {
                        key: activeMetric,
                        label: METRIC_LABEL[activeMetric],
                        color: site.id === "kortes" ? "var(--river)" : "var(--slate)",
                        area: activeMetric !== "FB",
                        points: sd.series[activeMetric]!,
                      },
                    ]}
                    height={180}
                    yMinFloor={0}
                    format={(v) => (activeMetric === "AF" ? `${Math.round(v / 1000)}k` : activeMetric === "FB" ? v.toFixed(0) : `${Math.round(v)}`)}
                    formatT={activeMetric === "Q" ? (t) => new Date(t).toLocaleDateString("en-US", { weekday: "short", timeZone: MILE.timezone }) : fmtDay}
                    xTicks={4}
                  />
                  <p className="small muted" style={{ margin: "6px 0 0" }}>
                    {activeMetric === "Q" ? "Last 7 days, hourly." : "Last 90 days, daily."} {sd.latest[activeMetric] ? `Latest ${fmtDay(sd.latest[activeMetric]!.t)}.` : ""}
                  </p>
                </div>
              ) : (
                <p className="small muted">No recent data from this site — it may be seasonal.</p>
              )}

              <a
                className="small"
                href={site.usgs ? `https://waterdata.usgs.gov/monitoring-location/${site.usgs}/` : "https://www.usbr.gov/gp/hydromet/"}
                rel="noreferrer"
              >
                Source data ↗
              </a>
            </div>
          ) : (
            <div>
              <div className="label">Updated {updated} MT</div>
              <h1>Map</h1>
              <p className="muted" style={{ marginTop: 6 }}>
                Seminoe to Alcova, upstream to downstream. Tap a dam or gauge for its levels and history.
              </p>
              <ul className="mapx__list">
                {SITES.map((s) => {
                  const d = r.sites[s.id];
                  const val = headline(s, r);
                  return (
                    <li key={s.id}>
                      <button type="button" onClick={() => goTo(s.id)}>
                        <span className={`mapx__glyph ${s.kind}`} aria-hidden />
                        <span className="name">
                          {s.name}
                          <small>
                            {s.kind === "dam" ? "Release" : "Streamflow"}
                            {d?.pctFull != null ? ` · ${Math.round(d.pctFull)}% full` : ""}
                          </small>
                        </span>
                        <span className="val">{val ?? <span className="muted">—</span>}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="small muted">
                Reservoir shorelines at full pool from USGS NHD. Releases and storage from USBR Hydromet (daily); gauges from USGS.
              </p>
            </div>
          )}
        </aside>
      </main>
    </>
  );
}
