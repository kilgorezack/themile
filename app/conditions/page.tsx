import type { Metadata } from "next";
import { getConditions } from "@/lib/weather";
import { getWater } from "@/lib/water";
import { ConditionsPage } from "@/components/ConditionsPage";

export const revalidate = 120;
export const metadata: Metadata = { title: "Conditions — The Mile" };

export default async function Page() {
  const [conditions, water] = await Promise.all([getConditions(), getWater()]);
  return <ConditionsPage conditions={conditions} water={water} serverNow={Date.now()} />;
}
