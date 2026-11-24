import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { FirebaseInit } from "@/components/FirebaseInit";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SignInDialog } from "@/components/auth/SignInDialog";
import { ProfileDialog } from "@/components/auth/ProfileDialog";
import { SHARE_IMAGE } from "@/lib/seo";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "opsz"],
  style: ["normal", "italic"],
});
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

const SITE_URL = "https://mile.fish";
const DESCRIPTION =
  "Live weather from the Mile, Kortes Dam releases, reservoir levels, forecast wind, solunar windows and hatches for the Miracle Mile of the North Platte River, Wyoming.";
const SHARE_DESCRIPTION = "Live flows, wind, weather and hatches on the Miracle Mile of the North Platte River, Wyoming.";

// Icons come from files in app/ (favicon.ico, icon.svg, apple-icon.png).
// The link-preview image is public/og.png.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "The Mile — Miracle Mile fishing conditions",
    template: "%s — The Mile",
  },
  description: DESCRIPTION,
  applicationName: "The Mile",
  appleWebApp: { title: "The Mile", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  alternates: { canonical: "/" },
  openGraph: {
    title: "The Mile — Miracle Mile fishing conditions",
    description: SHARE_DESCRIPTION,
    url: "/",
    siteName: "The Mile",
    locale: "en_US",
    type: "website",
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Mile — Miracle Mile fishing conditions",
    description: SHARE_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efe9dd" },
    { media: "(prefers-color-scheme: dark)", color: "#111613" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <AuthProvider>
          {children}
          <SignInDialog />
          <ProfileDialog />
        </AuthProvider>
        <FirebaseInit />
        {/* Microsoft Clarity analytics */}
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "zhtow8hrdv");`}
        </Script>
      </body>
    </html>
  );
}
