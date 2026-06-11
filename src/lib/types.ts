import type { Node, Edge } from 'reactflow';

export type Role = 'Supervisor' | 'Operator' | 'ViewOnly';

export type BreakerStatus = 'Open' | 'Closed';
export type SelectorStatus = 'Manual' | 'Off' | 'Auto';
export type Status = 'Online' | 'Offline' | 'Maintenance';
export type UnitType =
  | 'Utility'
  | 'Generator'
  | 'LV Panel'
  | 'UPS'
  | 'PDU'
  | 'STS'
  | 'Server Rack'
  | 'Chiller'
  | 'AHU'
  | 'FCU'
  | 'Lamp';

export interface ConnectionSettings {
  hasSelector: boolean;
  hasBreaker: boolean;
  selectorLabels?: {
    Auto?: string;
    Manual?: string;
    Off?: string;
  };
  breakerLabels?: {
    Closed?: string;
    Open?: string;
  };
}

export interface ConnectionInfo {
  id: string; // Corresponds to the edge ID
  connectedPanelId: string;
  breakerStatus: BreakerStatus;
  selectorStatus: SelectorStatus;
  isPriority?: boolean;
  tag?: string;
  settings?: ConnectionSettings;
}

export interface PanelProperty {
  id: string;
  key: string;
  value: string;
}

export interface PanelData {
  label: string;
  isSource?: boolean;
  sourceGroup?: 'A' | 'B';
  unitType?: UnitType;
  status?: Status;
  sourceRoot?: 'A' | 'B' | null;
  properties: PanelProperty[];
  incoming: ConnectionInfo[];
  outgoing: ConnectionInfo[];
}

export type AppNode = Node<PanelData>;
export type AppEdge = Edge;

export interface LogEntry {
  id: string;
  timestamp: string;
  role: string;
  action: string;
  details: string;
}

export interface SimulationCase {
  id: string;
  diagramId: string;
  name: string;
  description?: string;
  state: {
    nodes: AppNode[];
    edges: AppEdge[];
  };
  createdAt?: string;
}
