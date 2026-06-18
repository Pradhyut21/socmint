import type { Metadata } from "next";
import "./globals.css";
import { AppShellClient } from "./AppShellClient";

export const metadata: Metadata = {
  title: "SOCMINT Shield - Suspect Intelligence & Profiling Platform",
  description: "AI-Powered OSINT Suspect Profiling Platform for Indian Law Enforcement. Compliant with DPDP Act 2023 & Section 65B IEA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Leaflet CSS for maps */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
      </head>
      <body className="h-full antialiased paper-grain">
        <AppShellClient>
          {children}
        </AppShellClient>
      </body>
    </html>
  );
}
