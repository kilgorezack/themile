export const cToF = (c: number) => (c * 9) / 5 + 32;
export const msToMph = (ms: number) => ms * 2.236936;
export const kmhToMph = (k: number) => k * 0.621371;
export const mbToInHg = (mb: number) => mb * 0.0295300;
export const paToInHg = (pa: number) => pa * 0.000295300;
export const mmToIn = (mm: number) => mm / 25.4;
export const kmToMi = (km: number) => km * 0.621371;

/** Station pressure → sea-level pressure (hypsometric approximation). */
export function stationToSeaLevelMb(stationMb: number, elevationM: number, tempC: number) {
  const h = elevationM;
  return stationMb * Math.pow(1 - (0.0065 * h) / (tempC + 0.0065 * h + 273.15), -5.257);
}

export function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export function cardinal(deg: number | null | undefined) {
  if (deg == null) return "—";
  return CARDINALS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

export function cardinalToDeg(c: string | null | undefined): number | null {
  if (!c) return null;
  const i = CARDINALS.indexOf(c.trim().toUpperCase());
  return i < 0 ? null : i * 22.5;
}

export function round(v: number | null | undefined, digits = 0) {
  if (v == null || !Number.isFinite(v)) return null;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

export function fmt(v: number | null | undefined, digits = 0, fallback = "—") {
  const r = round(v, digits);
  return r == null ? fallback : r.toFixed(digits);
}
