import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getConditions } from "@/lib/weather";
import { getWater } from "@/lib/water";
import { ConditionsPage } from "@/components/ConditionsPage";

export const revalidate = 120;
export const metadata: Metadata = pageMetadata({
  title: "Conditions",
  description: "Right now on the Miracle Mile: station weather, wind, Kortes Dam release, reservoir levels, forecast, sun and moon, and hatches.",
  path: "/conditions",
});

export default async function Page() {
  const [conditions, water] = await Promise.all([getConditions(), getWater()]);
  return <ConditionsPage conditions={conditions} water={water} serverNow={Date.now()} />;
}
