"use client";

import type { Conditions, WaterData } from "@/lib/types";
import type { RegionData } from "@/lib/region";
import type { WidgetId, WidgetSize } from "@/lib/dashboard/layout";
import { flowBand, FLOW_BANDS, MILE } from "@/lib/config";
import { SITES } from "@/lib/sites";
import { activePeriod, fmtHour, fmtTime, nextPeriod, skyDay } from "@/lib/astro";
import { readTheDay } from "@/lib/verdict";
import { cardinal, fmt } from "@/lib/units";
import { CountUp } from "../CountUp";
import { Compass } from "../Instruments";
import { Legend, TimeSeries } from "../TimeSeries";
import { Sparkline } from "./Sparkline";

export interface DashData {
  c: Conditions;
  w: WaterData;
  r: RegionData;
  now: number;
}

export interface WidgetDef {
  id: WidgetId;
  title: string;
  sizes: WidgetSize[];
  render: (d: DashData, size: WidgetSize) => React.ReactNode;
}

const ymdToMs = (ymd: string) => Date.parse(`${ymd}T12:00:00-07:00`);
const fmtDay = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: MILE.timezone });
const big = (v: number | null, digits = 0) => <CountUp value={v} digits={digits} />;

function Stat({ value, unit, sub }: { value: React.ReactNode; unit?: string; sub?: React.ReactNode }) {
  return (
    <div>
      <div className="dstat">
        <span className="num">{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {sub && <div className="dsub">{sub}</div>}
    </div>
  );
}

export const WIDGETS: Record<WidgetId, WidgetDef> = {
  verdict: {
    id: "verdict",
    title: "Today's read",
    sizes: ["l", "xl", "m"],
    render: ({ c, w, now }) => {
      const day = skyDay(new Date(now));
      const v = readTheDay(c.current, w.release.at(-1)?.value ?? null, c.hourly, Boolean(activePeriod(day, now)));
      return (
        <div className={`tone-${v.tone}`} style={{ display: "grid", gap: 10 }}>
          <span className="pill" style={{ justifySelf: "start" }}>{v.tone}</span>
          <div className="dverdict">{v.headline}</div>
          <ul className="dnotes">
            {v.notes.slice(0, 3).map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      );
    },
  },

  flow: {
    id: "flow",
    title: "Mile flow",
    sizes: ["s", "m", "l"],
    render: ({ w }) => {
      const last = w.release.at(-1);
      const band = flowBand(last?.value);
      return (
        <>
          <Stat value={big(last?.value ?? null)} unit="cfs" sub={band ? band.label : "—"} />
          <div className="dbands" aria-hidden>
            {FLOW_BANDS.map((b, i) => (
              <i key={b.label} className={band?.index === i ? "on" : ""} />
            ))}
          </div>
          <Sparkline label="Kortes release, last 30 days" points={w.release.slice(-30).map((d) => ({ t: ymdToMs(d.date), v: d.value }))} />
          <div className="dfoot">Kortes release · {last ? fmtDay(ymdToMs(last.date)) : "—"}</div>
        </>
      );
    },
  },

  wind: {
    id: "wind",
    title: "Wind now",
    sizes: ["s", "m"],
    render: ({ c }) => {
      const cur = c.current;
      return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 96px", gap: 10, alignItems: "center" }}>
          <Stat value={big(cur?.windMph ?? null)} unit="mph" sub={`${cardinal(cur?.windDir)}${cur?.gustMph != null ? ` · gust ${fmt(cur.gustMph)}` : ""}`} />
          <Compass dir={cur?.windDir ?? null} speed={cur?.windMph ?? null} gust={cur?.gustMph ?? null} />
        </div>
      );
    },
  },

  windChart: {
    id: "windChart",
    title: "Wind · 24 hours",
    sizes: ["l", "xl", "m"],
    render: ({ c }) => {
      const s = [
        { key: "w", label: "Average", color: "var(--river)", area: true, points: c.history.map((h) => ({ t: h.t, v: h.windMph })) },
        { key: "g", label: "Gust", color: "var(--rust)", points: c.history.map((h) => ({ t: h.t, v: h.gustMph })) },
      ].filter((x) => x.points.some((p) => p.v != null));
      return s.length ? (
        <>
          <TimeSeries label="Wind, last 24 hours" series={s} height={150} yMinFloor={0} format={(v) => `${Math.round(v)}`} formatT={fmtHour} xTicks={4} />
          <Legend items={s.map((x) => ({ label: x.label, color: x.color }))} />
        </>
      ) : (
        <p className="muted small">No station history yet.</p>
      );
    },
  },

  air: {
    id: "air",
    title: "Air",
    sizes: ["s", "m"],
    render: ({ c }) => (
      <>
        <Stat value={<>{big(c.current?.tempF ?? null)}°</>} sub={`Feels ${fmt(c.current?.feelsLikeF)}° · ${fmt(c.current?.humidity)}% RH`} />
        <Sparkline label="Air temperature, last 24 hours" color="var(--ochre)" points={c.history.map((h) => ({ t: h.t, v: h.tempF }))} />
      </>
    ),
  },

  pressure: {
    id: "pressure",
    title: "Barometer",
    sizes: ["s", "m"],
    render: ({ c }) => (
      <>
        <Stat
          value={big(c.current?.pressureInHg ?? null, 2)}
          unit="inHg"
          sub={c.current?.pressureTrend ? `${c.current.pressureTrend === "rising" ? "↗" : c.current.pressureTrend === "falling" ? "↘" : "→"} ${c.current.pressureTrend}` : "—"}
        />
        <Sparkline label="Pressure, last 24 hours" color="var(--slate)" area={false} points={c.history.map((h) => ({ t: h.t, v: h.pressureInHg }))} />
      </>
    ),
  },

  hourly: {
    id: "hourly",
    title: "Wind outlook · 24 hours",
    sizes: ["xl", "l"],
    render: ({ c, now }) => {
      const hrs = c.hourly.filter((h) => h.t >= now - 3600_000).slice(0, 24);
      const max = Math.max(20, ...hrs.map((h) => h.gustMph ?? h.windMph ?? 0));
      const col = (v: number) => (v < 15 ? "var(--river)" : v < 25 ? "var(--ochre)" : "var(--rust)");
      return hrs.length ? (
        <div className="dhours">
          {hrs.map((h) => (
            <div key={h.t} title={`${fmtHour(h.t)} · ${Math.round(h.windMph ?? 0)} mph ${cardinal(h.windDir)}${h.gustMph ? `, gust ${Math.round(h.gustMph)}` : ""}`}>
              <span className="v">{Math.round(h.windMph ?? 0)}</span>
              <span className="bar">
                <i style={{ height: `${((h.windMph ?? 0) / max) * 100}%`, background: col(h.gustMph ?? h.windMph ?? 0) }} />
                {h.gustMph != null && <b style={{ bottom: `${(h.gustMph / max) * 100}%` }} />}
              </span>
              <span className="t">{fmtHour(h.t)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small">Forecast unavailable.</p>
      );
    },
  },

  releases: {
    id: "releases",
    title: "Dam releases",
    sizes: ["l", "xl", "m"],
    render: ({ r }) => {
      const dams = SITES.filter((s) => s.kind === "dam");
      const vals = dams.map((s) => r.sites[s.id]?.latest.QD?.v ?? null);
      const max = Math.max(1, ...vals.map((v) => v ?? 0));
      return (
        <div className="dlist">
          {dams.map((s, i) => {
            const d = r.sites[s.id];
            return (
              <a key={s.id} href={`/map?site=${s.id}`} className="drow">
                <span className="name">{s.short}</span>
                <span className="track">
                  <i style={{ width: `${((vals[i] ?? 0) / max) * 100}%`, background: s.id === "kortes" ? "var(--river)" : "var(--slate)" }} />
                </span>
                <span className="val">{vals[i] != null ? `${Math.round(vals[i]!)} cfs` : "—"}</span>
                <span className="spark">
                  <Sparkline label={`${s.short} release, 60 days`} area={false} height={24} color={s.id === "kortes" ? "var(--river)" : "var(--slate)"} points={(d?.series.QD ?? []).slice(-60)} />
                </span>
              </a>
            );
          })}
          <div className="dfoot">Daily mean release · USBR Hydromet · Kortes = the Mile</div>
        </div>
      );
    },
  },

  storage: {
    id: "storage",
    title: "Reservoir storage",
    sizes: ["l", "xl", "m"],
    render: ({ r }) => {
      const res = SITES.filter((s) => s.params?.includes("AF"));
      return (
        <div className="dlist">
          {res.map((s) => {
            const d = r.sites[s.id];
            const af = d?.latest.AF?.v ?? null;
            const fb = d?.latest.FB?.v ?? null;
            return (
              <a key={s.id} href={`/map?site=${s.id}`} className="drow">
                <span className="name">{s.short}</span>
                <span className="track">
                  {d?.pctFull != null ? <i style={{ width: `${Math.min(100, d.pctFull)}%`, background: "var(--slate)" }} /> : <i style={{ width: 0 }} />}
                </span>
                <span className="val">{d?.pctFull != null ? `${Math.round(d.pctFull)}%` : af != null ? `${Math.round(af / 1000)}k af` : "—"}</span>
                <span className="spark small muted mono">{fb != null ? `${fb.toFixed(1)} ft` : ""}</span>
              </a>
            );
          })}
          <div className="dfoot">% of capacity where known · water-surface elevation</div>
        </div>
      );
    },
  },

  gauges: {
    id: "gauges",
    title: "River gauges",
    sizes: ["l", "m", "xl"],
    render: ({ r }) => (
      <div className="dlist">
        {SITES.filter((s) => s.kind === "gauge").map((s) => {
          const d = r.sites[s.id];
          const q = d?.latest.Q?.v ?? null;
          return (
            <a key={s.id} href={`/map?site=${s.id}`} className="drow">
              <span className="name">{s.short}</span>
              <span className="spark wide">
                <Sparkline label={`${s.name}, 7 days`} area={false} height={24} color="var(--slate)" points={d?.series.Q ?? []} />
              </span>
              <span className="val">{q != null ? `${Math.round(q)} cfs` : <span className="muted">seasonal</span>}</span>
            </a>
          );
        })}
        <div className="dfoot">USGS instantaneous streamflow · 7 days</div>
      </div>
    ),
  },

  sky: {
    id: "sky",
    title: "Light & solunar",
    sizes: ["s", "m"],
    render: ({ now }) => {
      const day = skyDay(new Date(now));
      const act = activePeriod(day, now);
      const nxt = nextPeriod(day, now);
      return (
        <div className="dkv">
          <span>Sunrise</span>
          <b>{fmtTime(day.sun.rise)}</b>
          <span>Sunset</span>
          <b>{fmtTime(day.sun.set)}</b>
          <span>Last light</span>
          <b>{fmtTime(day.sun.dusk)}</b>
          <span>{act ? "Now" : "Next"}</span>
          <b>{act ? `${act.kind} to ${fmtTime(act.end)}` : nxt ? `${nxt.kind} ${fmtTime(nxt.start)}` : "—"}</b>
          <span>Moon</span>
          <b>{Math.round(day.moon.illumination * 100)}% · {day.moon.phaseName.toLowerCase()}</b>
        </div>
      );
    },
  },

  lightning: {
    id: "lightning",
    title: "Lightning",
    sizes: ["s", "m"],
    render: ({ c, now }) => {
      const l = c.current?.lightning;
      if (!l) return <p className="muted small">Lightning detection comes from the Tempest sensor.</p>;
      const ago = l.lastEpoch ? Math.round((now / 1000 - l.lastEpoch) / 60) : null;
      return (
        <Stat
          value={<span style={{ color: l.count3h > 0 ? "var(--rough)" : undefined }}>{l.count3h}</span>}
          unit="strikes · 3h"
          sub={l.count3h > 0 ? `Last ${ago} min ago, ~${fmt(l.lastDistanceMi)} mi` : l.lastEpoch ? `Last seen ${fmtTime(l.lastEpoch * 1000)}` : "None detected"}
        />
      );
    },
  },
};
