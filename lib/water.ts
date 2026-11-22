import "server-only";
import type { DailyValue, WaterData } from "./types";
import { MILE, RESERVOIR_CAPACITY_AF, USBR, USGS_INFLOW_SITE } from "./config";

function localYMD(d: Date) {
  const s = d.toLocaleDateString("en-CA", { timeZone: MILE.timezone }); // YYYY-MM-DD
  const [y, m, day] = s.split("-").map(Number);
  return { y, m, d: day };
}

/**
 * USBR Great Plains Hydromet daily archive (CSV). Returns one series per
 * parameter code. Sentinel values ("MISSING", "NO RECORD", negative
 * placeholder numbers) are dropped.
 */
export async function usbrDaily(codes: string[], days: number): Promise<Record<string, DailyValue[]>> {
  const end = localYMD(new Date());
  const start = localYMD(new Date(Date.now() - days * 86_400_000));
  const url =
    "https://www.usbr.gov/gp-bin/webarccsv.pl?" +
    new URLSearchParams({
      parameter: codes.join(","),
      syer: String(start.y),
      smnth: String(start.m),
      sdy: String(start.d),
      eyer: String(end.y),
      emnth: String(end.m),
      edy: String(end.d),
      format: "4",
    }).toString();

  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`USBR → ${res.status}`);
  const text = await res.text();

  const out: Record<string, DailyValue[]> = Object.fromEntries(codes.map((c) => [c, []]));
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !/^\d{4}-\d{2}-\d{2}/.test(line)) continue;
    const [date, ...vals] = line.split(",");
    vals.forEach((raw, i) => {
      const code = codes[i];
      const v = Number(raw.trim());
      if (code && Number.isFinite(v) && v >= 0) out[code].push({ date, value: v });
    });
  }
  for (const code of codes) out[code] = sanitize(code, out[code]);
  return out;
}

/**
 * Hydromet's newest rows are sometimes garbage (e.g. storage dropping 18% in a
 * day). Drop storage/elevation points that jump implausibly from the recent median.
 */
function sanitize(code: string, series: DailyValue[]) {
  const kind = code.split(" ")[1];
  if (kind !== "AF" && kind !== "FB") return series;
  const kept: DailyValue[] = [];
  for (const p of series) {
    const recent = kept.slice(-5).map((k) => k.value).sort((a, b) => a - b);
    const med = recent[Math.floor(recent.length / 2)];
    const bad = med != null && (kind === "AF" ? Math.abs(p.value - med) / med > 0.05 : Math.abs(p.value - med) > 2);
    if (!bad) kept.push(p);
  }
  return kept;
}

async function usgsInflow(): Promise<{ t: number; cfs: number }[]> {
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${USGS_INFLOW_SITE}&parameterCd=00060&period=P7D`;
  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`USGS → ${res.status}`);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const data: any = await res.json();
  const values: { value: string; dateTime: string }[] = data.value?.timeSeries?.[0]?.values?.[0]?.value ?? [];
  // Keep hourly points; the 15-minute series is more than a sparkline needs.
  return values
    .filter((_, i) => i % 4 === 0)
    .map((v) => ({ t: Date.parse(v.dateTime), cfs: Number(v.value) }))
    .filter((v) => Number.isFinite(v.cfs) && v.cfs >= 0);
}

const last = (arr: DailyValue[] | undefined) => (arr && arr.length ? arr[arr.length - 1] : null);

export async function getWater(): Promise<WaterData> {
  const [usbr, inflow] = await Promise.all([
    usbrDaily(
      [USBR.kortesRelease, USBR.seminoeStorage, USBR.seminoeElev, USBR.pathfinderStorage, USBR.pathfinderElev],
      120,
    ).catch((e) => {
      console.error("[water] usbr failed:", e.message);
      return {} as Record<string, DailyValue[]>;
    }),
    usgsInflow().catch((e) => {
      console.error("[water] usgs failed:", e.message);
      return [];
    }),
  ]);

  const semS = last(usbr[USBR.seminoeStorage]);
  const patS = last(usbr[USBR.pathfinderStorage]);

  return {
    release: usbr[USBR.kortesRelease] ?? [],
    inflow,
    seminoe: {
      storageAf: semS?.value ?? null,
      elevFt: last(usbr[USBR.seminoeElev])?.value ?? null,
      pctFull: semS ? (semS.value / RESERVOIR_CAPACITY_AF.seminoe) * 100 : null,
      date: semS?.date ?? null,
    },
    pathfinder: {
      storageAf: patS?.value ?? null,
      elevFt: last(usbr[USBR.pathfinderElev])?.value ?? null,
      pctFull: patS ? (patS.value / RESERVOIR_CAPACITY_AF.pathfinder) * 100 : null,
      date: patS?.date ?? null,
    },
    fetchedAt: new Date().toISOString(),
  };
}
