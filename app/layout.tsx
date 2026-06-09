import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full bg-[#080c16]">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        {/* Leaflet CSS for maps */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
      </head>
      <body className="h-full antialiased text-slate-200">
        {children}
      </body>
    </html>
  );
}
