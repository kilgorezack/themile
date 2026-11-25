import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Mile — Miracle Mile fishing conditions",
    short_name: "The Mile",
    description: "Live flows, wind, weather and hatches on the Miracle Mile of the North Platte River, Wyoming.",
    start_url: "/",
    display: "standalone",
    background_color: "#efe9dd",
    theme_color: "#1f3d35",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  };
}
