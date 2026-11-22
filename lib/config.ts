/**
 * Fixed facts about the place. Everything location-specific lives here.
 */
export const MILE = {
  name: "Miracle Mile",
  river: "North Platte River",
  county: "Carbon County, Wyoming",
  // Midpoint of the Mile, between Kortes Dam and the Pathfinder inlet.
  lat: 42.205,
  lon: -106.875,
  elevationFt: 5880,
  timezone: "America/Denver",
  // NWS gridpoint covering the Mile (from api.weather.gov/points/42.215,-106.865)
  nwsGrid: { office: "CYS", x: 44, y: 68 },
} as const;

/** USBR Great Plains Hydromet station/parameter codes. */
export const USBR = {
  kortesRelease: "KORR QD", // Kortes Dam daily mean release (cfs) = flow through the Mile
  seminoeRelease: "SEMR QD",
  seminoeStorage: "SEMR AF",
  seminoeElev: "SEMR FB",
  pathfinderStorage: "PATR AF",
  pathfinderElev: "PATR FB",
} as const;

/** Approximate total active capacity (acre-feet), per Reclamation project data. */
export const RESERVOIR_CAPACITY_AF = {
  seminoe: 1_017_273,
  pathfinder: 1_016_507,
} as const;

/** USGS gauge on the North Platte above Seminoe Reservoir (upstream inflow). */
export const USGS_INFLOW_SITE = "06630000";

/**
 * How we read Miracle Mile flows (cfs). Local rules of thumb, not gospel.
 * Ordered low → high; `max` is exclusive.
 */
export const FLOW_BANDS = [
  { max: 300, label: "Skinny water", note: "Low and clear. Long leaders, small flies, stealthy wading." },
  { max: 800, label: "Prime wading", note: "Comfortable wading and most runs fishable. Classic Mile flows." },
  { max: 1500, label: "Pushy but good", note: "Fish move to the softer edges and seams. Wade carefully." },
  { max: 3000, label: "High water", note: "Crossing is out. Work the banks with heavier rigs." },
  { max: Infinity, label: "Big water", note: "Runoff-level releases. Mostly bank fishing; be careful." },
] as const;

export function flowBand(cfs: number | null | undefined) {
  if (cfs == null || !Number.isFinite(cfs)) return null;
  const idx = FLOW_BANDS.findIndex((b) => cfs < b.max);
  return { ...FLOW_BANDS[idx], index: idx };
}
