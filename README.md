# 🛡️ SOCMINT Shield — Intelligence Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)

**Next-Generation Social Media & Financial Intelligence (SOCMINT/OSINT) Platform — Built for Indian Contexts**

[🚀 Quick Start](#-quick-start) • [✨ Features](#-key-features) • [🏗️ Architecture](#-architecture) • [📡 API Docs](#-api-capabilities)

</div>

---

## 🎯 What is SOCMINT Shield?

SOCMINT Shield is a **full-stack, production-grade Open Source Intelligence (OSINT)** platform purpose-built for Indian law enforcement and investigative use-cases. It aggregates, correlates, and visualizes digital footprints across social media platforms, cross-references them with real Indian legal databases (Indian Kanoon, MCA21), and maps physical movement timelines using geospatial intelligence — all from a single, unified interface.

> Built for the **India Runs on Data & AI Hackathon** challenge, this platform demonstrates how AI-powered SOCMINT can aid India's cybercrime investigators in building admissible, evidence-backed intelligence packages.

---

## ✨ Key Features

| Module | Description |
| :--- | :--- |
| **🔍 Live OSINT Sweep** | Real-time acquisition from GitHub, Reddit, LinkedIn, Instagram, Twitter, Telegram, Facebook & Quora — all simultaneously |
| **🤖 AI Nexus Analyst** | Integrated AI chat agent that cross-references all collected signals and generates structured threat assessments |
| **🗺️ Geo-Spatial Movement Map** | Interactive Leaflet.js map auto-populates from bio/post text, pinpointing hackathon & event attendance with crime scene proximity alerts |
| **🕵️ Shadow Account Detector** | Multi-signal alias detection engine identifying burner/evasion accounts across platforms with confidence scoring |
| **🏦 UPI Financial Footprint** | Infers probable UPI IDs, NCRP fraud complaint lookups & Truecaller carrier data from phone numbers |
| **⚖️ Indian Kanoon Integration** | Live-fetches court cases, FIRs and judgments; cross-references case dates with location timeline |
| **🏢 MCA Company Intelligence** | Ministry of Corporate Affairs company search integration for corporate fraud investigation |
| **⏱️ Evasion Timeline** | Chronological visualization of a target's identity-obscuring behavior patterns |
| **📦 Evidence Package Export** | One-click PDF export of complete intelligence dossier for legal submission |
| **📝 Section 91 CrPC Generator** | Auto-generates legally formatted statutory data requisition letters for serving to IRCTC, Uber, etc. |
| **🕸️ Network Graph** | Force-directed relationship graph visualizing account ownership and associate networks |

---

## 🏗️ Architecture

A **unified Full-Stack Next.js App Router** architecture with zero split-stack overhead:

```
socmint/
├── app/
│   ├── page.tsx                  # Main investigator dashboard
│   └── api/
│       ├── investigate/          # Core OSINT acquisition engine
│       ├── chat/                 # AI Nexus analyst endpoint
│       └── nexus/                # Network graph data API
├── components/
│   ├── AiChat.tsx                # AI analyst chat interface
│   ├── EvidencePackage.tsx       # PDF dossier generator
│   ├── EvasionTimeline.tsx       # Alias evasion timeline
│   ├── LegalRecords.tsx          # Court records viewer
│   ├── LocationMap.tsx           # Geospatial intelligence map
│   ├── NetworkGraph.tsx          # Force-directed association graph
│   ├── ProfileOverview.tsx       # Subject risk profile
│   └── TimelineView.tsx          # Post activity timeline
├── lib/
│   ├── liveSocmint.ts            # Core OSINT orchestration engine
│   ├── types.ts                  # TypeScript type definitions
│   ├── analysis/
│   │   ├── aliasDetector.ts      # Shadow account detection
│   │   └── shadowAccountProber.ts
│   └── fetchers/
│       ├── indianKanoon.ts       # Indian Kanoon API client
│       └── upiFootprint.ts       # UPI & phone intelligence
```

**Tech Stack:**
- **Frontend:** React 19, Next.js 15 (App Router), TailwindCSS 4
- **Backend:** Next.js Serverless API Routes (TypeScript)
- **Mapping:** Leaflet.js with OpenStreetMap tiles
- **AI:** Integrated AI chat for real-time analyst assistance
- **Icons:** Lucide React
- **Language:** 100% TypeScript — end-to-end type safety

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm / yarn / pnpm

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/shadowtrader9921/socmint.git
cd socmint

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the investigator dashboard loads immediately.

### Demo Subjects (Built-in)
Try searching for these mock suspects to see all features in action:
- **`shadowtrader99`** — High-risk DeFi suspect with Bengaluru crime correlation
- **`sneha_fintech`** — Mumbai/Pune financial fraud analyst test case

---

## 📡 API Capabilities

| Endpoint | Method | Description |
|---|---|---|
| `/api/investigate` | `POST` | Triggers full OSINT sweep for a username, name, phone, or email |
| `/api/chat` | `POST` | AI Nexus analyst — interprets collected intelligence |
| `/api/nexus` | `GET` | Returns network graph nodes and relationship links |

### Sample Request
```json
POST /api/investigate
{
  "query": "shadowtrader99",
  "type": "username"
}
```

---

## 🇮🇳 Why SOCMINT Shield Stands Out

Most global OSINT tools are built for Western platforms and ignore the Indian context entirely. SOCMINT Shield is different:

- 🏦 **UPI-Native**: Infers financial identifiers from phone numbers — critical for Indian cybercrime
- ⚖️ **Indian Kanoon**: Live court record fetching, not just web search
- 🏢 **MCA21 Integration**: Trace corporate fraud through Ministry of Corporate Affairs
- 📍 **Hackathon Geomapping**: Automatically extracts event attendance from LinkedIn/GitHub bios and maps it — unique to this platform
- 📝 **Legal-Ready Output**: Section 91 CrPC requisition letter auto-generation for official data requests
- 🔴 **Crime Scene Correlation**: Cross-references physical locations with FIR dates to flag proximity matches

---

## 📸 Screenshots

> Dashboard with live multi-platform OSINT sweep, risk scoring, geospatial map, AI analyst chat, and legal record cross-referencing.

---

## 📄 License

MIT © 2025 shadowtrader9921

---

<div align="center">
  <sub>Built with ❤️ for safer digital investigations in India</sub>
</div>
