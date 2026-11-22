"use client";

import { useMemo, useState } from "react";
import { useWidth } from "./hooks";

export interface Series {
  key: string;
  label: string;
  color: string;
  points: { t: number; v: number | null }[];
  dashed?: boolean;
  area?: boolean;
}

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? raw;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

/**
 * Single-axis time series with a crosshair tooltip. Lines draw themselves
 * when the parent `.reveal` gets `is-in`.
 */
export function TimeSeries({
  series,
  height = 160,
  format,
  formatT,
  yPad = 0.12,
  yMinFloor,
  zeroBased = false,
  xTicks = 5,
  markers,
  label,
}: {
  series: Series[];
  height?: number;
  format: (v: number) => string;
  formatT: (t: number) => string;
  yPad?: number;
  yMinFloor?: number;
  /** Force the y-domain to include zero (honest scale for flows). */
  zeroBased?: boolean;
  xTicks?: number;
  markers?: { t: number; label: string }[];
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 10, right: 8, bottom: 22, left: 40 };
  const iw = Math.max(10, width - m.left - m.right);
  const ih = height - m.top - m.bottom;

  const { x, y, yTicks, tMin, tMax, paths, base } = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    const ts = all.map((p) => p.t);
    const vs = all.map((p) => p.v).filter((v): v is number => v != null);
    const tMin = Math.min(...ts), tMax = Math.max(...ts);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    const pad = (hi - lo || Math.abs(hi) || 1) * yPad;
    lo -= pad;
    hi += pad;
    if (yMinFloor != null) lo = Math.max(lo, yMinFloor);
    if (zeroBased) lo = 0;
    const yTicks = niceTicks(lo, hi, 3);
    lo = Math.min(lo, yTicks[0] ?? lo);
    const x = (t: number) => m.left + ((t - tMin) / (tMax - tMin || 1)) * iw;
    const y = (v: number) => m.top + ih - ((v - lo) / (hi - lo || 1)) * ih;
    const base = y(lo);
    const paths = series.map((s) => {
      // Split into contiguous runs so gaps stay gaps (for both line and area).
      const runs: { t: number; v: number }[][] = [];
      let run: { t: number; v: number }[] = [];
      for (const p of s.points) {
        if (p.v == null) {
          if (run.length) runs.push(run);
          run = [];
        } else run.push({ t: p.t, v: p.v });
      }
      if (run.length) runs.push(run);
      let d = "", area = "", len = 0;
      for (const r of runs) {
        const pts = r.map((p) => [x(p.t), y(p.v)] as const);
        const seg = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
        d += seg;
        for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (s.area && pts.length > 1) area += `${seg}L${pts[pts.length - 1][0].toFixed(1)},${base}L${pts[0][0].toFixed(1)},${base}Z`;
      }
      return { d, len: Math.ceil(len) + 10, area: area || null };
    });
    return { x, y, yTicks, tMin, tMax, paths, base };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, iw, ih, yPad, yMinFloor, zeroBased]);

  const primary = series[0]?.points ?? [];
  if (!primary.length) return <p className="muted small">No data yet.</p>;

  const onMove = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    const t = tMin + ((px - m.left) / iw) * (tMax - tMin);
    let best = 0, bestD = Infinity;
    primary.forEach((p, i) => {
      const d = Math.abs(p.t - t);
      if (d < bestD) [best, bestD] = [i, d];
    });
    setHover(best);
  };

  const hp = hover != null ? primary[hover] : null;
  const xt = Array.from({ length: xTicks }, (_, i) => tMin + ((tMax - tMin) * (i + 0.5)) / xTicks);

  return (
    <div
      ref={ref}
      className="chart"
      onPointerMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
      onPointerLeave={() => setHover(null)}
    >
      <svg width={width} height={height} role="img" aria-label={label}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="1" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {yTicks.map((v) => (
          <g key={v}>
            <line className="grid-line" x1={m.left} x2={m.left + iw} y1={y(v)} y2={y(v)} />
            <text className="axis-text" x={m.left - 8} y={y(v) + 3} textAnchor="end">
              {format(v)}
            </text>
          </g>
        ))}
        {xt.map((t) => (
          <text key={t} className="axis-text" x={x(t)} y={height - 6} textAnchor="middle">
            {formatT(t)}
          </text>
        ))}
        {markers?.map((mk) => (
          <g key={mk.t}>
            <line x1={x(mk.t)} x2={x(mk.t)} y1={m.top} y2={base} stroke="var(--rust)" strokeDasharray="2 3" />
            <text className="axis-text" x={x(mk.t) + 4} y={m.top + 8} style={{ fill: "var(--rust)" }}>
              {mk.label}
            </text>
          </g>
        ))}
        {series.map((s, i) =>
          paths[i].area ? <path key={`a-${s.key}`} className="area" d={paths[i].area!} fill={`url(#g-${s.key})`} /> : null,
        )}
        {series.map((s, i) => (
          <path
            key={s.key}
            className={`series ${s.dashed ? "" : "draw"}`}
            d={paths[i].d}
            stroke={s.color}
            strokeDasharray={s.dashed ? "3 4" : undefined}
            style={{ ["--len" as string]: paths[i].len }}
          />
        ))}
        {hp && (
          <g>
            <line x1={x(hp.t)} x2={x(hp.t)} y1={m.top} y2={base} stroke="var(--ink-3)" strokeWidth={1} />
            {series.map((s) => {
              const p = s.points[hover!];
              return p?.v != null ? (
                <circle key={s.key} cx={x(p.t)} cy={y(p.v)} r={4.5} fill={s.color} stroke="var(--card)" strokeWidth={2} />
              ) : null;
            })}
          </g>
        )}
      </svg>
      {hp && (
        <div className="tip" style={{ left: Math.min(Math.max(x(hp.t), 70), width - 70), top: m.top }}>
          <div>{formatT(hp.t)}</div>
          {series.map((s) => {
            const p = s.points[hover!];
            return (
              <div key={s.key}>
                {series.length > 1 && <span style={{ color: s.color }}>● </span>}
                {series.length > 1 && `${s.label} `}
                <b>{p?.v != null ? format(p.v) : "—"}</b>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }} className="small muted">
      {items.map((i) => (
        <span key={i.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width="18" height="6" aria-hidden>
            <line x1="1" x2="17" y1="3" y2="3" stroke={i.color} strokeWidth="2" strokeDasharray={i.dashed ? "3 3" : undefined} strokeLinecap="round" />
          </svg>
          {i.label}
        </span>
      ))}
    </div>
  );
}
