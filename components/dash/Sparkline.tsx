/** Axis-free trend line for tiles. Points are {t, v}; nulls break the line. */
export function Sparkline({
  points,
  color = "var(--river)",
  height = 40,
  area = true,
  label,
}: {
  points: { t: number; v: number | null }[];
  color?: string;
  height?: number;
  area?: boolean;
  label: string;
}) {
  const pts = points.filter((p): p is { t: number; v: number } => p.v != null);
  if (pts.length < 2) return null;
  const W = 200;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  let lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v));
  if (hi - lo < 1e-9) [lo, hi] = [lo - 1, hi + 1];
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;
  const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * W;
  const y = (v: number) => height - ((v - lo) / (hi - lo)) * height;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block", overflow: "visible" }} role="img" aria-label={label}>
      {area && <path d={`${d}L${W},${height}L0,${height}Z`} fill={color} opacity={0.12} />}
      <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={x(last.t)} cy={y(last.v)} r={3} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
