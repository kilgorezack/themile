import type { Metadata } from "next";

/**
 * Per-page metadata: tab title (run through the root "%s — The Mile" template),
 * canonical URL, and matching Open Graph / Twitter text so shared links
 * (iMessage, Slack, social) show the page's own title. The share image
 * (public/og.png) is listed on every page, since a page's openGraph replaces
 * the root's rather than merging with it.
 */
export const SHARE_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "The Mile: live conditions on the Miracle Mile of the North Platte River, Wyoming",
};

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  /** use this exact tab title instead of the "%s — The Mile" template */
  absoluteTitle?: string;
  index?: boolean;
}): Metadata {
  const full = absoluteTitle ?? `${title} — The Mile`;
  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title: full, description, url: path, siteName: "The Mile", locale: "en_US", type: "website", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title: full, description, images: [SHARE_IMAGE] },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}
