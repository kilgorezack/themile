import * as SunCalc from "suncalc";
import { MILE } from "./config";

const { lat, lon, timezone } = MILE;

/** Offset (minutes) of the Mile's timezone from UTC at a given instant, e.g. -420. */
function tzOffsetMinutes(at: Date) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "shortOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value; // "GMT-7"
  const m = part?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Local midnight on the Mile for the day containing `at`. */
export function localMidnight(at: Date) {
  const ymd = at.toLocaleDateString("en-CA", { timeZone: timezone });
  const guess = new Date(`${ymd}T00:00:00Z`);
  return new Date(guess.getTime() - tzOffsetMinutes(guess) * 60_000);
}

export function fmtTime(d: Date | number | null | undefined) {
  if (d == null) return "—";
  const date = typeof d === "number" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone })
    .replace(" AM", "a")
    .replace(" PM", "p");
}

export function fmtHour(d: Date | number) {
  return new Date(d)
    .toLocaleTimeString("en-US", { hour: "numeric", timeZone: timezone })
    .replace(" AM", "a")
    .replace(" PM", "p");
}

const PHASES = [
  "New moon",
  "Waxing crescent",
  "First quarter",
  "Waxing gibbous",
  "Full moon",
  "Waning gibbous",
  "Last quarter",
  "Waning crescent",
] as const;

export interface Period {
  kind: "major" | "minor";
  start: number;
  end: number;
  center: number;
  why: string;
}

export interface SkyDay {
  midnight: number;
  sun: { dawn: number; rise: number; noon: number; set: number; dusk: number };
  moon: {
    rise: number | null;
    set: number | null;
    transit: number;
    underfoot: number;
    illumination: number; // 0..1
    phase: number; // 0..1, 0=new, .5=full
    phaseName: string;
  };
  periods: Period[];
  /** Solunar "day rating" 1-4, higher near new & full moon. */
  rating: number;
}

export function skyDay(at: Date = new Date()): SkyDay {
  const midnight = localMidnight(at);
  const noonish = new Date(midnight.getTime() + 12 * 3600_000);
  const offset = tzOffsetMinutes(noonish);
  // suncalc v2: angles in degrees; utcOffset pins results to the Mile's civil day.
  const s = SunCalc.getTimes(noonish, lat, lon, 0, offset);
  const mt = SunCalc.getMoonTimes(noonish, lat, lon, offset);
  const ill = SunCalc.getMoonIllumination(noonish);

  // Find lunar upper & lower transit by sampling altitude through the day.
  let maxAlt = -Infinity, minAlt = Infinity, transit = midnight.getTime(), underfoot = midnight.getTime();
  for (let m = 0; m <= 24 * 60; m += 4) {
    const t = midnight.getTime() + m * 60_000;
    const alt = SunCalc.getMoonPosition(new Date(t), lat, lon).altitude;
    if (alt > maxAlt) [maxAlt, transit] = [alt, t];
    if (alt < minAlt) [minAlt, underfoot] = [alt, t];
  }

  const rise = mt.rise ? mt.rise.getTime() : null;
  const set = mt.set ? mt.set.getTime() : null;
  const H = 3600_000;
  const periods: Period[] = [
    { kind: "major" as const, center: transit, why: "Moon overhead" },
    { kind: "major" as const, center: underfoot, why: "Moon underfoot" },
    ...(rise ? [{ kind: "minor" as const, center: rise, why: "Moonrise" }] : []),
    ...(set ? [{ kind: "minor" as const, center: set, why: "Moonset" }] : []),
  ]
    .map((p) => {
      const half = p.kind === "major" ? H : H / 2;
      return { ...p, start: p.center - half, end: p.center + half };
    })
    .sort((a, b) => a.center - b.center);

  const phaseIdx = Math.round(ill.phase * 8) % 8;
  const distFromNewOrFull = Math.min(ill.phase, Math.abs(ill.phase - 0.5), 1 - ill.phase); // 0..0.25
  const rating = distFromNewOrFull < 0.04 ? 4 : distFromNewOrFull < 0.09 ? 3 : distFromNewOrFull < 0.17 ? 2 : 1;

  return {
    midnight: midnight.getTime(),
    // Never null at this latitude; fall back to noon just to satisfy the types.
    sun: {
      dawn: (s.dawn ?? noonish).getTime(),
      rise: (s.sunrise ?? noonish).getTime(),
      noon: s.solarNoon.getTime(),
      set: (s.sunset ?? noonish).getTime(),
      dusk: (s.dusk ?? noonish).getTime(),
    },
    moon: {
      rise,
      set,
      transit,
      underfoot,
      illumination: ill.fraction,
      phase: ill.phase,
      phaseName: PHASES[phaseIdx],
    },
    periods,
    rating,
  };
}

/** Sun altitude in degrees at the Mile right now (drives the hero sky). */
export function sunAltitude(at: Date = new Date()) {
  return SunCalc.getPosition(at, lat, lon).altitude;
}

export function moonAltitude(at: Date = new Date()) {
  return SunCalc.getMoonPosition(at, lat, lon).altitude;
}

export function activePeriod(day: SkyDay, now = Date.now()) {
  return day.periods.find((p) => now >= p.start && now <= p.end) ?? null;
}

export function nextPeriod(day: SkyDay, now = Date.now()) {
  const upcoming = day.periods.find((p) => p.start > now);
  if (upcoming) return upcoming;
  const tomorrow = skyDay(new Date(day.midnight + 36 * 3600_000));
  return tomorrow.periods[0] ?? null;
}
