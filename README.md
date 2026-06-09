# 🛡️ SOCIMINT Intelligence Platform

> **Next-Generation Social Media & Financial Intelligence (SOCMINT / OSINT) Platform optimized for Indian Contexts.**

A powerful, full-stack Next.js intelligence platform designed to map digital footprints, uncover shadow accounts, and trace financial and legal histories.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **🤖 AI Chat Assistant** | Integrated AI agent (`AiChat`) to help analysts query and interpret intelligence data in real-time. |
| **🔗 Interactive Network Graph** | Visualize complex relationships, alias connections, and associate networks. |
| **🕵️ Shadow Account Prober** | Advanced algorithms to detect undisclosed alternate or "burner" profiles across platforms. |
| **🏦 UPI & Financial Footprint** | Specialized integration to trace UPI (Unified Payments Interface) transactions and financial linkages. |
| **⚖️ Indian Kanoon Integration** | Direct fetching of legal records and court proceedings from the Indian Kanoon database. |
| **📍 Geo-Spatial Location Map** | Interactive `Leaflet` maps to pinpoint timelines and physical locations derived from digital activity. |
| **⏱️ Evasion Timeline** | Track and map chronological efforts by targets to obscure their digital identity or location. |

---

## 🏗️ Architecture

Unlike typical split-stack applications, this platform utilizes a modern, unified **Full-Stack Next.js (App Router)** architecture:
- **Frontend:** React 19, TailwindCSS 4, Lucide Icons
- **Backend:** Next.js Serverless API Routes (Node.js/TypeScript)
- **Mapping:** Leaflet.js
- **Language:** 100% TypeScript for end-to-end type safety

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm, yarn, or pnpm

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Pradhyut21/SOCIMINT.git
   cd SOCIMINT
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to access the dashboard.

---

## 📡 API Capabilities

The backend leverages Next.js API routes located in `app/api/`:
- `POST /api/investigate`: Triggers the core investigation and data collection logic.
- `POST /api/chat`: Communicates with the AI analyst assistant.
- `GET /api/nexus`: Retrieves graph-based network relational data.

---

## 🇮🇳 Why This Stands Out

While most OSINT tools focus solely on western social platforms, this platform is uniquely tailored for deep intelligence gathering in **India**. By combining **UPI footprint analysis** with **Indian Kanoon court records**, analysts get a comprehensive, real-world view of a target's financial and legal standing, not just their online posts.
