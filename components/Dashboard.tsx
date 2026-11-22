"use client";

import { useEffect, useMemo, useState } from "react";
import type { Conditions, WaterData } from "@/lib/types";
import { activePeriod, skyDay } from "@/lib/astro";
import { readTheDay } from "@/lib/verdict";
import { cardinal, fmt } from "@/lib/units";
import { useLive, useNow } from "./hooks";
import { CountUp } from "./CountUp";
import { HeroScene } from "./HeroScene";
import { Station } from "./Station";
import { Water } from "./Water";
import { Forecast } from "./Forecast";
import { Sky } from "./Sky";
import { Hatches } from "./Hatches";
import { Reveal } from "./Reveal";
import { HATCHES } from "@/lib/hatches";
import { MILE } from "@/lib/config";

export function Dashboard({ conditions, water, serverNow }: { conditions: Conditions; water: WaterData; serverNow: number }) {
  const now = useNow(serverNow, 30_000);
  const { data: c, stale } = useLive("/api/conditions", conditions, 60_000);
  const { data: w } = useLive("/api/water", water, 30 * 60_000);

  const flow = w.release.at(-1)?.value ?? null;
  const solunarActive = useMemo(() => Boolean(activePeriod(skyDay(new Date(now)), now)), [now]);
  const verdict = readTheDay(c.current, flow, c.hourly, solunarActive);
  const cur = c.current;
  const cloudy = /cloud|overcast|rain|snow|storm/i.test(cur?.conditions ?? c.hourly[0]?.conditions ?? "");

  return (
    <>
      <TopBar stale={stale} observedAt={cur?.observedAt ?? null} now={now} />

      <header className="hero">
        <HeroScene now={now} windMph={cur?.windMph ?? null} cloudy={cloudy} />
        <div className="hero__shade" />
        <div className="wrap hero__content">
          <div className="hero__kicker">
            <span className="label">North Platte River</span>
            <span className="label">Kortes Dam → Pathfinder</span>
            <span className="label">Carbon County, WY · 5,880 ft</span>
          </div>
          <h1 className={`tone-${verdict.tone}`}>
            {verdict.headline}
            <span className="tone-dot" style={{ background: "var(--tone)" }} aria-hidden />
          </h1>
          <p className="hero__lede">{verdict.notes[0]}</p>

          <div className="hero__stats">
            <HeroStat label="Flow" value={flow} unit="cfs" sub="Kortes release" />
            <HeroStat label="Air" value={cur?.tempF ?? null} unit="°F" sub={cur?.feelsLikeF != null ? `feels ${fmt(cur.feelsLikeF)}°` : ""} />
            <HeroStat
              label="Wind"
              value={cur?.windMph ?? null}
              unit="mph"
              sub={cur ? `${cardinal(cur.windDir)}${cur.gustMph != null ? `, gusts ${fmt(cur.gustMph)}` : ""}` : ""}
            />
            <HeroStat
              label="Pressure"
              value={cur?.pressureInHg ?? null}
              digits={2}
              unit="inHg"
              sub={cur?.pressureTrend ? cur.pressureTrend : ""}
            />
          </div>
        </div>
      </header>

      <main>
        <section className="section wrap" id="today" style={{ paddingTop: "clamp(48px, 6vw, 80px)" }}>
          <div className="grid grid--station">
            <Reveal className={`panel span-7 tone-${verdict.tone}`}>
              <div className="panel__head">
                <h3>Today&rsquo;s read</h3>
                <span className="pill">{verdict.tone}</span>
              </div>
              <ol className="notes">
                {verdict.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ol>
              <TieOn now={now} />
            </Reveal>
            <Reveal className="panel span-5" delay={80}>
              <div className="panel__head">
                <h3>The Mile</h3>
                <span className="label">≈ 5.5 river miles</span>
              </div>
              <RiverSchematic flow={flow} />
            </Reveal>
          </div>
        </section>

        <Station c={c} now={now} />
        <Water w={w} />
        <Forecast c={c} now={now} />
        <Sky now={now} />
        <Hatches now={now} />
      </main>

      <Footer source={cur?.source ?? null} fetchedAt={c.fetchedAt} />
    </>
  );
}

function TieOn({ now }: { now: number }) {
  const m = Number(new Date(now).toLocaleString("en-US", { month: "numeric", timeZone: MILE.timezone })) - 1;
  const picks = HATCHES.filter((h) => h.months[m] >= 2)
    .sort((a, b) => b.months[m] - a.months[m])
    .slice(0, 4);
  if (!picks.length) return null;
  return (
    <div className="flies">
      <div className="label">Tie on this month</div>
      <ul>
        {picks.map((h) => (
          <li key={h.name}>
            <strong>{h.name}</strong>
            <span className="muted">{h.flies}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroStat({ label, value, unit, sub, digits = 0 }: { label: string; value: number | null; unit: string; sub?: string; digits?: number }) {
  return (
    <div className="hero__stat">
      <div className="label">{label}</div>
      <div className="num">
        <CountUp value={value} digits={digits} />
        <span className="unit">{unit}</span>
      </div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

function TopBar({ stale, observedAt, now }: { stale: boolean; observedAt: string | null; now: number }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > window.innerHeight * 0.6);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const mins = observedAt ? Math.round((now - Date.parse(observedAt)) / 60_000) : null;
  const old = stale || mins == null || mins > 20;
  return (
    <div className={`topbar ${solid ? "is-solid" : ""}`}>
      <div className="wrap topbar__inner">
        <a href="#" className="wordmark">
          The Mile <small>Miracle Mile, WY</small>
        </a>
        <nav aria-label="Sections">
          <a href="#station">Station</a>
          <a href="#water">Water</a>
          <a href="#forecast">Forecast</a>
          <a href="#sky">Sun &amp; moon</a>
          <a href="#hatches">Hatches</a>
        </nav>
        <span className="live" title={observedAt ?? undefined}>
          <span className={`live__dot ${old ? "is-stale" : ""}`} />
          {mins == null ? "no station" : mins < 2 ? "live" : `${mins}m ago`}
        </span>
      </div>
    </div>
  );
}

/** Seminoe → Kortes → the Mile → Pathfinder, with the current flowing. */
function RiverSchematic({ flow }: { flow: number | null }) {
  const speed = flow ? Math.max(0.5, 3.2 - Math.log10(flow)) : 2;
  return (
    <div className="map">
      <svg viewBox="0 0 420 300" role="img" aria-label="Schematic of the Miracle Mile from Seminoe Reservoir through Kortes Dam to Pathfinder Reservoir">
        {/* Seminoe */}
        <path d="M20 250 C40 220 110 215 140 240 C160 258 120 290 70 285 C30 282 10 270 20 250 Z" fill="color-mix(in srgb, var(--slate) 30%, var(--card))" stroke="var(--slate)" />
        <text x="40" y="262" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-2)" letterSpacing="1">SEMINOE RES.</text>
        {/* Kortes */}
        <rect x="150" y="210" width="28" height="8" rx="2" fill="var(--ink)" transform="rotate(-35 164 214)" />
        <text x="186" y="232" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-2)" letterSpacing="1">KORTES DAM</text>
        {/* The Mile */}
        <path id="mile" d="M164 214 C190 170 160 150 200 120 S250 100 260 70 S300 40 320 46" fill="none" stroke="var(--river)" strokeWidth="9" strokeLinecap="round" opacity="0.35" />
        <path
          className="flowline"
          d="M164 214 C190 170 160 150 200 120 S250 100 260 70 S300 40 320 46"
          fill="none"
          stroke="var(--river)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ animationDuration: `${speed}s` }}
        />
        <text fontFamily="var(--font-display)" fontStyle="italic" fontSize="20" fill="var(--ink)">
          <textPath href="#mile" startOffset="28%">
            the Miracle Mile
          </textPath>
        </text>
        {/* Pathfinder */}
        <path d="M300 40 C330 10 400 14 410 40 C418 64 380 80 350 70 C320 62 290 60 300 40 Z" fill="color-mix(in srgb, var(--slate) 30%, var(--card))" stroke="var(--slate)" />
        <text x="318" y="96" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-2)" letterSpacing="1">PATHFINDER RES.</text>
        {/* north arrow */}
        <g transform="translate(40 40)" fill="none" stroke="var(--ink-3)">
          <path d="M0 18 L0 -6 M-5 0 L0 -8 L5 0" strokeWidth="1.4" />
          <text x="-4" y="32" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)" stroke="none">N</text>
        </g>
        {flow != null && (
          <g>
            <rect x="214" y="150" width="96" height="30" rx="4" fill="var(--ink)" />
            <text x="262" y="170" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="13" fill="var(--paper)">
              {Math.round(flow)} cfs
            </text>
          </g>
        )}
      </svg>
      <p className="small muted" style={{ margin: "4px 0 0" }}>
        Not to scale. Seminoe and Kortes dams regulate the flow; trout run up out of Pathfinder to spawn each spring and fall.
      </p>
    </div>
  );
}

function Footer({ source, fetchedAt }: { source: string | null; fetchedAt: string }) {
  return (
    <footer className="footer">
      <div className="wrap footer__grid">
        <div>
          <div className="wordmark" style={{ fontSize: 28 }}>
            The Mile
          </div>
          <p style={{ maxWidth: "42ch" }}>
            Conditions for the Miracle Mile of the North Platte River, between Kortes Dam and Pathfinder Reservoir in Carbon County,
            Wyoming. Data is preliminary and provided as-is — always use your own judgment on the water.
          </p>
        </div>
        <div>
          <div className="label">Data</div>
          <ul>
            <li>Weather: {source === "tempest" ? "Tempest (WeatherFlow)" : source === "wunderground" ? "Weather Underground" : "National Weather Service"}</li>
            <li>
              <a href="https://www.usbr.gov/gp/hydromet/" rel="noreferrer">USBR Hydromet</a> — releases &amp; storage
            </li>
            <li>
              <a href="https://waterdata.usgs.gov/monitoring-location/06630000/" rel="noreferrer">USGS 06630000</a> — inflow
            </li>
            <li>Sun &amp; moon computed locally</li>
          </ul>
        </div>
        <div>
          <div className="label">Before you go</div>
          <ul>
            <li>
              <a href="https://wgfd.wyo.gov/fishing-boating" rel="noreferrer">Wyoming Game &amp; Fish regulations</a>
            </li>
            <li>
              <a href="https://www.weather.gov/cys/" rel="noreferrer">NWS Cheyenne</a>
            </li>
            <li className="muted small mono">Updated {new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" })} MT</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
