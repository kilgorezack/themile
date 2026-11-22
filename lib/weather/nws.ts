import "server-only";
import type { CurrentObs, DailyForecast, HistoryPoint, HourlyForecast } from "../types";
import { MILE } from "../config";
import { cToF, cardinalToDeg, kmhToMph, mmToIn, num, paToInHg } from "../units";
import { normalizeIcon } from "./icons";
import { trendFromHistory } from "./wunderground";

const BASE = "https://api.weather.gov";
const { office, x, y } = MILE.nwsGrid;

async function get<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: {
      "User-Agent": `(themile, ${process.env.NWS_CONTACT ?? "themile.fish"})`,
      Accept: "application/geo+json",
    },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`NWS ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** "10 mph" or "10 to 20 mph" → [avg, high] */
function parseWind(s: string | undefined): [number | null, number | null] {
  const nums = (s ?? "").match(/\d+/g)?.map(Number) ?? [];
  if (!nums.length) return [null, null];
  return [nums[0], nums.length > 1 ? nums[1] : null];
}

export async function nwsForecast(): Promise<{ hourly: HourlyForecast[]; daily: DailyForecast[] }> {
  const [h, d] = await Promise.all([
    get<any>(`/gridpoints/${office}/${x},${y}/forecast/hourly`, 900),
    get<any>(`/gridpoints/${office}/${x},${y}/forecast`, 900),
  ]);

  const hourly: HourlyForecast[] = (h.properties?.periods ?? []).slice(0, 48).map((p: any) => {
    const [avg, hi] = parseWind(p.windSpeed);
    return {
      t: Date.parse(p.startTime),
      tempF: num(p.temperature),
      windMph: avg,
      gustMph: hi,
      windDir: cardinalToDeg(p.windDirection),
      precipChance: num(p.probabilityOfPrecipitation?.value),
      conditions: p.shortForecast ?? "",
      icon: normalizeIcon(p.shortForecast, p.isDaytime),
    };
  });

  // Pair day/night periods into calendar days.
  const periods: any[] = d.properties?.periods ?? [];
  const byDay = new Map<string, any[]>();
  for (const p of periods) {
    const key = new Date(p.startTime).toLocaleDateString("en-CA", { timeZone: MILE.timezone });
    byDay.set(key, [...(byDay.get(key) ?? []), p]);
  }
  const daily: DailyForecast[] = [...byDay.entries()].slice(0, 7).map(([, ps]) => {
    const day = ps.find((p) => p.isDaytime) ?? ps[0];
    const night = ps.find((p) => !p.isDaytime);
    const t = Date.parse(day.startTime);
    const winds = ps.flatMap((p) => parseWind(p.windSpeed)).filter((n): n is number => n != null);
    return {
      t,
      label: new Date(t).toLocaleDateString("en-US", { weekday: "short", timeZone: MILE.timezone }),
      highF: day.isDaytime ? num(day.temperature) : null,
      lowF: night ? num(night.temperature) : null,
      precipChance: Math.max(...ps.map((p) => num(p.probabilityOfPrecipitation?.value) ?? 0)),
      conditions: day.shortForecast ?? "",
      icon: normalizeIcon(day.shortForecast, day.isDaytime),
      windMph: winds.length ? Math.max(...winds) : null,
    };
  });

  return { hourly, daily };
}

/** Nearest NWS observation station to the Mile — used only when no personal station is configured. */
export async function nwsObservations(): Promise<{ current: CurrentObs; history: HistoryPoint[] }> {
  const stations = await get<any>(`/gridpoints/${office}/${x},${y}/stations`, 86_400);
  const st = stations.features?.[0]?.properties;
  if (!st) throw new Error("NWS: no stations");
  const obs = await get<any>(`/stations/${st.stationIdentifier}/observations?limit=40`, 600);
  const feats: any[] = obs.features ?? [];

  const history: HistoryPoint[] = feats
    .map((f) => {
      const p = f.properties;
      const tc = num(p.temperature?.value);
      const w = num(p.windSpeed?.value);
      const g = num(p.windGust?.value);
      const slp = num(p.barometricPressure?.value);
      return {
        t: Date.parse(p.timestamp),
        tempF: tc != null ? cToF(tc) : null,
        windMph: w != null ? kmhToMph(w) : null,
        gustMph: g != null ? kmhToMph(g) : null,
        pressureInHg: slp != null ? paToInHg(slp) : null,
      };
    })
    .filter((p) => Date.now() - p.t < 24 * 3600_000)
    .sort((a, b) => a.t - b.t);

  const latest = feats.find((f) => f.properties.temperature?.value != null)?.properties ?? feats[0]?.properties;
  if (!latest) throw new Error("NWS: no observations");
  const tc = num(latest.temperature?.value);
  const dc = num(latest.dewpoint?.value);
  const fl = num(latest.windChill?.value) ?? num(latest.heatIndex?.value);
  const w = num(latest.windSpeed?.value);
  const g = num(latest.windGust?.value);
  const slp = num(latest.barometricPressure?.value);
  const pIn = slp != null ? paToInHg(slp) : null;
  const precip = num(latest.precipitationLast6Hours?.value);

  return {
    current: {
      source: "nws",
      stationName: st.name,
      observedAt: latest.timestamp,
      tempF: tc != null ? cToF(tc) : null,
      feelsLikeF: fl != null ? cToF(fl) : tc != null ? cToF(tc) : null,
      dewPointF: dc != null ? cToF(dc) : null,
      humidity: num(latest.relativeHumidity?.value),
      windMph: w != null ? kmhToMph(w) : null,
      gustMph: g != null ? kmhToMph(g) : null,
      lullMph: null,
      windDir: num(latest.windDirection?.value),
      pressureInHg: pIn,
      pressureTrend: trendFromHistory(history, pIn),
      precipTodayIn: precip != null ? mmToIn(precip) : null,
      uv: null,
      solarWm2: null,
      conditions: latest.textDescription ?? null,
      lightning: null,
    },
    history,
  };
}
