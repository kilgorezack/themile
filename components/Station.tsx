"use client";

import type { Conditions } from "@/lib/types";
import { cardinal, fmt } from "@/lib/units";
import { fmtHour, fmtTime } from "@/lib/astro";
import { CountUp } from "./CountUp";
import { Barometer, Compass, WindLines } from "./Instruments";
import { Legend, TimeSeries } from "./TimeSeries";
import { Reveal } from "./Reveal";

const SOURCE_LABEL = {
  tempest: "Tempest station",
  wunderground: "Weather Underground PWS",
  nws: "NWS observation",
} as const;

export function Station({ c, now }: { c: Conditions; now: number }) {
  const cur = c.current;
  const hist = c.history;
  const ago = cur ? Math.max(0, Math.round((now - Date.parse(cur.observedAt)) / 60_000)) : null;

  const windSeries = [
    { key: "wind", label: "Average", color: "var(--river)", area: true, points: hist.map((h) => ({ t: h.t, v: h.windMph })) },
    { key: "gust", label: "Gust", color: "var(--rust)", dashed: true, points: hist.map((h) => ({ t: h.t, v: h.gustMph })) },
  ];
  const tempSeries = [{ key: "temp", label: "Air", color: "var(--ochre)", area: true, points: hist.map((h) => ({ t: h.t, v: h.tempF })) }];
  const presSeries = [{ key: "pres", label: "Pressure", color: "var(--slate)", points: hist.map((h) => ({ t: h.t, v: h.pressureInHg })) }];
  const hasHist = hist.length > 3;
  const trendArrow = cur?.pressureTrend === "rising" ? "↗" : cur?.pressureTrend === "falling" ? "↘" : "→";

  const lastStrikeMin = cur?.lightning?.lastEpoch ? Math.round((now / 1000 - cur.lightning.lastEpoch) / 60) : null;

  return (
    <section className="section wrap" id="station">
      <Reveal className="section__head">
        <div>
          <div className="section__index label">01 — On the bank</div>
          <h2>
            The station, <em>right now</em>
          </h2>
        </div>
        <p className="section__intro">
          {cur ? (
            <>
              Reporting from <strong>{cur.stationName}</strong> via {SOURCE_LABEL[cur.source]}.{" "}
              {ago != null && <>Last reading {ago < 2 ? "just now" : `${ago} min ago`}.</>} Updates every minute while this page is open.
            </>
          ) : (
            <>Station data is unavailable at the moment. Forecast and water data below are still current.</>
          )}
        </p>
      </Reveal>

      {cur?.source === "nws" && (
        <div className="notice">
          <span className="label" style={{ color: "var(--ochre)" }}>Note</span>
          <span>
            Showing the nearest National Weather Service station until the Tempest token is added. Set <code>TEMPEST_TOKEN</code> and{" "}
            <code>TEMPEST_STATION_ID</code> (or the Weather Underground keys) in Vercel to light up the on-river station.
          </span>
        </div>
      )}

      <div className="grid grid--station">
        {/* Wind */}
        <Reveal className="panel span-7" delay={0}>
          <WindLines dir={cur?.windDir ?? null} speed={cur?.windMph ?? null} />
          <div className="panel__head" style={{ position: "relative" }}>
            <h3>Wind</h3>
            <span className="label">
              from {cardinal(cur?.windDir)} · {fmt(cur?.windDir)}°
            </span>
          </div>
          <div className="compass-wrap" style={{ position: "relative" }}>
            <Compass dir={cur?.windDir ?? null} speed={cur?.windMph ?? null} gust={cur?.gustMph ?? null} />
            <div>
              <div className="kv" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
                <div>
                  <div className="label">Avg</div>
                  <div className="v">{fmt(cur?.windMph)} mph</div>
                </div>
                <div>
                  <div className="label">Gust</div>
                  <div className="v">{fmt(cur?.gustMph)} mph</div>
                </div>
                <div>
                  <div className="label">Lull</div>
                  <div className="v">{fmt(cur?.lullMph)} mph</div>
                </div>
              </div>
              {hasHist && (
                <div style={{ marginTop: 14 }}>
                  <TimeSeries
                    label="Wind over the last 24 hours"
                    series={windSeries}
                    height={130}
                    yMinFloor={0}
                    format={(v) => `${Math.round(v)}`}
                    formatT={fmtHour}
                    xTicks={4}
                  />
                  <Legend items={windSeries.map((s) => ({ label: s.label, color: s.color, dashed: s.dashed }))} />
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* Air temp */}
        <Reveal className="panel span-5" delay={80}>
          <div className="panel__head">
            <h3>Air</h3>
            <span className="label">{cur?.conditions ?? "Temperature"}</span>
          </div>
          <div className="reading">
            <span className="num">
              <CountUp value={cur?.tempF ?? null} />°
            </span>
            <span className="unit">F</span>
          </div>
          <div className="kv">
            <div>
              <div className="label">Feels like</div>
              <div className="v">{fmt(cur?.feelsLikeF)}°</div>
            </div>
            <div>
              <div className="label">Dew point</div>
              <div className="v">{fmt(cur?.dewPointF)}°</div>
            </div>
            <div>
              <div className="label">Humidity</div>
              <div className="v">{fmt(cur?.humidity)}%</div>
            </div>
          </div>
          {hasHist && (
            <div style={{ marginTop: 16 }}>
              <TimeSeries label="Air temperature, last 24 hours" series={tempSeries} height={120} format={(v) => `${Math.round(v)}°`} formatT={fmtHour} xTicks={4} />
            </div>
          )}
        </Reveal>

        {/* Pressure */}
        <Reveal className="panel span-5" delay={0}>
          <div className="panel__head">
            <h3>Barometer</h3>
            <span className="trend">
              {trendArrow} {cur?.pressureTrend ?? "—"}
            </span>
          </div>
          <Barometer value={cur?.pressureInHg ?? null} />
          {hasHist && (
            <div style={{ marginTop: 8 }}>
              <TimeSeries label="Pressure, last 24 hours" series={presSeries} height={110} yPad={0.3} format={(v) => v.toFixed(2)} formatT={fmtHour} xTicks={4} />
            </div>
          )}
        </Reveal>

        {/* Small tiles */}
        <div className="span-7 grid" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
          <Reveal className="panel tile" delay={60}>
            <span className="label">Rain today</span>
            <span className="num">
              {fmt(cur?.precipTodayIn, 2)}
              <span className="unit">in</span>
            </span>
            <p>{cur?.precipTodayIn == null ? "No rain gauge reporting." : cur.precipTodayIn > 0 ? "Watch for color off the side draws." : "Dry so far today."}</p>
          </Reveal>
          <Reveal className="panel tile" delay={120}>
            <span className="label">UV index</span>
            <span className="num">{fmt(cur?.uv, 0)}</span>
            <p>{uvNote(cur?.uv ?? null)}</p>
          </Reveal>
          <Reveal className="panel tile" delay={180}>
            <span className="label">Sunlight</span>
            <span className="num">
              {fmt(cur?.solarWm2)}
              <span className="unit">W/m²</span>
            </span>
            <p>{cur?.solarWm2 == null ? "No light sensor reporting." : cur.solarWm2 > 500 ? "Bright — fish will hold deeper." : "Low light. Good cover for you."}</p>
          </Reveal>
          <Reveal className="panel tile" delay={240}>
            <span className="label">Lightning</span>
            {cur?.lightning ? (
              <>
                <span className="num" style={{ color: cur.lightning.count3h > 0 ? "var(--rust)" : undefined }}>
                  {cur.lightning.count3h}
                  <span className="unit">strikes · 3h</span>
                </span>
                <p>
                  {cur.lightning.count3h > 0 && lastStrikeMin != null
                    ? `Last ${lastStrikeMin} min ago, ~${fmt(cur.lightning.lastDistanceMi)} mi out. Graphite rods are lightning rods.`
                    : lastStrikeMin != null && cur.lightning.lastEpoch
                      ? `None lately. Last strike detected ${fmtTime(cur.lightning.lastEpoch * 1000)}.`
                      : "No strikes detected."}
                </p>
              </>
            ) : (
              <>
                <span className="num">—</span>
                <p>Lightning detection comes from the Tempest sensor.</p>
              </>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function uvNote(uv: number | null) {
  if (uv == null) return "No UV sensor reporting.";
  if (uv < 3) return "Low. Still bring the buff.";
  if (uv < 6) return "Moderate. High-desert sun adds up.";
  if (uv < 8) return "High. Sunscreen and sun gloves.";
  return "Very high. Cover up — it's 5,900 ft.";
}
