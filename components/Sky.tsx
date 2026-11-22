"use client";

import { useMemo } from "react";
import { activePeriod, fmtTime, nextPeriod, skyDay } from "@/lib/astro";
import { MoonPhase } from "./Instruments";
import { Reveal } from "./Reveal";

export function Sky({ now }: { now: number }) {
  // Recompute when the local day changes (cheap enough to key on the hour).
  const hourKey = Math.floor(now / 3600_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const day = useMemo(() => skyDay(new Date(now)), [hourKey]);
  const pos = (t: number) => `${Math.min(100, Math.max(0, ((t - day.midnight) / 86_400_000) * 100))}%`;
  const width = (a: number, b: number) => `calc(${pos(b)} - ${pos(a)})`;
  const active = activePeriod(day, now);
  const next = nextPeriod(day, now);
  const mins = next ? Math.round((next.start - now) / 60_000) : null;
  const dayLen = (day.sun.set - day.sun.rise) / 3600_000;

  return (
    <section className="section wrap" id="sky">
      <Reveal className="section__head">
        <div>
          <div className="section__index label">04 — Sun &amp; moon</div>
          <h2>
            Light and <em>feeding windows</em>
          </h2>
        </div>
        <p className="section__intro">
          Solunar theory holds that fish feed harder when the moon is overhead or underfoot (major periods) and around moonrise and
          moonset (minor). Take it for what it&rsquo;s worth — but low light at dawn and dusk is never a bad bet.
        </p>
      </Reveal>

      <div className="grid grid--station">
        <Reveal className="panel span-8">
          <div className="panel__head">
            <h3>Today</h3>
            <span className="pill">
              {active ? `${active.kind} period now` : next && mins != null ? `next ${next.kind} in ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}` : "—"}
            </span>
          </div>

          <div className="track" aria-hidden>
            <div className="track__base" />
            <div className="track__daylight" style={{ left: pos(day.sun.rise), width: width(day.sun.rise, day.sun.set) }} />
            {day.periods.map((p) => (
              <div
                key={p.center}
                className={`track__period ${p.kind === "minor" ? "is-minor" : ""}`}
                style={{ left: pos(p.start), width: width(p.start, p.end) }}
                title={`${p.why}: ${fmtTime(p.start)}–${fmtTime(p.end)}`}
              />
            ))}
            <div className="track__now" style={{ left: pos(now) }} />
          </div>
          <div className="track__ticks label">
            <span>12a</span>
            <span>6a</span>
            <span>noon</span>
            <span>6p</span>
            <span>12a</span>
          </div>

          <ul className="periods">
            {day.periods.map((p) => (
              <li key={p.center} className={`${p.kind === "minor" ? "is-minor" : ""} ${p.end < now ? "is-past" : ""}`}>
                <div className="label">
                  {p.kind} · {p.why}
                </div>
                <div className="mono">
                  {fmtTime(p.start)} – {fmtTime(p.end)}
                </div>
              </li>
            ))}
          </ul>

          <div className="kv" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginTop: 22 }}>
            <div>
              <div className="label">First light</div>
              <div className="v">{fmtTime(day.sun.dawn)}</div>
            </div>
            <div>
              <div className="label">Sunrise</div>
              <div className="v">{fmtTime(day.sun.rise)}</div>
            </div>
            <div>
              <div className="label">Sunset</div>
              <div className="v">{fmtTime(day.sun.set)}</div>
            </div>
            <div>
              <div className="label">Last light</div>
              <div className="v">{fmtTime(day.sun.dusk)}</div>
            </div>
          </div>
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            {Math.floor(dayLen)}h {Math.round((dayLen % 1) * 60)}m of daylight. Shaded band is sun up; solid boxes are major periods, dashed are minor.
          </p>
        </Reveal>

        <Reveal className="panel span-4" delay={80}>
          <div className="panel__head">
            <h3>Moon</h3>
            <span className="label">{Math.round(day.moon.illumination * 100)}% lit</span>
          </div>
          <div style={{ display: "grid", placeItems: "center", padding: "6px 0 12px" }}>
            <MoonPhase phase={day.moon.phase} size={132} />
          </div>
          <p style={{ textAlign: "center", margin: 0, fontFamily: "var(--font-display)", fontSize: 24, fontStyle: "italic" }}>
            {day.moon.phaseName}
          </p>
          <div className="kv" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
            <div>
              <div className="label">Moonrise</div>
              <div className="v">{fmtTime(day.moon.rise)}</div>
            </div>
            <div>
              <div className="label">Moonset</div>
              <div className="v">{fmtTime(day.moon.set)}</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="label">Solunar day</div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }} aria-label={`${day.rating} of 4`}>
              {[1, 2, 3, 4].map((i) => (
                <span key={i} style={{ flex: 1, height: 6, borderRadius: 2, background: i <= day.rating ? "var(--river)" : "var(--rule)" }} />
              ))}
            </div>
            <p className="small muted" style={{ margin: "6px 0 0" }}>Strongest near new and full moon.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
