import { getConditions } from "@/lib/weather";
import { getWater } from "@/lib/water";
import { HomeApp } from "@/components/home/HomeApp";

// Re-render at most every 2 minutes; the client polls for fresher station data.
export const revalidate = 120;

export default async function Page() {
  const [conditions, water] = await Promise.all([getConditions(), getWater()]);
  return <HomeApp conditions={conditions} water={water} serverNow={Date.now()} />;
}
