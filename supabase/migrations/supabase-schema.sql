-- ==========================================
-- Utilix Supabase PostgreSQL Database Schema
-- ==========================================

-- 1. Diagrams Table
-- Stores top-level diagram configurations, user roles, and owner info.
CREATE TABLE IF NOT EXISTS diagrams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  members JSONB NOT NULL DEFAULT '{}'::jsonb, -- Map of user UIDs to their role (e.g. {"guest": "owner"})
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Panels Table
-- Represents individual electrical nodes / equipment (LV Panels, UPS, Server Racks, Chillers, etc.).
CREATE TABLE IF NOT EXISTS panels (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  unit_type TEXT NOT NULL, -- e.g., 'LV Panel', 'UPS', 'Server Rack', etc.
  is_source BOOLEAN DEFAULT FALSE,
  source_group TEXT, -- 'A', 'B', or NULL
  status TEXT NOT NULL CHECK (status IN ('Online', 'Offline', 'Maintenance')),
  properties JSONB NOT NULL DEFAULT '[]'::jsonb, -- Custom key-value properties: [{"id": "...", "key": "...", "value": "..."}]
  position_x DOUBLE PRECISION NOT NULL,
  position_y DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Connections Table
-- Represents the electrical wiring/edges connecting source panels to target panels.
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  source_panel_id TEXT NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
  target_panel_id TEXT NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
  breaker_status TEXT NOT NULL DEFAULT 'Open' CHECK (breaker_status IN ('Open', 'Closed')),
  selector_status TEXT NOT NULL DEFAULT 'Auto' CHECK (selector_status IN ('Auto', 'Manual', 'Off')),
  is_priority BOOLEAN DEFAULT FALSE,
  tag TEXT,
  settings JSONB NOT NULL DEFAULT '{"hasSelector": true, "hasBreaker": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensures we don't have duplicate links between the same panels
  CONSTRAINT unique_source_target UNIQUE (source_panel_id, target_panel_id)
);

-- 4. Event Logs Table
-- Stores detailed event logs of operations and system updates.
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  diagram_id TEXT REFERENCES diagrams(id) ON DELETE CASCADE
);

-- ==========================================
-- Performance Indexes
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_panels_diagram_id ON panels(diagram_id);
CREATE INDEX IF NOT EXISTS idx_connections_diagram_id ON connections(diagram_id);
CREATE INDEX IF NOT EXISTS idx_connections_source_panel ON connections(source_panel_id);
CREATE INDEX IF NOT EXISTS idx_connections_target_panel ON connections(target_panel_id);
CREATE INDEX IF NOT EXISTS idx_logs_diagram_id ON logs(diagram_id);

-- ==========================================
-- Enable Row Level Security (RLS)
-- ==========================================
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Security Policies
-- ==========================================

-- 1. Diagrams Policy
-- Users can only see/modify diagrams they own.
CREATE POLICY diagrams_owner_policy ON diagrams
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 2. Panels Policy
-- Users can only see/modify panels belonging to their diagrams.
CREATE POLICY panels_owner_policy ON panels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diagrams
      WHERE diagrams.id = panels.diagram_id
      AND diagrams.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM diagrams
      WHERE diagrams.id = panels.diagram_id
      AND diagrams.owner_id = auth.uid()
    )
  );

-- 3. Connections Policy
-- Users can only see/modify connections belonging to their diagrams.
CREATE POLICY connections_owner_policy ON connections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diagrams
      WHERE diagrams.id = connections.diagram_id
      AND diagrams.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM diagrams
      WHERE diagrams.id = connections.diagram_id
      AND diagrams.owner_id = auth.uid()
    )
  );

-- 4. Logs Policy
-- Users can only see/modify logs belonging to their diagrams.
CREATE POLICY logs_owner_policy ON logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diagrams
      WHERE diagrams.id = logs.diagram_id
      AND diagrams.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM diagrams
      WHERE diagrams.id = logs.diagram_id
      AND diagrams.owner_id = auth.uid()
    )
  );

-- 5. Simulation Cases Table
-- Stores saved simulation scenarios/cases of nodes and edges state.
CREATE TABLE IF NOT EXISTS simulation_cases (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_cases_diagram_id ON simulation_cases(diagram_id);

ALTER TABLE simulation_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY cases_owner_policy ON simulation_cases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diagrams
      WHERE diagrams.id = simulation_cases.diagram_id
      AND diagrams.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM diagrams
      WHERE diagrams.id = simulation_cases.diagram_id
      AND diagrams.owner_id = auth.uid()
    )
  );

-- ==========================================
-- Enable Supabase Realtime Replication
-- ==========================================
-- Adds the tables to the default 'supabase_realtime' publication to allow clients
-- to subscribe to live INSERT, UPDATE, and DELETE events.
ALTER PUBLICATION supabase_realtime ADD TABLE panels;
ALTER PUBLICATION supabase_realtime ADD TABLE connections;
ALTER PUBLICATION supabase_realtime ADD TABLE logs;
ALTER PUBLICATION supabase_realtime ADD TABLE simulation_cases;
