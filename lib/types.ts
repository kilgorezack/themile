export type WeatherSource = "tempest" | "wunderground" | "nws";

export type PressureTrend = "rising" | "falling" | "steady" | null;

export interface CurrentObs {
  source: WeatherSource;
  stationName: string;
  observedAt: string; // ISO
  tempF: number | null;
  feelsLikeF: number | null;
  dewPointF: number | null;
  humidity: number | null;
  windMph: number | null;
  gustMph: number | null;
  lullMph: number | null;
  windDir: number | null; // degrees, direction wind is coming FROM
  pressureInHg: number | null; // sea-level
  pressureTrend: PressureTrend;
  precipTodayIn: number | null;
  uv: number | null;
  solarWm2: number | null;
  conditions: string | null;
  lightning: {
    count3h: number;
    lastEpoch: number | null;
    lastDistanceMi: number | null;
  } | null;
}

export interface HistoryPoint {
  t: number; // epoch ms
  tempF: number | null;
  windMph: number | null;
  gustMph: number | null;
  pressureInHg: number | null;
}

export interface HourlyForecast {
  t: number; // epoch ms
  tempF: number | null;
  windMph: number | null;
  gustMph: number | null;
  windDir: number | null;
  precipChance: number | null;
  conditions: string;
  icon: string; // normalized icon key
}

export interface DailyForecast {
  t: number; // epoch ms (local midnight-ish)
  label: string; // "Mon"
  highF: number | null;
  lowF: number | null;
  precipChance: number | null;
  conditions: string;
  icon: string;
  windMph: number | null;
}

export interface Conditions {
  current: CurrentObs | null;
  history: HistoryPoint[];
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  forecastSource: WeatherSource | null;
  fetchedAt: string;
  configured: { tempest: boolean; wunderground: boolean };
}

export interface DailyValue {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface WaterData {
  release: DailyValue[]; // Kortes release, cfs
  inflow: { t: number; cfs: number }[]; // USGS above Seminoe, instantaneous
  seminoe: { storageAf: number | null; elevFt: number | null; pctFull: number | null; date: string | null };
  pathfinder: { storageAf: number | null; elevFt: number | null; pctFull: number | null; date: string | null };
  fetchedAt: string;
}
