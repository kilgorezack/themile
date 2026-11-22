import "server-only";
import type { Conditions, CurrentObs, DailyForecast, HistoryPoint, HourlyForecast, WeatherSource } from "../types";
import { tempestConfigured, tempestForecastAndCurrent, tempestHistory } from "./tempest";
import { wundergroundConfigured, wundergroundCurrent, wundergroundHistory } from "./wunderground";
import { nwsForecast, nwsObservations } from "./nws";

async function attempt<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[weather] ${label} failed:`, (err as Error).message);
    return null;
  }
}

/**
 * Station priority: Tempest → Weather Underground → nearest NWS station.
 * Forecast priority: Tempest (station-tuned) → NWS gridpoint.
 */
export async function getConditions(): Promise<Conditions> {
  let current: CurrentObs | null = null;
  let history: HistoryPoint[] = [];
  let hourly: HourlyForecast[] = [];
  let daily: DailyForecast[] = [];
  let forecastSource: WeatherSource | null = null;

  if (tempestConfigured()) {
    const [fc, hist] = await Promise.all([
      attempt("tempest forecast", tempestForecastAndCurrent),
      attempt("tempest history", tempestHistory),
    ]);
    if (fc) {
      current = fc.current;
      hourly = fc.hourly;
      daily = fc.daily;
      forecastSource = "tempest";
    }
    history = hist ?? [];
  }

  if (!current && wundergroundConfigured()) {
    const hist = (await attempt("wu history", wundergroundHistory)) ?? [];
    const cur = await attempt("wu current", () => wundergroundCurrent(hist));
    if (cur) {
      current = cur;
      history = hist;
    }
  }

  const [nwsFc, nwsObs] = await Promise.all([
    forecastSource ? null : attempt("nws forecast", nwsForecast),
    current ? null : attempt("nws observations", nwsObservations),
  ]);
  if (nwsFc) {
    hourly = nwsFc.hourly;
    daily = nwsFc.daily;
    forecastSource = "nws";
  }
  if (nwsObs) {
    current = nwsObs.current;
    history = nwsObs.history;
  }

  return {
    current,
    history,
    hourly,
    daily,
    forecastSource,
    fetchedAt: new Date().toISOString(),
    configured: { tempest: tempestConfigured(), wunderground: wundergroundConfigured() },
  };
}
