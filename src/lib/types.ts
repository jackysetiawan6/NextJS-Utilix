import type { Node, Edge } from 'reactflow';

export type Role = 'Supervisor' | 'Operator' | 'ViewOnly';

export type BreakerStatus = 'Open' | 'Closed';
export type SelectorStatus = 'Manual' | 'Off' | 'Auto';
export type Status = 'Online' | 'Offline' | 'Maintenance';
export type PanelType = 'LV Panel' | 'UPS';

export interface ConnectionInfo {
  id: string; // Corresponds to the edge ID
  connectedPanelId: string;
  breakerStatus: BreakerStatus;
  selectorStatus: SelectorStatus;
  isPriority?: boolean;
  tag?: string;
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
  panelType?: PanelType;
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
