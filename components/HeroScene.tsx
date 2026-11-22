"use client";

import { useEffect, useMemo, useRef } from "react";
import * as SunCalc from "suncalc";
import { MILE } from "@/lib/config";

const W = 1440, H = 900, HORIZON = 560;

/* ── deterministic noise for ridgelines ── */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
function ridge(seed: number, baseY: number, amp: number, roughness: number, steps = 72) {
  const r = rng(seed);
  const ctrl = Array.from({ length: 9 }, () => r());
  const fine = Array.from({ length: steps + 1 }, () => r());
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const k = u * (ctrl.length - 1);
    const i0 = Math.floor(k), f = k - i0;
    const s = (1 - Math.cos(f * Math.PI)) / 2;
    const broad = ctrl[i0] * (1 - s) + (ctrl[Math.min(i0 + 1, ctrl.length - 1)] ?? 0) * s;
    const y = baseY - broad * amp - fine[i] * amp * roughness;
    pts.push([u * W, y]);
  }
  let d = `M0,${H} L${pts[0][0]},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` Q${x0.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${((y0 + y1) / 2).toFixed(1)}`;
  }
  return `${d} L${W},${pts[pts.length - 1][1].toFixed(1)} L${W},${H} Z`;
}

/* ── sky palette keyed on sun altitude ── */
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;

const SKY: { alt: number; top: string; mid: string; low: string; land: number }[] = [
  { alt: -18, top: "#060912", mid: "#0c1322", low: "#172033", land: 0.12 },
  { alt: -9, top: "#0f1830", mid: "#2a2c48", low: "#5b4560", land: 0.22 },
  { alt: -3, top: "#253a5e", mid: "#7a5c78", low: "#e0855a", land: 0.38 },
  { alt: 3, top: "#456f99", mid: "#c99a86", low: "#f2b878", land: 0.6 },
  { alt: 12, top: "#5a8bb5", mid: "#a9c3cf", low: "#efd9b4", land: 0.85 },
  { alt: 35, top: "#4f86b8", mid: "#9cc0d6", low: "#dfe7e0", land: 1 },
];

function skyAt(alt: number) {
  const a = Math.max(SKY[0].alt, Math.min(SKY[SKY.length - 1].alt, alt));
  let i = SKY.findIndex((k) => k.alt >= a);
  if (i <= 0) i = 1;
  const k0 = SKY[i - 1], k1 = SKY[i];
  const t = (a - k0.alt) / (k1.alt - k0.alt || 1);
  return {
    top: css(mix(hex(k0.top), hex(k1.top), t)),
    mid: css(mix(hex(k0.mid), hex(k1.mid), t)),
    low: css(mix(hex(k0.low), hex(k1.low), t)),
    land: k0.land + (k1.land - k0.land) * t,
  };
}

const LAND = {
  far: hex("#6d7f8c"),
  mid: hex("#7d7a5f"),
  near: hex("#5d6845"),
  bank: hex("#3a432e"),
  fore: hex("#262c1f"),
  night: hex("#0b0f12"),
};

function toSky(azimuthDeg: number, alt: number) {
  // suncalc v2 gives degrees, azimuth clockwise from north. Viewer faces south:
  // east (90°) lands on the left, west (270°) on the right.
  const az = azimuthDeg - 180;
  const x = W / 2 + (az / 120) * (W / 2);
  const y = HORIZON - (alt / 60) * (HORIZON - 80);
  return { x, y, alt };
}

export function HeroScene({ now, windMph, cloudy }: { now: number; windMph: number | null; cloudy: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  const ridges = useMemo(
    () => ({
      far: ridge(7, HORIZON + 10, 150, 0.18),
      mid: ridge(21, HORIZON + 70, 90, 0.1),
      near: ridge(42, HORIZON + 150, 60, 0.06),
    }),
    [],
  );
  const stars = useMemo(() => {
    const r = rng(99);
    return Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * (HORIZON - 40), s: r() * 1.3 + 0.3, d: r() * 4 }));
  }, []);

  const date = new Date(now);
  const sp = SunCalc.getPosition(date, MILE.lat, MILE.lon);
  const mp = SunCalc.getMoonPosition(date, MILE.lat, MILE.lon);
  const mi = SunCalc.getMoonIllumination(date);
  const sun = toSky(sp.azimuth, sp.altitude);
  const moon = toSky(mp.azimuth, mp.altitude);
  const sky = skyAt(sun.alt);
  const starOpacity = Math.max(0, Math.min(1, (-sun.alt - 4) / 8));
  const shade = (c: RGB) => css(mix(LAND.night, c, sky.land));
  const cloudSpeed = Math.max(40, 160 - (windMph ?? 8) * 5); // windier → faster clouds

  // Gentle parallax on scroll.
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layers = [...el.querySelectorAll<SVGGElement>("[data-depth]")];
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 900);
        for (const l of layers) l.style.transform = `translateY(${y * Number(l.dataset.depth)}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="hero__scene" ref={root} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={sky.top} />
            <stop offset="0.55" stopColor={sky.mid} />
            <stop offset="0.68" stopColor={sky.low} />
          </linearGradient>
          <radialGradient id="sunglow">
            <stop offset="0" stopColor="#fff4d6" stopOpacity="0.95" />
            <stop offset="0.12" stopColor="#ffd68a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffb060" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="moonglow">
            <stop offset="0" stopColor="#eef2ff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#eef2ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={sky.low} stopOpacity="0.9" />
            <stop offset="1" stopColor={sky.top} stopOpacity="0.95" />
          </linearGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#sky)" />

        <g opacity={starOpacity}>
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" className="twinkle" style={{ animationDelay: `${s.d}s` }} />
          ))}
        </g>

        {moon.alt > -2 && (
          <g data-depth="0.05">
            <circle cx={moon.x} cy={moon.y} r={90} fill="url(#moonglow)" />
            <circle cx={moon.x} cy={moon.y} r={16} fill="#f1efe6" opacity={0.35 + mi.fraction * 0.6} />
          </g>
        )}

        {sun.alt > -6 && (
          <g data-depth="0.05">
            <circle cx={sun.x} cy={sun.y} r={260} fill="url(#sunglow)" />
            <circle cx={sun.x} cy={sun.y} r={22} fill="#fff6e0" opacity={Math.min(1, (sun.alt + 6) / 6)} />
          </g>
        )}

        <g opacity={cloudy ? 0.75 : 0.35} filter="url(#soft)" data-depth="0.08">
          {[
            { y: 150, w: 420, d: 0 },
            { y: 250, w: 300, d: -cloudSpeed * 0.45 },
            { y: 110, w: 520, d: -cloudSpeed * 0.8 },
          ].map((c, i) => (
            <ellipse
              key={i}
              cx={0}
              cy={c.y}
              rx={c.w / 2}
              ry={34}
              fill={sky.land > 0.5 ? "#fff" : "#8b8ea6"}
              className="drift"
              style={{ animationDuration: `${cloudSpeed}s`, animationDelay: `${c.d}s` }}
            />
          ))}
        </g>

        <g className="hero__layer" data-depth="0.12">
          <path d={ridges.far} fill={shade(LAND.far)} />
        </g>
        <g className="hero__layer" data-depth="0.08">
          <path d={ridges.mid} fill={shade(LAND.mid)} />
        </g>
        <g className="hero__layer" data-depth="0.04">
          <path d={ridges.near} fill={shade(LAND.near)} />
          {/* the river: a lazy S through the bottomland */}
          <path
            d={`M-20,${H - 150} C300,${H - 190} 520,${H - 110} 800,${H - 140} S1260,${H - 200} ${W + 20},${H - 165} L${W + 20},${H - 95} C1200,${H - 120} 1000,${H - 70} 760,${H - 85} S300,${H - 110} -20,${H - 80} Z`}
            fill="url(#water)"
          />
          <g stroke="#fff" strokeOpacity={0.25 + sky.land * 0.25} strokeWidth="2" fill="none" strokeLinecap="round">
            <path className="shimmer" d={`M40,${H - 125} C340,${H - 160} 560,${H - 100} 820,${H - 118} S1240,${H - 170} 1420,${H - 140}`} />
            <path
              className="shimmer"
              style={{ animationDelay: "-3s", animationDuration: "9s" }}
              d={`M-10,${H - 100} C320,${H - 135} 560,${H - 85} 800,${H - 100} S1220,${H - 150} 1450,${H - 118}`}
            />
          </g>
        </g>
        <g className="hero__layer" data-depth="0">
          <path
            d={`M0,${H - 70} C220,${H - 92} 420,${H - 60} 700,${H - 72} S1180,${H - 58} ${W},${H - 80} L${W},${H} L0,${H} Z`}
            fill={shade(LAND.bank)}
          />
          {/* sagebrush tufts along the near bank */}
          <g fill={shade(LAND.fore)}>
            {Array.from({ length: 26 }, (_, i) => {
              const x = (i * 571) % W;
              const y = H - 62 + ((i * 37) % 22);
              const s = 0.6 + ((i * 13) % 10) / 14;
              return <ellipse key={i} cx={x} cy={y} rx={26 * s} ry={11 * s} />;
            })}
          </g>
          <path d={`M0,${H - 30} C400,${H - 44} 900,${H - 22} ${W},${H - 36} L${W},${H} L0,${H} Z`} fill={shade(LAND.fore)} />
        </g>
      </svg>
    </div>
  );
}
