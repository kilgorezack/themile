import type { Metadata } from "next";
import { getRegion } from "@/lib/region";
import { MapApp } from "@/components/map/MapApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Map — The Mile" };

export default async function Page({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const [{ site }, region] = await Promise.all([searchParams, getRegion()]);
  return <MapApp region={region} serverNow={Date.now()} initialSite={site ?? null} />;
}
