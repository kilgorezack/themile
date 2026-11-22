"use client";

import { useMemo } from "react";
import type { Conditions, WaterData } from "@/lib/types";
import { activePeriod, fmtTime, nextPeriod, skyDay, type SkyDay } from "@/lib/astro";
import { bestWindow, type BestWindow } from "@/lib/bestWindow";
import { readTheDay } from "@/lib/verdict";
import { flowBand, MILE } from "@/lib/config";
import { HATCHES, MONTHS } from "@/lib/hatches";
import { cardinal, fmt } from "@/lib/units";
import { useLive, useNow } from "../hooks";
import { TopBar } from "../TopBar";
import { Footer } from "../Footer";
import { HeroScene } from "../HeroScene";
import { CountUp } from "../CountUp";
import { Sparkline } from "../dash/Sparkline";
import { Compass } from "../Instruments";
import { NextHours } from "../Forecast";
import { MoonCard } from "../Sky";
import { RiverMap } from "../RiverMap";
import { MILE_GEO } from "@/lib/mileGeo";

const H = 3600_000;
const ymdToMs = (ymd: string) => Date.parse(`${ymd}T12:00:00-07:00`);

/** "noon", "3 PM", "6:30 AM" */
function clock(t: number) {
  const s = new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: MILE.timezone });
  if (s === "12:00 PM") return "noon";
  return s.replace(":00", "");
}
const span = (a: number, b: number) => `${clock(a)} – ${clock(b)}`;

/** Big time with a small AM/PM, so "9:32 PM" never wraps in a card. */
function BigTime({ t }: { t: number }) {
  const s = new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: MILE.timezone });
  const [hm, ap] = s.split(" ");
  return (
    <>
      {hm}
      <small className="mono"> {ap}</small>
    </>
  );
}

export function HomeApp({ conditions, water, serverNow }: { conditions: Conditions; water: WaterData; serverNow: number }) {
  const now = useNow(serverNow, 30_000);
  const { data: c, stale } = useLive("/api/conditions", conditions, 60_000);
  const { data: w } = useLive("/api/water", water, 30 * 60_000);
  const cur = c.current;

  const today = useMemo(() => skyDay(new Date(now)), [Math.floor(now / H)]); // eslint-disable-line react-hooks/exhaustive-deps
  // After today's light is gone, plan tomorrow instead.
  const plan = useMemo(() => {
    const t = bestWindow(c.hourly, today, now);
    if (t) return { day: today, win: t, tomorrow: false };
    const tm = skyDay(new Date(today.midnight + 36 * H));
    return { day: tm, win: bestWindow(c.hourly, tm, now), tomorrow: true };
  }, [c.hourly, today, now]);

  const flow = w.release.at(-1) ?? null;
  const prevFlow = w.release.at(-2) ?? null;
  const band = flowBand(flow?.value);
  const active = activePeriod(today, now);
  const next = nextPeriod(today, now);
  const verdict = readTheDay(cur, flow?.value ?? null, c.hourly, Boolean(active));
  const cloudy = /cloud|overcast|rain|snow|storm/i.test(cur?.conditions ?? c.hourly[0]?.conditions ?? "");

  const soon = c.hourly.filter((h) => h.t > now && h.t <= now + 3 * H);
  const soonWind = soon.length ? soon.reduce((a, h) => a + (h.windMph ?? 0), 0) / soon.length : null;
  const windTrend =
    soonWind == null || cur?.windMph == null ? "" : soonWind < cur.windMph - 3 ? "easing" : soonWind > cur.windMph + 3 ? "building" : "steady";

  const winLabel = plan.win ? `${plan.tomorrow ? "Tomorrow" : "Today"}: ${span(plan.win.start, plan.win.end)}` : null;
  const lightLeft = today.sun.dusk - now;
  const month = Number(new Date(now).toLocaleString("en-US", { month: "numeric", timeZone: MILE.timezone })) - 1;
  const bugs = HATCHES.filter((h) => h.months[month] >= 2)
    .sort((a, b) => b.months[month] - a.months[month])
    .slice(0, 4);
  const updated = cur ? Math.round((now - Date.parse(cur.observedAt)) / 60_000) : null;

  return (
    <>
      <TopBar variant="hero" solidAfter={300} active="home" stale={stale} observedAt={cur?.observedAt ?? null} now={now} />

      <header className="home-hero">
        <HeroScene now={now} windMph={cur?.windMph ?? null} cloudy={cloudy} crop={{ y: 300, h: 600 }} />
        <div className="hero__shade" />
        <div className="wrap home-hero__content">
          <div className="label home-hero__kicker">
            {new Date(now).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: MILE.timezone })} ·{" "}
            {clock(now)} · Miracle Mile, North Platte
          </div>
          <div className="home-hero__title">
            <h1>{verdict.headline}</h1>
            <span className={`home-pill tone-${verdict.tone}`}>
              <i aria-hidden />
              {verdict.tone}
            </span>
          </div>
          <p className="home-hero__lede">
            {verdict.notes[0]}
            {winLabel && (
              <>
                {" "}
                Best window {plan.tomorrow ? "tomorrow" : "today"}: <strong>{span(plan.win!.start, plan.win!.end)}</strong>.
              </>
            )}
          </p>
          <div className="mono home-hero__src">
            {cur ? `${cur.stationName} · ${updated != null && updated < 2 ? "updated just now" : `updated ${updated} min ago`}` : "Station offline"}
          </div>
        </div>
      </header>

      <main className="wrap home">
        <section aria-label="Right now" className="home-metrics">
          <a href="/conditions#water" className="hcard">
            <span className="label">Flow</span>
            <span className="num hbig">
              <CountUp value={flow?.value ?? null} />
              <small className="mono"> cfs</small>
            </span>
            <span className="hsub hsub--accent">
              {band?.label ?? "—"}
              {flow && prevFlow ? ` · ${flow.value - prevFlow.value >= 0 ? "+" : ""}${Math.round(flow.value - prevFlow.value)}` : ""}
            </span>
            <Sparkline label="Kortes release, 30 days" height={28} area={false} points={w.release.slice(-30).map((d) => ({ t: ymdToMs(d.date), v: d.value }))} />
          </a>
          <a href="/conditions#station" className="hcard">
            <span className="label">Wind</span>
            <span className="hwind">
              <span className="num hbig">
                <CountUp value={cur?.windMph ?? null} />
                <small className="mono"> mph</small>
              </span>
              <span className="hwind__compass">
                <Compass dir={cur?.windDir ?? null} speed={cur?.windMph ?? null} gust={cur?.gustMph ?? null} />
              </span>
            </span>
            <span className="hsub">
              From {cardinal(cur?.windDir)}
              {cur?.gustMph != null ? ` · gusts ${fmt(cur.gustMph)}` : ""}
              {windTrend ? ` · ${windTrend}` : ""}
            </span>
            <Sparkline label="Wind, last 24 hours" height={28} area={false} points={c.history.map((h) => ({ t: h.t, v: h.windMph }))} />
          </a>
          <a href="/conditions#station" className="hcard">
            <span className="label">Air</span>
            <span className="num hbig">
              <CountUp value={cur?.tempF ?? null} />°
            </span>
            <span className="hsub">
              Feels {fmt(cur?.feelsLikeF)}°{c.daily[0]?.highF != null ? ` · high ${fmt(c.daily[0].highF)}°` : ""}
            </span>
            <Sparkline label="Air temperature, last 24 hours" height={28} area={false} color="var(--ochre)" points={c.history.map((h) => ({ t: h.t, v: h.tempF }))} />
          </a>
          <a href="/conditions#station" className="hcard">
            <span className="label">Barometer</span>
            <span className="num hbig">
              <CountUp value={cur?.pressureInHg ?? null} digits={2} />
            </span>
            <span className="hsub">
              {cur?.pressureTrend === "falling" ? "↘ Falling · feeding weather" : cur?.pressureTrend === "rising" ? "↗ Rising" : cur?.pressureTrend === "steady" ? "→ Steady" : "inHg"}
            </span>
            <Sparkline label="Pressure, last 24 hours" height={28} area={false} color="var(--slate)" points={c.history.map((h) => ({ t: h.t, v: h.pressureInHg }))} />
          </a>
          <a href="/conditions#sky" className="hcard">
            <span className="label">{active ? "Feeding now" : "Next window"}</span>
            <span className="num hbig">{active ? "Now" : next ? <BigTime t={next.start} /> : "—"}</span>
            <span className="hsub">
              {active ? `${active.kind} solunar until ${fmtTime(active.end)}` : next ? `${next.kind[0].toUpperCase()}${next.kind.slice(1)} solunar · ${next.why.toLowerCase()}` : ""}
            </span>
          </a>
          <a href="/conditions#sky" className="hcard">
            <span className="label">Last light</span>
            <span className="num hbig">
              <BigTime t={today.sun.dusk} />
            </span>
            <span className="hsub">
              {lightLeft > 0
                ? `${Math.floor(lightLeft / H)} h ${Math.round((lightLeft % H) / 60_000)} m of light left`
                : `First light tomorrow ${fmtTime(today.sun.dawn + 24 * H)}`}
            </span>
          </a>
        </section>

        <Timeline day={plan.day} win={plan.win} tomorrow={plan.tomorrow} now={now} />

        <NextHours hourly={c.hourly} now={now} className="panel home-hours" />

        <section className="home-summary">
          <a href="/map" className="hcard hcard--pad">
            <div className="hcard__head">
              <span className="label">Water</span>
              <span className="hcard__more">Map →</span>
            </div>
            <dl className="hdl">
              <dt>Kortes release</dt>
              <dd className="mono">{flow ? `${Math.round(flow.value)} cfs` : "—"}</dd>
              <dt>Seminoe</dt>
              <dd>
                <Bar pct={w.seminoe.pctFull} />
              </dd>
              <dt>Pathfinder</dt>
              <dd>
                <Bar pct={w.pathfinder.pctFull} />
              </dd>
              <dt>Inflow</dt>
              <dd className="mono">{w.inflow.at(-1) ? `${Math.round(w.inflow.at(-1)!.cfs)} cfs` : "—"}</dd>
            </dl>
          </a>
          <a href="/conditions#forecast" className="hcard hcard--pad">
            <div className="hcard__head">
              <span className="label">Next 3 days</span>
              <span className="hcard__more">Forecast →</span>
            </div>
            <dl className="hdl hdl--3">
              {c.daily.slice(1, 4).map((d) => (
                <div key={d.t} style={{ display: "contents" }}>
                  <dt>{d.label}</dt>
                  <dd className="hdl__muted">{d.conditions}</dd>
                  <dd className={`mono ${(d.windMph ?? 0) >= 20 ? "hdl__warn" : ""}`}>
                    {fmt(d.highF)}°/{fmt(d.lowF)}° · {d.windMph != null ? Math.round(d.windMph) : "—"}
                  </dd>
                </div>
              ))}
            </dl>
            <span className="small muted">High / low · max wind mph</span>
          </a>
          <a href="/conditions#hatches" className="hcard hcard--pad">
            <div className="hcard__head">
              <span className="label">Tie on in {MONTHS[month]}</span>
              <span className="hcard__more">Hatches →</span>
            </div>
            <ul className="hbugs">
              {bugs.map((b) => (
                <li key={b.name}>
                  <strong>{b.name}</strong> <span className="muted">· {b.flies.split(",")[0]}</span>
                </li>
              ))}
            </ul>
          </a>
        </section>

        <section className="home-pair">
          <MoonCard day={today} className="panel" reveal={false} />
          <div className="panel">
            <div className="panel__head">
              <h3>The Mile</h3>
              <span className="label">≈ {MILE_GEO.mileMiles} river mi at full pool</span>
            </div>
            <RiverMap flow={flow?.value ?? null} />
          </div>
        </section>

        <section aria-label="Go deeper" className="home-deeper">
          <a href="/conditions" className="hcard hcard--pad">
            <span className="label">Full report</span>
            <span className="hdeep">Conditions →</span>
            <span className="hsub">Station history, hydrograph, 7-day forecast, sun &amp; moon, hatches.</span>
          </a>
          <a href="/dashboard" className="hcard hcard--pad">
            <span className="label">Members</span>
            <span className="hdeep">Dashboard →</span>
            <span className="hsub">Every reading on one screen, arranged your way.</span>
          </a>
          <a href="/map" className="hcard hcard--pad">
            <span className="label">Members</span>
            <span className="hdeep">Map →</span>
            <span className="hsub">Seminoe to Alcova, field map or satellite.</span>
          </a>
          <a href="/lite" className="hcard hcard--pad hcard--alt">
            <span className="label">One bar of signal?</span>
            <span className="hdeep">Low-data page →</span>
            <span className="hsub">The essentials in about 2 KB.</span>
          </a>
        </section>
      </main>

      <Footer source={cur?.source ?? null} fetchedAt={c.fetchedAt} />
    </>
  );
}

function Bar({ pct }: { pct: number | null }) {
  return (
    <span className="hbar">
      <span className="hbar__track">
        <i style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
      </span>
      <span className="mono">{pct != null ? `${Math.round(pct)}%` : "—"}</span>
    </span>
  );
}

/** Daylight and solunar windows on one 6 AM – 10 PM scale, with the best window boxed. */
function Timeline({
  day,
  win,
  tomorrow,
  now,
}: {
  day: SkyDay;
  win: BestWindow | null;
  tomorrow: boolean;
  now: number;
}) {
  const t0 = day.midnight + 6 * H;
  const SPAN = 16 * H;
  const pos = (t: number) => Math.min(100, Math.max(0, ((t - t0) / SPAN) * 100));
  const wid = (a: number, b: number) => Math.max(0, pos(b) - pos(a));

  const showNow = now >= t0 && now <= t0 + SPAN;
  const periods = day.periods.filter((p) => p.end > t0 && p.start < t0 + SPAN);
  const ticks = [6, 8, 10, 12, 14, 16, 18, 20, 22];

  return (
    <section className="hcard hcard--pad tl" aria-label={`${tomorrow ? "Tomorrow" : "Today"} on the Mile timeline`}>
      <div className="hcard__head">
        <h2 className="tl__title">{tomorrow ? "Tomorrow" : "Today"} on the Mile</h2>
        {win && <span className="tl__best">Best window: {span(win.start, win.end)}</span>}
      </div>

      <div className="tl__scroll">
        <div className="tl__grid">
          <div className="tl__labels">
            <span className="label" style={{ height: 22 }}>Light</span>
            <span className="label" style={{ height: 22 }}>Feeding</span>
          </div>
          <div className="tl__lanes">
            <div className="tl__stack">
              <div className="tl__light">
                <i className="twi" style={{ left: `${pos(day.sun.dawn)}%`, width: `${wid(day.sun.dawn, day.sun.rise)}%` }} />
                <i className="day" style={{ left: `${pos(day.sun.rise)}%`, width: `${wid(day.sun.rise, day.sun.set)}%` }} />
                <i className="twi" style={{ left: `${pos(day.sun.set)}%`, width: `${wid(day.sun.set, day.sun.dusk)}%` }} />
              </div>
              <div className="tl__feed">
                {periods.map((p) => (
                  <i
                    key={p.center}
                    className={p.kind}
                    style={{ left: `${pos(p.start)}%`, width: `${wid(p.start, p.end)}%` }}
                    title={`${p.why}: ${fmtTime(p.start)}–${fmtTime(p.end)}`}
                  />
                ))}
              </div>
            </div>
            {win && <div className="tl__win" style={{ left: `${pos(win.start)}%`, width: `${wid(win.start, win.end)}%` }} />}
            {showNow && (
              <>
                <div className="tl__now" style={{ left: `${pos(now)}%` }} />
                <span className="mono tl__nowlbl" style={{ left: `${pos(now)}%` }}>
                  now
                </span>
              </>
            )}
            <div className="mono tl__ticks">
              {ticks.map((h) => (
                <span key={h} style={{ left: `${((h - 6) / 16) * 100}%` }} data-edge={h === 6 ? "start" : h === 22 ? "end" : undefined}>
                  {h === 12 ? "noon" : `${h > 12 ? h - 12 : h}${h >= 12 && h < 24 ? "p" : "a"}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="small muted" style={{ margin: "10px 0 0" }}>
        Sunrise {fmtTime(day.sun.rise)} · sunset {fmtTime(day.sun.set)} · solid = major
        solunar, dashed = minor · box = best window
        {win?.avgWind != null ? ` (~${Math.round(win.avgWind)} mph${win.avgTemp != null ? `, ${Math.round(win.avgTemp)}°F` : ""})` : ""}.
      </p>
    </section>
  );
}
