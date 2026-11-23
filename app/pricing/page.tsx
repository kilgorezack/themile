import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PricingPage } from "@/components/pricing/PricingPage";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description: "Conditions are free. Milecast One adds the customizable dashboard, field map and satellite map: $4.99/month or $29.99/year.",
  path: "/pricing",
});

export default function Page() {
  return <PricingPage serverNow={Date.now()} />;
}
