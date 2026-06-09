import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import NavigationProgress from "@/components/NavigationProgress";

export const metadata: Metadata = {
  title: "NatureTrace — Biodiversity Reporting",
  description: "Citizen science biodiversity reporting for UK wildlife",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NatureTrace",
  },
  icons: {
    apple: "/icons/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="theme-color" content="#1D6A48" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="dns-prefetch" href="https://mkkloluggtpwmfhlrocm.supabase.co" />
        <link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
        <link rel="preconnect" href="https://mkkloluggtpwmfhlrocm.supabase.co" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <NavigationProgress />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Toaster position="bottom-right" />
        <OnboardingOverlay />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
