"use client";

import type { Conditions } from "@/lib/types";
import { fmtHour } from "@/lib/astro";
import { cardinal, fmt } from "@/lib/units";
import { MILE } from "@/lib/config";
import { Reveal } from "./Reveal";
import { WeatherIcon } from "./WeatherIcon";

function dayName(t: number, now: number) {
  const d = (x: number) => new Date(x).toLocaleDateString("en-US", { timeZone: MILE.timezone });
  if (d(t) === d(now)) return "today";
  if (d(t) === d(now + 86_400_000)) return "tomorrow";
  return new Date(t).toLocaleDateString("en-US", { weekday: "long", timeZone: MILE.timezone });
}

const windColor = (mph: number) => (mph < 15 ? "var(--river)" : mph < 25 ? "var(--ochre)" : "var(--rust)");

export function Forecast({ c, now }: { c: Conditions; now: number }) {
  const hours = c.hourly.filter((h) => h.t >= now - 3600_000).slice(0, 36);
  const maxWind = Math.max(30, ...hours.map((h) => h.gustMph ?? h.windMph ?? 0));
  const days = c.daily.slice(0, 7);
  const tLo = Math.min(...days.map((d) => d.lowF ?? d.highF ?? 0));
  const tHi = Math.max(...days.map((d) => d.highF ?? d.lowF ?? 0));

  // Calmest stretch in the next daylight-ish 36h: lowest 3-hour rolling gust.
  let calm: { i: number; v: number } | null = null;
  for (let i = 0; i + 3 <= hours.length; i++) {
    const v = hours.slice(i, i + 3).reduce((a, h) => a + (h.gustMph ?? h.windMph ?? 0), 0) / 3;
    const hr = Number(new Date(hours[i].t).toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: MILE.timezone }));
    if (hr >= 7 && hr <= 17 && (!calm || v < calm.v)) calm = { i, v };
  }

  return (
    <section className="section wrap" id="forecast">
      <Reveal className="section__head">
        <div>
          <div className="section__index label">03 — Ahead</div>
          <h2>
            Wind, <em>hour by hour</em>
          </h2>
        </div>
        <p className="section__intro">
          Wind decides more Mile days than anything else. Bars show forecast sustained wind; the tick marks the gust.
          {calm && (
            <>
              {" "}
              Calmest daylight window:{" "}
              <strong>
                {dayName(hours[calm.i].t, now)} {fmtHour(hours[calm.i].t)}–{fmtHour(hours[calm.i].t + 3 * 3600_000)}
              </strong>
              , {calm.v < 3 ? "near calm" : `around ${Math.round(calm.v)} mph`}.
            </>
          )}
        </p>
      </Reveal>

      <Reveal className="panel">
        <div className="panel__head">
          <h3>Next 36 hours</h3>
          <div className="small muted" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[
              ["var(--river)", "under 15 mph"],
              ["var(--ochre)", "15–25"],
              ["var(--rust)", "25+"],
            ].map(([col, l]) => (
              <span key={l} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <i style={{ width: 10, height: 10, borderRadius: 2, background: col, display: "inline-block" }} />
                {l}
              </span>
            ))}
          </div>
        </div>
        {hours.length ? (
          <div className="ribbon" role="list">
            {hours.map((h, i) => {
              const w = h.windMph ?? 0;
              const g = h.gustMph;
              const prevDay = i > 0 && new Date(hours[i - 1].t).toLocaleDateString("en-US", { timeZone: MILE.timezone }) !== new Date(h.t).toLocaleDateString("en-US", { timeZone: MILE.timezone });
              return (
                <div
                  key={h.t}
                  role="listitem"
                  className={`hour ${prevDay ? "is-day-break" : ""}`}
                  title={`${fmtHour(h.t)}: ${h.conditions}, wind ${Math.round(w)} mph from ${cardinal(h.windDir)}${g ? `, gusts ${Math.round(g)}` : ""}`}
                >
                  <span className="hour__t">{prevDay ? new Date(h.t).toLocaleDateString("en-US", { weekday: "short", timeZone: MILE.timezone }) : fmtHour(h.t)}</span>
                  <WeatherIcon icon={h.icon} size={22} />
                  <span className="hour__v">{fmt(h.tempF)}°</span>
                  <div className="hour__bar">
                    <div
                      className="hour__wind"
                      style={{ height: `${(w / maxWind) * 100}%`, background: windColor(g ?? w), transitionDelay: `${i * 18}ms` }}
                    />
                    {g != null && <div className="hour__gust" style={{ bottom: `${(g / maxWind) * 100}%` }} />}
                  </div>
                  <span className="hour__v">{Math.round(w)}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-label={h.windDir != null ? `from ${cardinal(h.windDir)}` : "calm"}>
                    {h.windDir != null && w > 0 ? (
                      <path d="M7 1 L7 13 M3 9 L7 13 L11 9" fill="none" stroke="var(--ink-2)" strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${h.windDir} 7 7)`} />
                    ) : (
                      <circle cx="7" cy="7" r="2.5" fill="none" stroke="var(--ink-3)" />
                    )}
                  </svg>
                  <span className="hour__t">{h.precipChance ? `${Math.round(h.precipChance)}%` : " "}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">Forecast unavailable right now.</p>
        )}
        <p className="small muted" style={{ margin: "10px 0 0" }}>
          Arrows point downwind. Bottom row is chance of precipitation.
        </p>
      </Reveal>

      {days.length > 0 && (
        <Reveal className="panel" delay={100}>
          <div className="panel__head" style={{ marginBottom: 0 }}>
            <h3>The week</h3>
            <span className="label">{c.forecastSource === "tempest" ? "Tempest station forecast" : "NWS forecast"}</span>
          </div>
          <div className="days" style={{ marginTop: 14 }}>
            {days.map((d, i) => {
              const lo = d.lowF ?? d.highF ?? 0, hi = d.highF ?? d.lowF ?? 0;
              const span = tHi - tLo || 1;
              return (
                <div className="day" key={d.t}>
                  <span className="label">{i === 0 ? "Today" : d.label}</span>
                  <WeatherIcon icon={d.icon} size={30} />
                  <span className="small" style={{ minHeight: "2.6em", color: "var(--ink-2)", lineHeight: 1.3 }}>
                    {d.conditions}
                  </span>
                  <span className="day__temps">
                    {fmt(d.highF)}° <span className="lo">{fmt(d.lowF)}°</span>
                  </span>
                  <div className="day__range">
                    <i style={{ left: `${((lo - tLo) / span) * 100}%`, right: `${100 - ((hi - tLo) / span) * 100}%` }} />
                  </div>
                  <span className="small mono muted">
                    {d.windMph != null ? `${Math.round(d.windMph)} mph` : ""}
                    {d.precipChance ? ` · ${Math.round(d.precipChance)}%` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </Reveal>
      )}
    </section>
  );
}
