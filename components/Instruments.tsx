"use client";

import { useEffect, useRef } from "react";
import { cardinal } from "@/lib/units";

/** Wind rose: tick ring, a marker where the wind comes FROM, and a downwind arrow. */
export function Compass({ dir, speed, gust }: { dir: number | null; speed: number | null; gust: number | null }) {
  const d = dir ?? 0;
  return (
    <svg className="compass" viewBox="0 0 200 200" role="img" aria-label={`Wind from ${cardinal(dir)} at ${speed ?? "unknown"} mph`}>
      <circle cx="100" cy="100" r="92" fill="none" stroke="var(--rule)" />
      {Array.from({ length: 72 }, (_, i) => {
        const a = (i * 5 * Math.PI) / 180;
        const major = i % 18 === 0, mid = i % 6 === 0;
        const r1 = 92, r2 = major ? 80 : mid ? 84 : 88;
        return (
          <line
            key={i}
            x1={100 + Math.sin(a) * r1}
            y1={100 - Math.cos(a) * r1}
            x2={100 + Math.sin(a) * r2}
            y2={100 - Math.cos(a) * r2}
            stroke={major ? "var(--ink-2)" : "var(--ink-3)"}
            strokeWidth={major ? 1.6 : 1}
            opacity={major ? 1 : 0.6}
          />
        );
      })}
      {["N", "E", "S", "W"].map((c, i) => {
        const a = (i * Math.PI) / 2;
        return (
          <text
            key={c}
            x={100 + Math.sin(a) * 68}
            y={104 - Math.cos(a) * 68}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="11"
            fill="var(--ink-3)"
          >
            {c}
          </text>
        );
      })}
      <g className="compass__needle" style={{ transform: `rotate(${d}deg)` }}>
        {/* from-marker on the ring */}
        <path d="M100 4 L108 20 L92 20 Z" fill="var(--rust)" />
        {/* downwind arrow through the hub */}
        <line x1="100" y1="28" x2="100" y2="164" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
        <path d="M100 176 L91 158 L109 158 Z" fill="var(--ink)" />
      </g>
      <circle cx="100" cy="100" r="34" fill="var(--card)" stroke="var(--rule)" />
      <text x="100" y="104" textAnchor="middle" fontFamily="var(--font-display)" fontSize="30" fill="var(--ink)">
        {speed != null ? Math.round(speed) : "—"}
      </text>
      <text x="100" y="120" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink-3)" letterSpacing="1">
        {gust != null ? `G ${Math.round(gust)}` : "MPH"}
      </text>
    </svg>
  );
}

/** Streaks drifting downwind behind the wind panel. Speed scales with the wind. */
export function WindLines({ dir, speed }: { dir: number | null; speed: number | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ dir: dir ?? 270, speed: speed ?? 5 });
  state.current = { dir: dir ?? 270, speed: speed ?? 5 };

  useEffect(() => {
    const c = canvas.current;
    if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = c.getContext("2d")!;
    let w = 0, h = 0, raf = 0, visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = c.getBoundingClientRect();
      w = r.width;
      h = r.height;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(c);

    const P = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), l: 10 + Math.random() * 30, v: 0.6 + Math.random() * 0.8 }));
    const color = getComputedStyle(c).color;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const { dir, speed } = state.current;
      const toward = ((dir + 180) * Math.PI) / 180; // blowing toward
      const vx = Math.sin(toward), vy = -Math.cos(toward);
      const k = 0.0004 + speed * 0.00012;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      for (const p of P) {
        p.x += vx * k * p.v;
        p.y += vy * k * p.v * (w / h);
        if (p.x < -0.1) p.x += 1.2;
        if (p.x > 1.1) p.x -= 1.2;
        if (p.y < -0.1) p.y += 1.2;
        if (p.y > 1.1) p.y -= 1.2;
        const x = p.x * w, y = p.y * h, len = p.l * (0.5 + speed / 25);
        ctx.globalAlpha = 0.18 * p.v;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - vx * len, y - vy * len);
        ctx.stroke();
      }
    };
    frame();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={canvas} className="windlines" style={{ color: "var(--river)", width: "100%", height: "100%" }} aria-hidden />;
}

/** Aneroid-style barometer dial, 28.8–31.0 inHg. */
export function Barometer({ value }: { value: number | null }) {
  const MIN = 28.8, MAX = 31.0, SWEEP = 240;
  const v = value ?? (MIN + MAX) / 2;
  const angle = -SWEEP / 2 + ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * SWEEP;
  const arc = (r: number, a0: number, a1: number) => {
    const p = (a: number) => [120 + Math.sin((a * Math.PI) / 180) * r, 120 - Math.cos((a * Math.PI) / 180) * r];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0},${y0} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1}`;
  };
  const words = [
    { at: 29.2, w: "Stormy" },
    { at: 29.6, w: "Rain" },
    { at: 30.0, w: "Change" },
    { at: 30.4, w: "Fair" },
    { at: 30.8, w: "Dry" },
  ];
  const toA = (x: number) => -SWEEP / 2 + ((x - MIN) / (MAX - MIN)) * SWEEP;
  return (
    <svg viewBox="0 0 240 200" style={{ width: "100%", maxWidth: 260, display: "block" }} role="img" aria-label={`Barometer ${value ?? "unknown"} inches`}>
      <path d={arc(100, -SWEEP / 2, SWEEP / 2)} fill="none" stroke="var(--rule)" strokeWidth="10" strokeLinecap="round" />
      <path d={arc(100, toA(30.1), toA(31.0))} fill="none" stroke="color-mix(in srgb, var(--river) 35%, transparent)" strokeWidth="10" strokeLinecap="round" />
      <path d={arc(100, toA(28.8), toA(29.5))} fill="none" stroke="color-mix(in srgb, var(--rust) 30%, transparent)" strokeWidth="10" strokeLinecap="round" />
      {Array.from({ length: 23 }, (_, i) => {
        const x = MIN + i * 0.1;
        const a = (toA(x) * Math.PI) / 180;
        const major = i % 5 === 0;
        return (
          <line
            key={i}
            x1={120 + Math.sin(a) * 86}
            y1={120 - Math.cos(a) * 86}
            x2={120 + Math.sin(a) * (major ? 76 : 81)}
            y2={120 - Math.cos(a) * (major ? 76 : 81)}
            stroke="var(--ink-3)"
            strokeWidth={major ? 1.5 : 1}
          />
        );
      })}
      {words.map(({ at, w }) => {
        const a = (toA(at) * Math.PI) / 180;
        return (
          <text key={w} x={120 + Math.sin(a) * 62} y={123 - Math.cos(a) * 62} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-3)">
            {w}
          </text>
        );
      })}
      <g className="dial__needle" style={{ transform: `rotate(${angle}deg)` }}>
        <path d="M120 30 L124 120 L116 120 Z" fill="var(--rust)" />
      </g>
      <circle cx="120" cy="120" r="7" fill="var(--ink)" />
      <text x="120" y="170" textAnchor="middle" fontFamily="var(--font-display)" fontSize="30" fill="var(--ink)">
        {value != null ? value.toFixed(2) : "—"}
      </text>
      <text x="120" y="186" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="1" fill="var(--ink-3)">
        INHG · SEA LEVEL
      </text>
    </svg>
  );
}

/** Moon disc with the lit fraction drawn as a terminator ellipse. */
export function MoonPhase({ phase, size = 120 }: { phase: number; size?: number }) {
  const r = 50;
  // phase: 0 new → 0.5 full → 1 new. Waxing lit on the right (northern hemisphere).
  const waxing = phase < 0.5;
  const k = Math.cos(phase * 2 * Math.PI); // 1 at new, -1 at full
  const rx = Math.abs(k) * r;
  const litRight = waxing;
  // Build lit shape: half-disc on the lit side + terminator ellipse bulging appropriately.
  const sweepHalf = litRight ? 1 : 0;
  const terminatorSweep = k > 0 ? (litRight ? 0 : 1) : litRight ? 1 : 0;
  const d = `M60,10 A${r},${r} 0 0 ${sweepHalf} 60,110 A${rx},${r} 0 0 ${terminatorSweep} 60,10 Z`;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Moon phase">
      <circle cx="60" cy="60" r={r} fill="#28302b" />
      <path d={d} fill="#f3eedf" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--ink-3)" strokeWidth="1" />
    </svg>
  );
}
