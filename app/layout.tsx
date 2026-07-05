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
        {/* Warm Terracotta type system: Fraunces (display), Inter (body), IBM Plex Mono (data) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
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
