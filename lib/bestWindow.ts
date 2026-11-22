import type { HourlyForecast } from "./types";
import type { SkyDay } from "./astro";

export interface BestWindow {
  start: number; // epoch ms, top of the first hour
  end: number; // epoch ms, end of the last hour
  avgWind: number | null;
  avgTemp: number | null;
  solunar: boolean;
}

const H = 3600_000;

/**
 * The best 2–3 hour stretch of daylight to fish: lower wind, warmer air, and a
 * bonus for overlapping a solunar period. Only looks at hours that haven't
 * passed yet. Returns null if there's no usable daylight forecast left.
 */
export function bestWindow(hourly: HourlyForecast[], day: SkyDay, now = Date.now(), length = 3): BestWindow | null {
  const from = Math.max(day.sun.rise, now - H);
  const hours = hourly.filter((h) => h.t >= from - H / 2 && h.t + H <= day.sun.set + H / 2);
  if (hours.length < 2) return null;
  const len = Math.min(length, hours.length);

  const score = (h: HourlyForecast) => {
    const wind = h.gustMph ?? h.windMph ?? 10;
    const temp = h.tempF ?? 40;
    // Wind dominates; warmth helps up to ~70°F; solunar overlap is a tiebreaker-plus.
    let s = -wind;
    s += (Math.min(70, Math.max(10, temp)) - 10) / 6;
    const mid = h.t + H / 2;
    const p = day.periods.find((p) => mid >= p.start && mid <= p.end);
    if (p) s += p.kind === "major" ? 3 : 1.5;
    if ((h.precipChance ?? 0) >= 50) s -= 3;
    return s;
  };

  let best = -Infinity, bestI = 0;
  for (let i = 0; i + len <= hours.length; i++) {
    const s = hours.slice(i, i + len).reduce((a, h) => a + score(h), 0);
    if (s > best) [best, bestI] = [s, i];
  }
  const win = hours.slice(bestI, bestI + len);
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const start = Math.max(win[0].t, day.sun.rise), end = Math.min(win[win.length - 1].t + H, day.sun.dusk);
  return {
    start,
    end,
    avgWind: avg(win.map((h) => h.windMph)),
    avgTemp: avg(win.map((h) => h.tempF)),
    solunar: day.periods.some((p) => p.start < end && p.end > start),
  };
}
