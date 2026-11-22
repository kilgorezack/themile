import type { Metadata } from "next";
import { getConditions } from "@/lib/weather";
import { getWater } from "@/lib/water";
import { getRegion } from "@/lib/region";
import { DashboardApp } from "@/components/dash/DashboardApp";

export const revalidate = 120;
export const metadata: Metadata = { title: "Dashboard — The Mile" };

export default async function Page() {
  const [conditions, water, region] = await Promise.all([getConditions(), getWater(), getRegion()]);
  return <DashboardApp conditions={conditions} water={water} region={region} serverNow={Date.now()} />;
}
