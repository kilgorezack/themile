"use client";

import { useMemo, useState } from "react";
import type { WaterData } from "@/lib/types";
import { FLOW_BANDS, flowBand, MILE } from "@/lib/config";
import { fmt } from "@/lib/units";
import { CountUp } from "./CountUp";
import { TimeSeries } from "./TimeSeries";
import { Reveal } from "./Reveal";
import { useInView } from "./hooks";

const RANGES = [
  { key: 30, label: "30d" },
  { key: 60, label: "60d" },
  { key: 120, label: "120d" },
] as const;

function dateToMs(ymd: string) {
  return Date.parse(`${ymd}T12:00:00-07:00`);
}
const fmtDay = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: MILE.timezone });

export function Water({ w }: { w: WaterData }) {
  const [range, setRange] = useState<number>(60);
  const latest = w.release.at(-1) ?? null;
  const prev = w.release.at(-2) ?? null;
  const weekAgo = w.release.at(-8) ?? null;
  const band = flowBand(latest?.value);
  const change = latest && prev ? latest.value - prev.value : null;
  const weekChange = latest && weekAgo ? latest.value - weekAgo.value : null;

  const series = useMemo(() => {
    const pts = w.release.slice(-range).map((d) => ({ t: dateToMs(d.date), v: d.value }));
    return [{ key: "release", label: "Release", color: "var(--river)", area: true, points: pts }];
  }, [w.release, range]);

  const inflowSeries = useMemo(
    () => [{ key: "inflow", label: "Inflow", color: "var(--slate)", area: true, points: w.inflow.map((p) => ({ t: p.t, v: p.cfs })) }],
    [w.inflow],
  );

  return (
    <section className="section wrap" id="water">
      <Reveal className="section__head">
        <div>
          <div className="section__index label">02 — The water</div>
          <h2>
            What Kortes is <em>letting out</em>
          </h2>
        </div>
        <p className="section__intro">
          The Mile is a tailwater: its flow is whatever the Bureau of Reclamation releases from Kortes Dam. Daily figures post the
          following morning, so today&rsquo;s number reflects yesterday&rsquo;s average.
        </p>
      </Reveal>

      <div className="grid grid--station">
        <Reveal className="panel span-4">
          <div className="panel__head">
            <h3>Flow</h3>
            <span className="label">{latest ? fmtDay(dateToMs(latest.date)) : "—"}</span>
          </div>
          <div className="reading">
            <span className="num">
              <CountUp value={latest?.value ?? null} />
            </span>
            <span className="unit">cfs</span>
          </div>
          <div className="kv" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
            <div>
              <div className="label">vs. yesterday</div>
              <div className="v">{change == null ? "—" : `${change > 0 ? "+" : ""}${Math.round(change)}`}</div>
            </div>
            <div>
              <div className="label">vs. last week</div>
              <div className="v">{weekChange == null ? "—" : `${weekChange > 0 ? "+" : ""}${Math.round(weekChange)}`}</div>
            </div>
          </div>
          <div className="bands" role="img" aria-label={`Flow band: ${band?.label ?? "unknown"}`}>
            {FLOW_BANDS.map((b, i) => (
              <div key={b.label} className={`band ${band?.index === i ? "is-active" : ""}`} />
            ))}
          </div>
          <div className="band-labels">
            {FLOW_BANDS.map((b, i) => (
              <span key={b.label} className={band?.index === i ? "is-active" : ""} title={b.label}>
                {i === 0 ? "<300" : b.max === Infinity ? "3k+" : `<${b.max >= 1000 ? `${b.max / 1000}k` : b.max}`}
              </span>
            ))}
          </div>
          {band && (
            <p style={{ margin: "16px 0 0" }}>
              <strong>{band.label}.</strong> <span className="muted">{band.note}</span>
            </p>
          )}
        </Reveal>

        <Reveal className="panel span-8" delay={80}>
          <div className="panel__head">
            <h3>Kortes Dam release</h3>
            <div role="tablist" aria-label="Range" style={{ display: "flex", gap: 4 }}>
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  role="tab"
                  aria-selected={range === r.key}
                  onClick={() => setRange(r.key)}
                  className="mono"
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid var(--rule)",
                    background: range === r.key ? "var(--ink)" : "transparent",
                    color: range === r.key ? "var(--paper)" : "var(--ink-2)",
                    cursor: "pointer",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {series[0].points.length ? (
            <TimeSeries
              key={range}
              label={`Kortes Dam daily release, last ${range} days`}
              series={series}
              height={260}
              zeroBased
              format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
              formatT={fmtDay}
            />
          ) : (
            <p className="muted">Reclamation data is unavailable right now.</p>
          )}
          <p className="small muted" style={{ margin: "8px 0 0" }}>
            Daily mean release, cubic feet per second. Source: USBR Great Plains Hydromet, station KORR.
          </p>
        </Reveal>

        <Reveal className="panel span-5">
          <div className="panel__head">
            <h3>Reservoirs</h3>
            <span className="label">storage</span>
          </div>
          <Tank name="Seminoe" sub="above the Mile — feeds Kortes" r={w.seminoe} />
          <Tank name="Pathfinder" sub="below the Mile — where the fish run from" r={w.pathfinder} />
        </Reveal>

        <Reveal className="panel span-7" delay={80}>
          <div className="panel__head">
            <h3>Upstream inflow</h3>
            <span className="label">USGS 06630000 · 7 days</span>
          </div>
          {w.inflow.length ? (
            <>
              <div className="reading" style={{ marginBottom: 12 }}>
                <span className="num" style={{ fontSize: 44 }}>
                  {fmt(w.inflow.at(-1)?.cfs)}
                </span>
                <span className="unit">cfs into Seminoe</span>
              </div>
              <TimeSeries
                label="North Platte inflow above Seminoe, last 7 days"
                series={inflowSeries}
                height={150}
                yMinFloor={0}
                format={(v) => `${Math.round(v)}`}
                formatT={(t) => new Date(t).toLocaleDateString("en-US", { weekday: "short", timeZone: MILE.timezone })}
              />
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                North Platte above Seminoe Reservoir. Rising inflow in spring is the early hint that Reclamation may bump releases.
              </p>
            </>
          ) : (
            <p className="muted">USGS gauge data is unavailable right now.</p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function Tank({ name, sub, r }: { name: string; sub: string; r: WaterData["seminoe"] }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const pct = r.pctFull ?? 0;
  return (
    <div className="tank" ref={ref}>
      <div className="tank__vessel" aria-hidden>
        <div className="tank__water" style={{ height: inView ? `${Math.min(100, pct)}%` : 0 }}>
          <svg viewBox="0 0 200 8" preserveAspectRatio="none">
            <path d="M0 4 Q12.5 0 25 4 T50 4 T75 4 T100 4 T125 4 T150 4 T175 4 T200 4 V8 H0Z" fill="var(--river)" />
          </svg>
        </div>
      </div>
      <div>
        <div className="label">{sub}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
          <h3 style={{ fontSize: 26 }}>{name}</h3>
          <span className="num" style={{ fontSize: 30 }}>
            {r.pctFull != null ? <CountUp value={r.pctFull} /> : "—"}
            <span className="unit" style={{ fontSize: 12, marginLeft: 2 }}>% full</span>
          </span>
        </div>
        <div className="small muted mono" style={{ marginTop: 4 }}>
          {r.storageAf != null ? `${Math.round(r.storageAf).toLocaleString()} ac-ft` : "—"}
          {r.elevFt != null && ` · ${r.elevFt.toFixed(1)} ft elev`}
        </div>
      </div>
    </div>
  );
}
