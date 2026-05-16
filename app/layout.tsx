import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "BioGuard — Biodiversity Reporting",
  description: "Citizen science biodiversity reporting for UK wildlife",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
