import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getRegion } from "@/lib/region";
import { MapApp } from "@/components/map/MapApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  title: "Map",
  description: "Field and satellite map of the Miracle Mile, Kortes Dam to Pathfinder, with live conditions.",
  path: "/map",
});

export default async function Page({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const [{ site }, region] = await Promise.all([searchParams, getRegion()]);
  return <MapApp region={region} serverNow={Date.now()} initialSite={site ?? null} />;
}
