import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/toaster";
import { AuthSync } from "@/components/shell/auth-sync";
import { ServiceWorkerRegister } from "@/components/shell/sw-register";
import { brand } from "@/config/brand";
import { tokens } from "@/config/tokens";
import { splashScreens } from "@/config/splash";
import "./globals.css";

/*
 * Brand fonts, self-hosted (no runtime request to Google, no layout shift):
 *  - Fraunces (variable: wght + opsz) — the serif used for headlines on upthestakes.net
 *  - Plus Jakarta Sans (variable: wght) — the site's body/UI face
 * Files come from @fontsource-variable (OFL-1.1). See DECISIONS.md → "Fonts".
 */
const fraunces = localFont({
  src: "./fonts/fraunces-latin-opsz-normal.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-jakarta",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${brand.appName} — ${brand.tagline}`, template: `%s · ${brand.appName}` },
  description: brand.description,
  applicationName: brand.appName,
  appleWebApp: {
    capable: true,
    title: brand.appShortName,
    statusBarStyle: "black-translucent",
    startupImage: splashScreens,
  },
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: false, follow: false }, // TODO(phase 5): index the public landing page only
};

export const viewport: Viewport = {
  themeColor: tokens.elevated,
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster />
        <ServiceWorkerRegister />
        <AuthSync />
      </body>
    </html>
  );
}
