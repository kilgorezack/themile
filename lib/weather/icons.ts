export type IconKey =
  | "clear-day"
  | "clear-night"
  | "partly-day"
  | "partly-night"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "sleet"
  | "storm"
  | "wind";

/** Map any provider's icon name or condition text onto our small icon set. */
export function normalizeIcon(raw: string | null | undefined, isDay = true): IconKey {
  const s = (raw ?? "").toLowerCase();
  if (/thunder|storm|lightning/.test(s)) return "storm";
  if (/sleet|freezing|ice|wintry|mix/.test(s)) return "sleet";
  if (/snow|flurr|blizzard/.test(s)) return "snow";
  if (/rain|shower|drizzle|rainy/.test(s)) return "rain";
  if (/fog|haze|smoke|mist|foggy/.test(s)) return "fog";
  if (/wind|breez|blustery/.test(s)) return "wind";
  const night = /night/.test(s) || (!/day/.test(s) && !isDay);
  if (/partly|mostly sunny|mostly clear|few|scattered/.test(s)) return night ? "partly-night" : "partly-day";
  if (/cloud|overcast/.test(s)) return "cloudy";
  return night ? "clear-night" : "clear-day";
}
