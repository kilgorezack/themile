import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PricingPage } from "@/components/pricing/PricingPage";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description: "Today's read is free. Milecast One adds the full Conditions report, the customizable dashboard and the maps: $4.99/month or $29.99/year.",
  path: "/pricing",
});

export default function Page() {
  return <PricingPage serverNow={Date.now()} />;
}
