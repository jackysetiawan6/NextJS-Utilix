# Utilix

Utilix is an interactive single-line diagram (SLD) and electrical power distribution management dashboard designed for modern data centers. It allows supervisors and operators to visualize, configure, and monitor electrical trees, breakers, selectors, and panels in real-time.

---

## 🚀 Key Features

* **Interactive Single-Line Diagram (SLD)**:
  * Visualizes the electrical tree using a zoomable, pannable canvas (powered by **React Flow**).
  * Collapsible downstream distribution tree nodes to reduce visual clutter on complex canvas layouts.
  * Distinct themes and styling for primary electrical sources (Group A, Group B, and Neutral/Main Sources).
* **Automated Electrical Power Flow Simulation**:
  * Evaluates electrical flow using a **fixed-point iterative convergence algorithm**, resolving panel statuses (`Online`, `Offline`, `Maintenance`) correctly regardless of rendering order.
  * Models **Automatic Transfer Switch (ATS)** behavior by automatically switching and closing/opening incoming breakers based on upstream availability and priority.
  * Automates outgoing feeder breakers in `Auto` mode to close/open dynamically based on parent panel status.
  * Enforces **interlock rules** to prevent accidental short-circuits (e.g., locking out multiple manual closed feeds on the same panel).
* **Role-Based Access Control (RBAC)**:
  * Switch between roles via a passcode-protected switcher:
    * **Supervisor** (Passcode: `3333`): Full permissions (create, delete, and configure panels/connections; edit custom property fields; topological auto-layout).
    * **Operator** (Passcode: `2222`): Operational permissions (control manual breakers and select transfer priority).
    * **View-Only** (Leave passcode blank): View-only canvas observation.
  * Passcode requirements are listed directly in the switch dialog for easy onboarding.
* **Database Persistence & Realtime Sync**:
  * Integrates with **Supabase (PostgreSQL)** to synchronize diagram layouts, panel detail properties, and connection states across all clients in real-time.
  * Seeds database automatically with a fully laid-out 13-node, 13-edge data center power topology preset (utility lines, generators, ATSs, UPSs, and LVDPs) if the diagram is empty.
  * **Mock Mode Indicator**: Shows a visual amber badge in the header if the application is running in mock/offline mode (due to missing database environment variables) with a helpful tooltip.
* **Performance-optimized Undo/Redo**:
  * Supports complete Undo and Redo states (`Ctrl+Z` / `Ctrl+Y` or header buttons) for layout and panel modifications.
  * Optimized drag performance: groups continuous drag movements into a single transaction committed to history only on release, preventing undo history bloat.
* **In-App System Guide**:
  * Access a detailed helper manual right from the header (Help icon) describing permissions, transfer switch priority logic, safety interlocks, and keyboard shortcuts.
* **Persistent Event Logging**:
  * Records detailed operations (breaker state changes, role authentication, connection creations, errors, etc.).
  * Dedicated Log viewer page with live search filters for Roles, Actions, and details.
* **Global Search Panel**:
  * Quick panel lookup using `Ctrl+K` / `Cmd+K`.
  * Filters and matches panels dynamically by name or location details (including sources and distribution boards) and pans/centers the viewport to the selected node.
  * Custom icons corresponding to the panel types (Zap for Group A, Battery for Group B, Server for UPS, Circuit for LVDP).

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

1. **Clone the repository and navigate to the project root**:
   ```bash
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
   The development server will spin up on **http://localhost:9002** (as defined in `package.json`).

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
