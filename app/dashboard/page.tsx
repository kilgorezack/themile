import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getConditions } from "@/lib/weather";
import { getWater } from "@/lib/water";
import { getRegion } from "@/lib/region";
import { DashboardApp } from "@/components/dash/DashboardApp";

export const revalidate = 120;
export const metadata: Metadata = pageMetadata({
  title: "Dashboard",
  description: "Your Miracle Mile dashboard: wind, flow, weather and fishing windows, arranged the way you fish.",
  path: "/dashboard",
});

export default async function Page() {
  const [conditions, water, region] = await Promise.all([getConditions(), getWater(), getRegion()]);
  return <DashboardApp conditions={conditions} water={water} region={region} serverNow={Date.now()} />;
}
