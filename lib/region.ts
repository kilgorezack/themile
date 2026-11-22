import "server-only";
import { SITES } from "./sites";
import { usbrDaily } from "./water";

export interface SiteData {
  id: string;
  series: Partial<Record<"QD" | "IN" | "AF" | "FB" | "Q", { t: number; v: number }[]>>;
  latest: Partial<Record<"QD" | "IN" | "AF" | "FB" | "Q", { t: number; v: number }>>;
  pctFull: number | null;
}

export interface RegionData {
  sites: Record<string, SiteData>;
  fetchedAt: string;
}

const ymdToMs = (ymd: string) => Date.parse(`${ymd}T12:00:00-07:00`);

async function usgs(sites: string[]) {
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${sites.join(",")}&parameterCd=00060&period=P7D&siteStatus=all`;
  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`USGS → ${res.status}`);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const data: any = await res.json();
  const out: Record<string, { t: number; v: number }[]> = {};
  for (const ts of data.value?.timeSeries ?? []) {
    const site = String(ts.sourceInfo?.siteCode?.[0]?.value ?? "");
    const vals: { value: string; dateTime: string }[] = ts.values?.[0]?.value ?? [];
    out[site] = vals
      .filter((_, i) => i % 4 === 0)
      .map((v) => ({ t: Date.parse(v.dateTime), v: Number(v.value) }))
      .filter((p) => Number.isFinite(p.v) && p.v >= 0);
  }
  return out;
}

export async function getRegion(): Promise<RegionData> {
  const codes = SITES.filter((s) => s.usbr).flatMap((s) => s.params!.map((p) => `${s.usbr} ${p}`));
  const gauges = SITES.filter((s) => s.usgs).map((s) => s.usgs!);
  const [usbr, gauge] = await Promise.all([
    usbrDaily(codes, 90).catch((e) => {
      console.error("[region] usbr:", e.message);
      return {} as Awaited<ReturnType<typeof usbrDaily>>;
    }),
    usgs(gauges).catch((e) => {
      console.error("[region] usgs:", e.message);
      return {} as Record<string, { t: number; v: number }[]>;
    }),
  ]);

  const sites: Record<string, SiteData> = {};
  for (const s of SITES) {
    const d: SiteData = { id: s.id, series: {}, latest: {}, pctFull: null };
    if (s.usbr) {
      for (const p of s.params!) {
        const arr = (usbr[`${s.usbr} ${p}`] ?? []).map((x) => ({ t: ymdToMs(x.date), v: x.value }));
        d.series[p] = arr;
        if (arr.length) d.latest[p] = arr[arr.length - 1];
      }
      if (s.capacityAf && d.latest.AF) d.pctFull = (d.latest.AF.v / s.capacityAf) * 100;
    }
    if (s.usgs) {
      const arr = gauge[s.usgs] ?? [];
      d.series.Q = arr;
      // Seasonal gauges can go quiet; only call it "latest" if it's under 2 days old.
      const last = arr.at(-1);
      if (last && Date.now() - last.t < 2 * 86_400_000) d.latest.Q = last;
    }
    sites[s.id] = d;
  }
  return { sites, fetchedAt: new Date().toISOString() };
}
