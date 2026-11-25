import type { Metadata } from "next";
import { PricingPage } from "@/components/pricing/PricingPage";

export const metadata: Metadata = {
  title: "Pricing — The Mile",
  description: "Today's read is free. Milecast One adds the full Conditions report, the customizable dashboard and the maps: $4.99/month or $29.99/year.",
};

export default function Page() {
  return <PricingPage serverNow={Date.now()} />;
}
