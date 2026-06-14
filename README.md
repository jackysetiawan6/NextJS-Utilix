<p align="center">
  <a href="https://github.com/jackysetiawan6/NextJS-Utilix">
    <img src="public/banner.png" alt="Utilix Brand Banner" width="100%" style="border-radius: 0.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);" />
  </a>
</p>

<p align="center">
  <strong>Interactive Data Center Power Distribution Management & Single-Line Diagram Editor</strong>
</p>

<p align="center">
  <a href="https://github.com/jackysetiawan6/NextJS-Utilix/stargazers"><img src="https://img.shields.io/github/stars/jackysetiawan6/NextJS-Utilix?style=flat-square&color=6366f1" alt="GitHub Stars"></a>
  <a href="https://github.com/jackysetiawan6/NextJS-Utilix/issues"><img src="https://img.shields.io/github/issues/jackysetiawan6/NextJS-Utilix?style=flat-square&color=ef4444" alt="GitHub Issues"></a>
  <a href="https://github.com/jackysetiawan6/NextJS-Utilix/blob/main/LICENSE"><img src="https://img.shields.io/github/license/jackysetiawan6/NextJS-Utilix?style=flat-square&color=10b981" alt="License"></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/built%20with-Next.js-black?style=flat-square" alt="Next.js"></a>
</p>

---

## 🚀 Overview

**Utilix** is a professional single-line diagram (SLD) interactive canvas and electrical power distribution management dashboard designed for modern data centers. It empowers supervisors and operators to design, configure, simulate, and audit complex electrical trees, transfer switch parameters, safety interlocks, and downstream power topologies in real-time.

---

## ⚡ Key Features

* **🎨 Custom Designed Brand Identity**:
  * Integrated a custom futuristic energy-circuit logo directly in the website layout header and authentication portals.
* **🌐 Interactive Single-Line Diagram (SLD) Canvas**:
  * Rendered using **React Flow** with interactive panning, zooming, and item dragging.
  * Collapsible downstream distribution tree nodes to reduce visual clutter on complex canvas topologies.
  * Explicit color-coding for primary electrical sources (Group A - Cyan, Group B - Purple, Main Lines - Gray).
* **🔀 Decoupled Connection Port Naming**:
  * Supports independent naming for outgoing ports (source side) and incoming ports (target side) on the same connected edge (e.g., source panel A's outgoing port can be named `Q1.1` while target panel B's incoming port is named `LVDP A1-1`).
  * Displays combined labels (`Outgoing → Incoming`) along active wires on the diagram canvas.
  * Serialized using a smart, backward-compatible delimiter (`|||`) within the database schema, requiring **zero database migration downtime**.
* **🔋 Automated Power Flow Simulation**:
  * Evaluates active flow using a **fixed-point iterative convergence algorithm**, resolving panel statuses (`Online`, `Offline`, `Maintenance`) correctly regardless of rendering order.
  * Models **Automatic Transfer Switch (ATS)** behavior by automatically switching and closing/opening incoming breakers based on upstream availability and priority.
  * Automates outgoing feeder breakers in `Auto` mode to close/open dynamically based on parent panel status.
  * Enforces **interlock rules** to prevent accidental short-circuits (e.g., locking out multiple manual closed feeds on the same panel).
* **🔑 Role-Based Access Control (RBAC)**:
  * Passcode-secured switcher embedded in the toolbar:
    * **Supervisor** (Passcode: `3333`): Full editing permissions (create/delete panels & connections, edit properties, trigger topological auto-layout).
    * **Operator** (Passcode: `2222`): Operational permissions (control manual breakers and select transfer priority).
    * **View-Only** (Empty passcode): Observation mode.
* **💾 Supabase Integration & Realtime Sync**:
  * Synchronizes diagram layouts, panel detail properties, and connection states across all clients in real-time.
  * Supports **Mock Mode fallback** when environment variables are missing, with a visual amber indicator and informative tooltip in the header.
* **⏱️ Performance-Optimized Undo/Redo**:
  * Supports complete Undo and Redo states (`Ctrl+Z` / `Ctrl+Y`) for layout and panel modifications.
  * Groups continuous drag movements into a single transaction committed to history only on release, preventing undo history bloat.
* **📜 Persistent Event Logging**:
  * Records detailed operations (breaker state changes, role authentication, connection creations, errors, etc.).
  * Dedicated Log viewer page with live search filters for Roles, Actions, and details.

---

## 🛠️ Architecture & Tech Stack

* **Frontend Framework**: Next.js `15.5.9` (App Router)
* **Core Library**: React `19.2.1` & TypeScript
* **State Management**: Immer (for immutable nested state updates), React Context API
* **Canvas Visualization**: React Flow `11.11.3`
* **Styling & UI**: Tailwind CSS, Radix UI (via Shadcn/ui presets), Lucide Icons
* **Backend Platform**: Supabase (PostgreSQL Database, Realtime Replication)

---

## 📁 Project Structure

```
├── supabase/                  # Supabase schema migrations
│   └── migrations/
│       └── supabase-schema.sql # Database schema for diagrams, panels, and connections
├── public/                    # Static assets
│   └── logo.png               # Custom designed brand logo asset
├── package.json               # Scripts and dependencies
├── tailwind.config.ts         # Tailwind styling configuration
├── src/
│   ├── app/                   # Next.js App Router (pages and layouts)
│   │   ├── log/               # Event logs page component
│   │   └── globals.css        # Main stylesheet with CSS tokens
│   ├── components/            # Reusable UI & custom canvas node elements
│   │   ├── custom-nodes/      # React Flow custom node renders
│   │   └── ui/                # Radix UI shadcn components
│   ├── contexts/              # Role and Diagram global state providers
│   ├── hooks/                 # Custom React hooks (toasts)
│   └── lib/                   # Types, initial data presets, and utilities
```

---

## ⚙️ Setup & Installation

### Prerequisites

* Node.js (v18+ recommended)
* npm or yarn

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jackysetiawan6/NextJS-Utilix.git
   cd NextJS-Utilix
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```
   *If environment variables are omitted, Utilix automatically falls back to local Mock Mode so you can still try all features without a backend!*

4. **Initialize Supabase Schema**:
   Run the SQL statements found in `supabase/migrations/supabase-schema.sql` inside your Supabase project's SQL editor to set up the required tables, indices, and realtime publication permissions.

5. **Run the local development server**:
   ```bash
   npm run dev
   ```
   The development server will spin up on **http://localhost:9002**.

6. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🔑 Authentication Passcodes

Elevate your user role inside the app's top bar or review them in the Switch Role dialog:
* **Supervisor**: `3333`
* **Operator**: `2222`
* **View-Only**: Switch role and click authenticate with an empty passcode field.
