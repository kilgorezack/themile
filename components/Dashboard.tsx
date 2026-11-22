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
import { TopBar } from "./TopBar";
import { Footer } from "./Footer";
import { RiverMap } from "./RiverMap";
import { MILE_GEO } from "@/lib/mileGeo";
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
      <TopBar variant="hero" active="home" stale={stale} observedAt={cur?.observedAt ?? null} now={now} />

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
                <span className="label">≈ {MILE_GEO.mileMiles} river mi at full pool</span>
              </div>
              <RiverMap flow={flow} />
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
