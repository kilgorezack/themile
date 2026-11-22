import "server-only";
import type { CurrentObs, DailyForecast, HistoryPoint, HourlyForecast, PressureTrend } from "../types";
import { cToF, mbToInHg, msToMph, num, stationToSeaLevelMb } from "../units";
import { normalizeIcon } from "./icons";
import { MILE } from "../config";

const BASE = "https://swd.weatherflow.com/swd/rest";

export function tempestConfigured() {
  return Boolean(process.env.TEMPEST_TOKEN && process.env.TEMPEST_STATION_ID);
}

async function get<T>(path: string, params: Record<string, string | number>, revalidate: number): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("token", process.env.TEMPEST_TOKEN!);
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`Tempest ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

interface StationMeta {
  stations: {
    name: string;
    public_name?: string;
    station_meta?: { elevation?: number };
    devices: { device_id: number; device_type: string }[];
  }[];
}

async function stationMeta() {
  const id = process.env.TEMPEST_STATION_ID!;
  const data = await get<StationMeta>(`/stations/${id}`, {}, 86_400);
  const s = data.stations?.[0];
  if (!s) throw new Error("Tempest station not found");
  const st = s.devices.find((d) => d.device_type === "ST");
  return {
    name: s.public_name || s.name,
    elevationM: s.station_meta?.elevation ?? MILE.elevationFt * 0.3048,
    deviceId: st?.device_id ?? null,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function tempestForecastAndCurrent(): Promise<{
  current: CurrentObs;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}> {
  const [meta, data] = await Promise.all([
    stationMeta(),
    get<any>(
      "/better_forecast",
      {
        station_id: process.env.TEMPEST_STATION_ID!,
        units_temp: "f",
        units_wind: "mph",
        units_pressure: "inhg",
        units_precip: "in",
        units_distance: "mi",
      },
      60,
    ),
  ]);

  const c = data.current_conditions ?? {};
  const trend = String(c.pressure_trend ?? "").toLowerCase();
  const current: CurrentObs = {
    source: "tempest",
    stationName: meta.name,
    observedAt: new Date((num(c.time) ?? Date.now() / 1000) * 1000).toISOString(),
    tempF: num(c.air_temperature),
    feelsLikeF: num(c.feels_like),
    dewPointF: num(c.dew_point),
    humidity: num(c.relative_humidity),
    windMph: num(c.wind_avg),
    gustMph: num(c.wind_gust),
    lullMph: num(c.wind_lull),
    windDir: num(c.wind_direction),
    pressureInHg: num(c.sea_level_pressure),
    pressureTrend: (["rising", "falling", "steady"].includes(trend) ? trend : null) as PressureTrend,
    precipTodayIn: num(c.precip_accum_local_day),
    uv: num(c.uv),
    solarWm2: num(c.solar_radiation),
    conditions: c.conditions ?? null,
    lightning: {
      count3h: num(c.lightning_strike_count_last_3hr) ?? 0,
      lastEpoch: num(c.lightning_strike_last_epoch),
      lastDistanceMi: num(c.lightning_strike_last_distance),
    },
  };

  const hourly: HourlyForecast[] = (data.forecast?.hourly ?? []).slice(0, 48).map((h: any) => ({
    t: h.time * 1000,
    tempF: num(h.air_temperature),
    windMph: num(h.wind_avg),
    gustMph: num(h.wind_gust),
    windDir: num(h.wind_direction),
    precipChance: num(h.precip_probability),
    conditions: h.conditions ?? "",
    icon: normalizeIcon(h.icon ?? h.conditions),
  }));

  const daily: DailyForecast[] = (data.forecast?.daily ?? []).slice(0, 7).map((d: any) => {
    const t = d.day_start_local * 1000;
    const dayHours = hourly.filter((h) => h.t >= t && h.t < t + 86_400_000);
    const windMax = dayHours.length ? Math.max(...dayHours.map((h) => h.windMph ?? 0)) : null;
    return {
      t,
      label: new Date(t).toLocaleDateString("en-US", { weekday: "short", timeZone: MILE.timezone }),
      highF: num(d.air_temp_high),
      lowF: num(d.air_temp_low),
      precipChance: num(d.precip_probability),
      conditions: d.conditions ?? "",
      icon: normalizeIcon(d.icon ?? d.conditions),
      windMph: windMax,
    };
  });

  return { current, hourly, daily };
}

/**
 * Last 24h of one-minute observations from the Tempest sensor,
 * downsampled to 10-minute buckets.
 * obs_st layout: [0]epoch [1]lull [2]avg [3]gust [4]dir [5]interval [6]station mb [7]temp C ...
 */
export async function tempestHistory(): Promise<HistoryPoint[]> {
  const meta = await stationMeta();
  if (!meta.deviceId) return [];
  const end = Math.floor(Date.now() / 1000);
  const start = end - 24 * 3600;
  const data = await get<{ obs?: number[][] }>(
    `/observations/device/${meta.deviceId}`,
    { time_start: start, time_end: end },
    300,
  );
  const buckets = new Map<number, number[][]>();
  for (const row of data.obs ?? []) {
    const key = Math.floor(row[0] / 600) * 600;
    const b = buckets.get(key) ?? [];
    b.push(row);
    buckets.set(key, b);
  }
  const avg = (rows: number[][], i: number) => {
    const v = rows.map((r) => r[i]).filter((x) => x != null && Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const max = (rows: number[][], i: number) => {
    const v = rows.map((r) => r[i]).filter((x) => x != null && Number.isFinite(x));
    return v.length ? Math.max(...v) : null;
  };
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, rows]) => {
      const tc = avg(rows, 7);
      const stMb = avg(rows, 6);
      const slp = stMb != null && tc != null ? stationToSeaLevelMb(stMb, meta.elevationM, tc) : null;
      const wind = avg(rows, 2);
      const gust = max(rows, 3);
      return {
        t: t * 1000,
        tempF: tc != null ? cToF(tc) : null,
        windMph: wind != null ? msToMph(wind) : null,
        gustMph: gust != null ? msToMph(gust) : null,
        pressureInHg: slp != null ? mbToInHg(slp) : null,
      };
    });
}
