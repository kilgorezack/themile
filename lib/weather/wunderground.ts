import "server-only";
import type { CurrentObs, HistoryPoint, PressureTrend } from "../types";
import { num } from "../units";

const BASE = "https://api.weather.com/v2/pws";

export function wundergroundConfigured() {
  return Boolean(process.env.WU_API_KEY && process.env.WU_STATION_ID);
}

async function get<T>(path: string, revalidate: number): Promise<T> {
  const url = new URL(BASE + path);
  url.searchParams.set("stationId", process.env.WU_STATION_ID!);
  url.searchParams.set("format", "json");
  url.searchParams.set("units", "e");
  url.searchParams.set("numericPrecision", "decimal");
  url.searchParams.set("apiKey", process.env.WU_API_KEY!);
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`Wunderground ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function wundergroundCurrent(history: HistoryPoint[]): Promise<CurrentObs> {
  const data = await get<any>("/observations/current", 60);
  const o = data.observations?.[0];
  if (!o) throw new Error("Wunderground: no observation");
  const i = o.imperial ?? {};
  const pressure = num(i.pressure);
  return {
    source: "wunderground",
    stationName: o.neighborhood || o.stationID,
    observedAt: o.obsTimeUtc,
    tempF: num(i.temp),
    feelsLikeF: num(i.windChill) ?? num(i.heatIndex) ?? num(i.temp),
    dewPointF: num(i.dewpt),
    humidity: num(o.humidity),
    windMph: num(i.windSpeed),
    gustMph: num(i.windGust),
    lullMph: null,
    windDir: num(o.winddir),
    pressureInHg: pressure,
    pressureTrend: trendFromHistory(history, pressure),
    precipTodayIn: num(i.precipTotal),
    uv: num(o.uv),
    solarWm2: num(o.solarRadiation),
    conditions: null,
    lightning: null,
  };
}

export async function wundergroundHistory(): Promise<HistoryPoint[]> {
  // "all/1day" returns every report for the current local day (~5 min cadence).
  const data = await get<any>("/observations/all/1day", 300);
  return (data.observations ?? []).map((o: any) => ({
    t: Date.parse(o.obsTimeUtc),
    tempF: num(o.imperial?.tempAvg),
    windMph: num(o.imperial?.windspeedAvg),
    gustMph: num(o.imperial?.windgustHigh),
    pressureInHg: num(o.imperial?.pressureMax),
  }));
}

/** 3-hour pressure tendency, using the WMO-ish ±0.02 inHg threshold. */
export function trendFromHistory(history: HistoryPoint[], now: number | null): PressureTrend {
  if (now == null || history.length < 2) return null;
  const cutoff = Date.now() - 3 * 3600_000;
  const past = history.find((h) => h.t >= cutoff && h.pressureInHg != null);
  if (!past?.pressureInHg) return null;
  const d = now - past.pressureInHg;
  return d > 0.02 ? "rising" : d < -0.02 ? "falling" : "steady";
}
