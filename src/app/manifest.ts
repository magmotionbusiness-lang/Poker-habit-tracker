import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
import { tokens } from "@/config/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/today",
    name: brand.appName,
    short_name: brand.appShortName,
    description: brand.description,
    start_url: "/home?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: tokens.canvas,
    theme_color: tokens.elevated,
    categories: ["sports", "productivity", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Start session",
        url: "/today?action=start-session",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Log a hand",
        url: "/hands?action=log-hand",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
