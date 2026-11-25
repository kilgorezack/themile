import { getConditions } from "@/lib/weather";
import { getWater } from "@/lib/water";
import { activePeriod, nextPeriod, skyDay } from "@/lib/astro";
import { bestWindow } from "@/lib/bestWindow";
import { readTheDay } from "@/lib/verdict";
import { flowBand, MILE } from "@/lib/config";
import { HATCHES, MONTHS } from "@/lib/hatches";

/**
 * Everything the Milecast iOS app's Home and Conditions screens need, computed
 * with the same code as the website so the verdict and best window always agree.
 * All times are epoch milliseconds.
 */
export const dynamic = "force-dynamic";

const H = 3600_000;

export async function GET() {
  const [c, w] = await Promise.all([getConditions(), getWater()]);
  const now = Date.now();
  const today = skyDay(new Date(now));

  let win = bestWindow(c.hourly, today, now);
  let tomorrow = false;
  if (!win) {
    win = bestWindow(c.hourly, skyDay(new Date(today.midnight + 36 * H)), now);
    tomorrow = Boolean(win);
  }

  const flow = w.release.at(-1) ?? null;
  const prev = w.release.at(-2) ?? null;
  const band = flowBand(flow?.value);
  const active = activePeriod(today, now);
  const next = active ?? nextPeriod(today, now);
  const verdict = readTheDay(c.current, flow?.value ?? null, c.hourly, Boolean(active));
  const cur = c.current;

  // Hourly history keeps the payload small on weak signal.
  const byHour = new Map<number, typeof c.history>();
  for (const p of c.history) {
    const k = Math.floor(p.t / H) * H;
    byHour.set(k, [...(byHour.get(k) ?? []), p]);
  }
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
  };
  const history = [...byHour.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, ps]) => ({
      t: t + H / 2,
      windMph: avg(ps.map((p) => p.windMph)),
      gustMph: ps.some((p) => p.gustMph != null) ? Math.max(...ps.map((p) => p.gustMph ?? 0)) : null,
      tempF: avg(ps.map((p) => p.tempF)),
      pressureInHg: avg(ps.map((p) => p.pressureInHg)),
    }));

  const month = Number(new Date(now).toLocaleString("en-US", { month: "numeric", timeZone: MILE.timezone })) - 1;

  const body = {
    updatedAt: new Date(now).toISOString(),
    station: cur ? { name: cur.stationName, source: cur.source, observedAt: Date.parse(cur.observedAt) } : null,
    verdict,
    bestWindow: win ? { start: win.start, end: win.end, tomorrow, avgWindMph: win.avgWind, avgTempF: win.avgTemp } : null,
    now: cur
      ? {
          tempF: cur.tempF,
          feelsLikeF: cur.feelsLikeF,
          dewPointF: cur.dewPointF,
          humidity: cur.humidity,
          windMph: cur.windMph,
          gustMph: cur.gustMph,
          lullMph: cur.lullMph,
          windDir: cur.windDir,
          pressureInHg: cur.pressureInHg,
          pressureTrend: cur.pressureTrend,
          precipTodayIn: cur.precipTodayIn,
          uv: cur.uv,
          conditions: cur.conditions,
          lightning3h: cur.lightning?.count3h ?? null,
          lightningLastMi: cur.lightning?.lastDistanceMi ?? null,
          lightningLastAt: cur.lightning?.lastEpoch != null ? cur.lightning.lastEpoch * 1000 : null,
        }
      : null,
    flow: flow
      ? {
          cfs: flow.value,
          date: flow.date,
          change: prev ? flow.value - prev.value : null,
          band: band?.label ?? null,
          bandIndex: band?.index ?? null,
          note: band?.note ?? null,
          last30: w.release.slice(-30).map((d) => d.value),
        }
      : null,
    reservoirs: [
      { name: "Seminoe", pctFull: w.seminoe.pctFull, storageAf: w.seminoe.storageAf, elevFt: w.seminoe.elevFt },
      { name: "Pathfinder", pctFull: w.pathfinder.pctFull, storageAf: w.pathfinder.storageAf, elevFt: w.pathfinder.elevFt },
    ],
    inflowCfs: w.inflow.at(-1)?.cfs ?? null,
    sun: today.sun,
    moon: {
      phase: today.moon.phase,
      illumination: today.moon.illumination,
      name: today.moon.phaseName,
      rise: today.moon.rise,
      set: today.moon.set,
    },
    feeding: today.periods.map((p) => ({ kind: p.kind, why: p.why, start: p.start, end: p.end })),
    nextWindow: next ? { kind: next.kind, why: next.why, start: next.start, end: next.end, active: Boolean(active) } : null,
    hourly: c.hourly.filter((h) => h.t >= now - H).slice(0, 36),
    daily: c.daily.slice(0, 7),
    history,
    hatches: {
      month: MONTHS[month],
      items: HATCHES.filter((h) => h.months[month] >= 1)
        .sort((a, b) => b.months[month] - a.months[month])
        .map((h) => ({ name: h.name, flies: h.flies, level: h.months[month], run: h.kind === "run" })),
    },
  };

  return Response.json(body, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
