'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect, useRef } from 'react';
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeRemoveChange,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  ReactFlowInstance,
  type EdgeRemoveChange,
} from 'reactflow';
import { produce } from 'immer';
import type { AppNode, AppEdge, PanelData, Status, ConnectionInfo, PanelProperty, UnitType, ConnectionSettings, BreakerStatus, SelectorStatus, SimulationCase } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRole } from './role-context';
import { useAuth } from './auth-context';
import { logEvent } from '@/lib/log-service';
import { getInitialNodesForSeeding, getDefaultProperties } from '@/lib/initial-data';
import { supabase } from '@/lib/supabase';

interface DiagramState {
  nodes: AppNode[];
  edges: AppEdge[];
}

type ContextMenuData = {
    id?: string;
    type: 'node' | 'edge' | 'pane';
    top: number;
    left: number;
} | null;

interface DiagramContextType {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  addPanel: () => string | undefined;
  addSourcePanel: (sourceGroup: 'A' | 'B') => string | undefined;
  updateNodeConfig: (nodeId: string, data: Partial<PanelData>) => void;
  addNodeProperty: (nodeId: string) => void;
  updateNodeProperty: (nodeId: string, propId: string, field: 'key' | 'value', value: string) => void;
  deleteNodeProperty: (nodeId: string, propId: string) => void;
  updateConnectionConfig: (
    nodeId: string,
    direction: 'incoming' | 'outgoing',
    connectionId: string,
    config: Partial<ConnectionInfo>
  ) => void;
  setIncomingPriority: (nodeId: string, connectionId: string) => void;
  panToNode: (nodeId: string) => void;
  getNode: (nodeId: string) => AppNode | undefined;
  selectedNode: AppNode | null;
  selectNode: (nodeId: string | null) => void;
  statusFilter: Record<Status, boolean>;
  setStatusFilter: (filter: Record<Status, boolean>) => void;
  isDirty: boolean;
  saveDiagram: () => void;
  discardChanges: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  collapsedNodes: Record<string, boolean>;
  toggleNodeCollapse: (nodeId: string) => void;
  isLoading: boolean;
  contextMenu: ContextMenuData;
  setContextMenu: (menu: ContextMenuData) => void;
  setLastClickPosition: (position: { x: number; y: number } | null) => void;
  layoutDiagram: () => void;
  copySelectedElements: () => void;
  pasteElements: () => void;
  clipboard: { nodes: AppNode[], edges: AppEdge[] } | null;
  onNodeDragStart: () => void;
  onNodeDragStop: () => void;
  cases: SimulationCase[];
  createCase: (name: string, description?: string) => Promise<void>;
  deleteCase: (caseId: string) => Promise<void>;
  loadCase: (caseId: string) => void;
}

const DiagramContext = createContext<DiagramContextType | null>(null);

const useUndoableState = (initialState: DiagramState) => {
  const [state, setState] = useState(initialState);
  const history = useRef<DiagramState[]>([initialState]);
  const historyIndex = useRef(0);
  const lastSavedStateIndex = useRef(0);
  const isUndoRedo = useRef(false);
  
  const setUndoableState = useCallback((updater: (draft: DiagramState) => void | DiagramState, isUndoable = true) => {
    if (isUndoRedo.current) return;
    
    const nextState = produce(history.current[historyIndex.current], draft => {
      return updater(draft as DiagramState);
    });

    if (nextState === history.current[historyIndex.current]) {
      return;
    }
    
    if (isUndoable) {
      const newHistory = history.current.slice(0, historyIndex.current + 1);
      newHistory.push(nextState);
      history.current = newHistory;
      historyIndex.current++;
    } else {
      // If not undoable, just update the current state in history
      history.current[historyIndex.current] = nextState;
      if (lastSavedStateIndex.current === historyIndex.current) {
        history.current[lastSavedStateIndex.current-1] = nextState;
      }
    }
    
    setState(nextState);
  }, []);

  const undo = useCallback(() => {
    if (historyIndex.current > 0) {
      isUndoRedo.current = true;
      historyIndex.current--;
      setState(history.current[historyIndex.current]);
      setTimeout(() => { isUndoRedo.current = false }, 0);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndex.current < history.current.length - 1) {
      isUndoRedo.current = true;
      historyIndex.current++;
      setState(history.current[historyIndex.current]);
      setTimeout(() => { isUndoRedo.current = false }, 0);
    }
  }, []);

  const save = useCallback(() => {
    lastSavedStateIndex.current = historyIndex.current;
    setState(s => ({...s})); 
  }, []);

  const resetToLastSave = useCallback(() => {
    if (history.current[lastSavedStateIndex.current]) {
      const lastSavedState = history.current[lastSavedStateIndex.current];
      const newHistory = history.current.slice(0, lastSavedStateIndex.current + 1);
      history.current = newHistory;
      historyIndex.current = lastSavedStateIndex.current;
      setState(lastSavedState);
    }
  }, []);
  
  const resetHistory = useCallback((newState: DiagramState) => {
    history.current = [newState];
    historyIndex.current = 0;
    lastSavedStateIndex.current = 0;
    setState(newState);
  }, []);

  const getChangesForSave = useCallback(() => {
    const current = history.current[historyIndex.current];
    const lastSaved = history.current[lastSavedStateIndex.current];

    const currentNodeIds = new Set(current.nodes.map(n => n.id));
    const lastSavedNodeIds = new Set(lastSaved.nodes.map(n => n.id));

    const deletedNodeIds = [...lastSavedNodeIds].filter(id => !currentNodeIds.has(id));
    
    const nodesToUpsert = current.nodes;
    
    return { nodesToUpsert, deletedNodeIds };
  }, []);

  const commitState = useCallback((newState: DiagramState) => {
    const newHistory = history.current.slice(0, historyIndex.current + 1);
    newHistory.push(newState);
    history.current = newHistory;
    historyIndex.current++;
    setState(newState);
  }, []);

  const isDirty = historyIndex.current !== lastSavedStateIndex.current;
  const canUndo = historyIndex.current > 0;
  const canRedo = historyIndex.current < history.current.length - 1;

  return { state, setUndoableState, undo, redo, save, resetToLastSave, resetHistory, isDirty, canUndo, canRedo, getChangesForSave, commitState, setState };
};

const getEffectiveBreakerStatus = (c: ConnectionInfo): BreakerStatus => {
  if (c.settings && c.settings.hasBreaker === false) {
    return 'Closed';
  }
  return c.breakerStatus;
};

const getEffectiveSelectorStatus = (c: ConnectionInfo): SelectorStatus => {
  if (c.settings && c.settings.hasSelector === false) {
    return 'Manual';
  }
  return c.selectorStatus;
};

const runElectricalSimulation = (nodes: AppNode[]): AppNode[] => {
  return produce(nodes, draftNodes => {
    let changed = true;
    let iterations = 0;
    const maxIterations = draftNodes.length * 2;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      const nodeMap = new Map(draftNodes.map(n => [n.id, n]));

      // Helper to check if power is flowing to a panel
      const isPowerFlowing = (panelId: string, visited: Set<string> = new Set()): boolean => {
        if (visited.has(panelId)) return false;
        visited.add(panelId);

        const panel = nodeMap.get(panelId);
        if (!panel) return false;

        if (panel.data.isSource) {
          return true; // Sources are always powered
        }
        
        if (panel.data.status === 'Maintenance') return false;

        for (const incoming of panel.data.incoming) {
          const effSelector = getEffectiveSelectorStatus(incoming);
          const effBreaker = getEffectiveBreakerStatus(incoming);
          if (effSelector !== 'Off' && effBreaker === 'Closed') {
            const sourcePanel = nodeMap.get(incoming.connectedPanelId);
            if (!sourcePanel) continue;
            
            const sourceOutgoing = sourcePanel.data.outgoing.find(c => c.id === incoming.id);
            if (!sourceOutgoing) continue;
            const sourceEffBreaker = getEffectiveBreakerStatus(sourceOutgoing);
            if (sourceEffBreaker === 'Open') continue;

            if (sourcePanel.data.isSource) {
               if (isPowerFlowing(sourcePanel.id, new Set(visited))) return true;
            } else {
               const sourceEffSelector = getEffectiveSelectorStatus(sourceOutgoing);
               if (sourceEffSelector !== 'Off' && isPowerFlowing(sourcePanel.id, new Set(visited))) {
                 return true;
               }
            }
          }
        }
        return false;
      }

      // Update statuses of all panels first
      draftNodes.forEach(node => {
        let newStatus: Status;
        if (node.data.isSource) {
          newStatus = node.data.outgoing.some(o => getEffectiveBreakerStatus(o) === 'Closed') ? 'Online' : 'Offline';
        } else if (node.data.status === 'Maintenance') {
          newStatus = 'Maintenance';
        } else {
          newStatus = isPowerFlowing(node.id) ? 'Online' : 'Offline';
        }

        if (node.data.status !== newStatus) {
          node.data.status = newStatus;
          changed = true;
        }
      });

      // Update auto incoming breakers
      draftNodes.forEach(node => {
        if (node.data.isSource || node.data.status === 'Maintenance') return;

        const hasManualClosed = node.data.incoming.some(c => {
          const effSelector = getEffectiveSelectorStatus(c);
          const effBreaker = getEffectiveBreakerStatus(c);
          return effSelector === 'Manual' && effBreaker === 'Closed';
        });
        
        const autoIncomers = node.data.incoming.filter(c => getEffectiveSelectorStatus(c) === 'Auto');
        if (autoIncomers.length === 0) return;

        if (hasManualClosed) {
          autoIncomers.forEach(c => {
            if (c.breakerStatus !== 'Open') {
              c.breakerStatus = 'Open';
              changed = true;
            }
          });
          return; 
        }

        const poweredSources = autoIncomers.filter(c => {
          const sourcePanel = nodeMap.get(c.connectedPanelId);
          if(!sourcePanel) return false;
          const sourceOutgoing = sourcePanel.data.outgoing.find(og => og.id === c.id);
          if (!sourceOutgoing) return false;
          const sourceEffBreaker = getEffectiveBreakerStatus(sourceOutgoing);
          if (sourceEffBreaker === 'Open') {
            return false;
          }
          if (sourcePanel.data.isSource) {
              return isPowerFlowing(c.connectedPanelId);
          }
          const sourceEffSelector = getEffectiveSelectorStatus(sourceOutgoing);
          if (sourceEffSelector === 'Off') {
              return false;
          }
          return isPowerFlowing(c.connectedPanelId);
        });

        if (poweredSources.length === 0) {
          autoIncomers.forEach(c => {
            if (c.breakerStatus !== 'Open') {
              c.breakerStatus = 'Open';
              changed = true;
            }
          });
        } else if (poweredSources.length === 1) {
          autoIncomers.forEach(c => {
            const targetStatus = (c.id === poweredSources[0].id) ? 'Closed' : 'Open';
            if (c.breakerStatus !== targetStatus) {
              c.breakerStatus = targetStatus;
              changed = true;
            }
          });
        } else { 
          const prioritySource = poweredSources.find(c => c.isPriority);
          const targetId = prioritySource ? prioritySource.id : poweredSources[0].id;
          autoIncomers.forEach(c => {
            const targetStatus = (c.id === targetId) ? 'Closed' : 'Open';
            if (c.breakerStatus !== targetStatus) {
              c.breakerStatus = targetStatus;
              changed = true;
            }
          });
        }
      });

      // Update auto outgoing breakers
      draftNodes.forEach(node => {
        const isOnline = node.data.isSource || node.data.status === 'Online';
        node.data.outgoing.forEach(c => {
          if (getEffectiveSelectorStatus(c) === 'Auto') {
            const targetStatus = isOnline ? 'Closed' : 'Open';
            if (c.breakerStatus !== targetStatus) {
              c.breakerStatus = targetStatus;
              changed = true;
            }
          }
        });
      });
    }
  });
};

const autoLayoutNodes = (nodes: AppNode[], edges: AppEdge[]): AppNode[] => {
  if (nodes.length === 0) return [];

  // 1. Build adjacency list and parent map
  const adj = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  nodes.forEach(n => {
    adj.set(n.id, []);
    parents.set(n.id, []);
  });

  edges.forEach(e => {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      parents.get(e.target)!.push(e.source);
    }
  });

  // 2. Identify top-most parents (roots) and children
  // Roots are nodes that have no parents (incoming edges) or are marked as source
  const roots = nodes.filter(n => n.data.isSource || parents.get(n.id)!.length === 0);
  const rootIds = new Set(roots.map(n => n.id));
  const children = nodes.filter(n => !rootIds.has(n.id));

  // 3. For each child, find its depth (longest path from any root) and primary root
  const depths = new Map<string, number>();
  const primaryRoots = new Map<string, string>();

  const calculateDepthAndRoot = (nodeId: string, currentDepth: number, rootId: string) => {
    const prevDepth = depths.get(nodeId) ?? -1;
    if (currentDepth > prevDepth) {
      depths.set(nodeId, currentDepth);
      primaryRoots.set(nodeId, rootId);
    }
    const childIds = adj.get(nodeId) || [];
    childIds.forEach(cId => {
      calculateDepthAndRoot(cId, currentDepth + 1, rootId);
    });
  };

  roots.forEach(root => {
    const childIds = adj.get(root.id) || [];
    childIds.forEach(cId => {
      calculateDepthAndRoot(cId, 1, root.id);
    });
  });

  // 4. Group children by (Primary Root, Depth)
  const groups = new Map<string, Map<number, string[]>>();
  children.forEach(child => {
    const pRoot = primaryRoots.get(child.id);
    const depth = depths.get(child.id);
    if (!pRoot || depth === undefined) return;

    if (!groups.has(pRoot)) {
      groups.set(pRoot, new Map<number, string[]>());
    }
    const depthMap = groups.get(pRoot)!;
    if (!depthMap.has(depth)) {
      depthMap.set(depth, []);
    }
    depthMap.get(depth)!.push(child.id);
  });

  // 5. Position nodes
  const nodeWidth = 224; // w-56 is 224px
  const xGap = 40;
  const yGap = 180;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return nodes.map(node => {
    if (rootIds.has(node.id)) {
      // Roots keep their manual positions!
      return node;
    }

    const pRoot = primaryRoots.get(node.id);
    const depth = depths.get(node.id);
    if (!pRoot || depth === undefined) {
      return node;
    }

    const rootNode = nodeMap.get(pRoot);
    if (!rootNode) return node;

    const depthMap = groups.get(pRoot)!;
    const group = depthMap.get(depth) || [];
    const index = group.indexOf(node.id);

    // Center the group horizontally below the root panel
    const rootWidth = rootNode.type === 'sourcePanel' ? 208 : 224;
    const totalWidth = group.length * nodeWidth + (group.length - 1) * xGap;
    const startX = rootNode.position.x + rootWidth / 2 - totalWidth / 2;
    const x = startX + index * (nodeWidth + xGap);
    
    // Calculate y relative to root node's y coordinate
    const y = rootNode.position.y + 100 + depth * yGap;

    return {
      ...node,
      position: { x, y }
    };
  });
};

export function DiagramProvider({ children }: { children: ReactNode }) {
  const { locationKeyword, user, isMockSession } = useAuth();
  const userId = user?.id;
  const DIAGRAM_ID = locationKeyword || 'main-diagram';

  const { 
    state, setUndoableState, 
    undo, redo, save, resetToLastSave, resetHistory, getChangesForSave,
    isDirty, canUndo, canRedo, commitState, setState
  } = useUndoableState({ nodes: [], edges: [] });

  const { nodes, edges } = state;
  const [isLoading, setIsLoading] = useState(true);
  const [cases, setCases] = useState<SimulationCase[]>([]);
  const { role, hasPermission } = useRole();

  const [lastClickPosition, setLastClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [clipboard, setClipboard] = useState<{ nodes: AppNode[], edges: AppEdge[] } | null>(null);

  // Helper to map DB columns into client-side React Flow Node & Edge structures
  const mapAndSetState = useCallback((panelsData: any[], connectionsData: any[]) => {
    const mappedNodes: AppNode[] = panelsData.map(p => {
      const incoming = connectionsData
        .filter(c => c.target_panel_id === p.id)
        .map(c => {
          let tag = c.tag || '';
          if (tag.includes('|||')) {
            const parts = tag.split('|||');
            tag = parts[1] || '';
          }
          return {
            id: c.id,
            connectedPanelId: c.source_panel_id,
            breakerStatus: c.breaker_status,
            selectorStatus: c.selector_status,
            isPriority: c.is_priority,
            tag: tag,
            settings: c.settings || { hasSelector: true, hasBreaker: true }
          };
        });

      const outgoing = connectionsData
        .filter(c => c.source_panel_id === p.id)
        .map(c => {
          let tag = c.tag || '';
          if (tag.includes('|||')) {
            const parts = tag.split('|||');
            tag = parts[0] || '';
          }
          return {
            id: c.id,
            connectedPanelId: c.target_panel_id,
            breakerStatus: c.breaker_status,
            selectorStatus: c.selector_status,
            isPriority: c.is_priority,
            tag: tag,
            settings: c.settings || { hasSelector: true, hasBreaker: true }
          };
        });

      return {
        id: p.id,
        type: p.is_source ? 'sourcePanel' : 'distributionPanel',
        position: { x: p.position_x, y: p.position_y },
        data: {
          label: p.label,
          isSource: p.is_source,
          sourceGroup: p.source_group as 'A' | 'B' | undefined,
          unitType: p.unit_type as any,
          status: p.status as any,
          properties: p.properties || [],
          incoming,
          outgoing
        }
      };
    });

    const mappedEdges: AppEdge[] = connectionsData.map(c => ({
      id: c.id,
      source: c.source_panel_id,
      target: c.target_panel_id,
      animated: false
    }));

    const calculatedNodes = runElectricalSimulation(mappedNodes);
    resetHistory({ nodes: calculatedNodes, edges: mappedEdges });
  }, [resetHistory]);

  // Fetch Diagram configuration, panels, and connections
  const fetchDiagramData = useCallback(async () => {
    if (!locationKeyword || !userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      if (isMockSession) {
        // Mock Mode: Load diagram nodes & edges from localStorage
        const stored = localStorage.getItem(`utilix_mock_diagram_${DIAGRAM_ID}`);
        if (stored) {
          const { nodes: mockNodes, edges: mockEdges } = JSON.parse(stored);
          const calculatedNodes = runElectricalSimulation(mockNodes);
          resetHistory({ nodes: calculatedNodes, edges: mockEdges });
        } else {
          // Seed the diagram for this keyword
          const initialNodes = getInitialNodesForSeeding();
          const mockEdges: AppEdge[] = [];
          initialNodes.forEach(node => {
            node.data.outgoing.forEach(out => {
              mockEdges.push({
                id: out.id,
                source: node.id,
                target: out.connectedPanelId,
                animated: false
              });
            });
          });
          const calculatedNodes = runElectricalSimulation(initialNodes);
          localStorage.setItem(
            `utilix_mock_diagram_${DIAGRAM_ID}`,
            JSON.stringify({ nodes: calculatedNodes, edges: mockEdges })
          );
          resetHistory({ nodes: calculatedNodes, edges: mockEdges });
        }
        
        // Load mock cases
        const storedCases = localStorage.getItem(`utilix_mock_cases_${DIAGRAM_ID}`);
        setCases(storedCases ? JSON.parse(storedCases) : []);
        setIsLoading(false);
        return;
      }

      // 1. Ensure the diagram configuration document exists
      let { data: diagram } = await supabase
        .from('diagrams')
        .select('*')
        .eq('id', DIAGRAM_ID)
        .maybeSingle();
        
      if (!diagram) {
        const { data: newDiagram } = await supabase
          .from('diagrams')
          .insert({ 
            id: DIAGRAM_ID, 
            name: `Diagram for ${DIAGRAM_ID}`, 
            owner_id: userId,
            members: { [userId]: 'owner' } 
          })
          .select()
          .single();
        diagram = newDiagram;
      }

      // 2. Fetch panels, connections, and cases
      const [panelsRes, connectionsRes, casesRes] = await Promise.all([
        supabase.from('panels').select('*').eq('diagram_id', DIAGRAM_ID),
        supabase.from('connections').select('*').eq('diagram_id', DIAGRAM_ID),
        supabase.from('simulation_cases').select('*').eq('diagram_id', DIAGRAM_ID)
      ]);

      const panelsData = panelsRes.data || [];
      const connectionsData = connectionsRes.data || [];
      const casesData = casesRes.data || [];

      if (casesData.length > 0) {
        setCases(casesData.map(c => ({
          id: c.id,
          diagramId: c.diagram_id,
          name: c.name,
          description: c.description || '',
          state: c.state,
          createdAt: c.created_at
        })));
      } else {
        setCases([]);
      }

      // 3. Seed data center presets if database is empty
      if (panelsData.length === 0) {
        const initialNodes = getInitialNodesForSeeding();
        const panelsToInsert = initialNodes.map(node => ({
          id: node.id,
          diagram_id: DIAGRAM_ID,
          label: node.data.label,
          unit_type: node.data.unitType || 'LV Panel',
          is_source: !!node.data.isSource,
          source_group: node.data.sourceGroup || null,
          status: node.data.status || 'Offline',
          properties: node.data.properties || [],
          position_x: node.position.x,
          position_y: node.position.y
        }));

        await supabase.from('panels').insert(panelsToInsert);

        // Seed connections as well
        const uniqueConnections = new Map<string, any>();
        initialNodes.forEach(node => {
          node.data.outgoing.forEach(conn => {
            const targetNode = initialNodes.find(n => n.id === conn.connectedPanelId);
            const incomingConn = targetNode?.data.incoming.find(c => c.id === conn.id);
            
            const outgoingTag = conn.tag || '';
            const incomingTag = incomingConn?.tag || '';
            const combinedTag = (outgoingTag || incomingTag) ? `${outgoingTag}|||${incomingTag}` : '';

            uniqueConnections.set(conn.id, {
              id: conn.id,
              diagram_id: DIAGRAM_ID,
              source_panel_id: node.id,
              target_panel_id: conn.connectedPanelId,
              breaker_status: conn.breakerStatus,
              selector_status: conn.selectorStatus,
              is_priority: !!incomingConn?.isPriority,
              tag: combinedTag,
              settings: conn.settings || { hasSelector: true, hasBreaker: true }
            });
          });
        });
        const connectionsToInsert = Array.from(uniqueConnections.values());
        if (connectionsToInsert.length > 0) {
          await supabase.from('connections').insert(connectionsToInsert);
        }

        // Re-query seeded nodes
        const [reFetchPanels, reFetchConnections] = await Promise.all([
          supabase.from('panels').select('*').eq('diagram_id', DIAGRAM_ID),
          supabase.from('connections').select('*').eq('diagram_id', DIAGRAM_ID)
        ]);

        const seededPanels = reFetchPanels.data || [];
        const seededConnections = reFetchConnections.data || [];

        mapAndSetState(seededPanels, seededConnections);
        setIsLoading(false);
        return;
      }

      mapAndSetState(panelsData, connectionsData);
    } catch (e) {
      console.error("Error fetching diagram data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [resetHistory, mapAndSetState, locationKeyword, userId, DIAGRAM_ID, isMockSession]);

  // Load from Supabase on mount and establish realtime subscriptions
  useEffect(() => {
    if (!locationKeyword || !userId) {
      resetHistory({ nodes: [], edges: [] });
      setCases([]);
      setSelectedNodeId(null);
      setIsLoading(false);
      return;
    }

    fetchDiagramData();

    if (isMockSession) {
      return;
    }

    // Subscribe to changes on public.panels, public.connections, and public.simulation_cases
    const realtimeChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'panels', filter: `diagram_id=eq.${DIAGRAM_ID}` },
        () => {
          fetchDiagramData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connections', filter: `diagram_id=eq.${DIAGRAM_ID}` },
        () => {
          fetchDiagramData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'simulation_cases', filter: `diagram_id=eq.${DIAGRAM_ID}` },
        () => {
          fetchDiagramData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [fetchDiagramData, locationKeyword, userId, DIAGRAM_ID, isMockSession]);

  const isDraggingRef = useRef(false);
  const dragStartNodesRef = useRef<AppNode[]>([]);

  const onNodeDragStart = useCallback(() => {
    isDraggingRef.current = true;
    dragStartNodesRef.current = JSON.parse(JSON.stringify(nodes));
  }, [nodes]);

  const onNodeDragStop = useCallback(() => {
    isDraggingRef.current = false;
    const nodesChanged = nodes.some(node => {
      const startNode = dragStartNodesRef.current.find(n => n.id === node.id);
      if (!startNode) return true;
      return startNode.position.x !== node.position.x || startNode.position.y !== node.position.y;
    });

    if (nodesChanged) {
      commitState(state);
    }
  }, [nodes, state, commitState]);

  const updateStateNonUndoable = useCallback((updater: (draft: DiagramState) => void | DiagramState) => {
    setState(prev => {
      const nextState = produce(prev, draft => {
        const result = updater(draft as DiagramState);
        let newNodes;
        if (result) {
          newNodes = result.nodes;
        } else {
          newNodes = (draft as DiagramState).nodes;
        }
        const finalNodes = runElectricalSimulation(newNodes as AppNode[]);
        if (result) {
          result.nodes = finalNodes;
          return result;
        } else {
          (draft as DiagramState).nodes = finalNodes;
        }
      });
      return nextState;
    });
  }, [setState]);

  const updateState = useCallback((updater: (draft: DiagramState) => void | DiagramState, isUndoable?: boolean) => {
    setUndoableState(draft => {
      const result = updater(draft as DiagramState);
      let newNodes;
      if (result) {
        newNodes = result.nodes;
      } else {
        newNodes = (draft as DiagramState).nodes;
      }
      const finalNodes = runElectricalSimulation(newNodes as AppNode[]);

      if(result) {
        result.nodes = finalNodes;
        return result;
      } else {
        (draft as DiagramState).nodes = finalNodes;
      }
    }, isUndoable);
  }, [setUndoableState]);
  
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData>(null);
  const { toast } = useToast();
  
  const [statusFilter, setStatusFilter] = useState<Record<Status, boolean>>({
    Online: true,
    Offline: true,
    Maintenance: true,
  });

  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    setContextMenu(null);
  }, []);

  const getNode = useCallback((nodeId: string) => nodes.find(n => n.id === nodeId), [nodes]);

  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    const isPositionChange = changes.some(c => c.type === 'position');
    
    if (isDraggingRef.current && isPositionChange) {
      updateStateNonUndoable(draft => {
        draft.nodes = applyNodeChanges(changes, draft.nodes as AppNode[]);
      });
    } else {
      const isUndoableChange = changes.some(c => c.type !== 'select' && c.type !== 'dimensions' && c.type !== 'reset');

      updateState(draft => {
        const removeChanges = changes.filter(c => c.type === 'remove') as NodeRemoveChange[];
        if (removeChanges.length > 0) {
            if (!hasPermission('Supervisor')) {
                toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only Supervisors can delete panels.' });
                return;
            }
            const removedNodeIds = new Set(removeChanges.map(c => c.id));
            
            // Find all edges connected to the removed nodes
            const edgesToRemove = draft.edges.filter(edge => removedNodeIds.has(edge.source) || removedNodeIds.has(edge.target));
            const edgesToRemoveIds = new Set(edgesToRemove.map(e => e.id));
            
            // Remove the edges from the main edges array
            draft.edges = draft.edges.filter(edge => !edgesToRemoveIds.has(edge.id));
            
            // Remove the corresponding connections from the data of the remaining nodes
            draft.nodes.forEach(node => {
                if (!removedNodeIds.has(node.id)) {
                    node.data.incoming = node.data.incoming.filter(conn => !removedNodeIds.has(conn.connectedPanelId));
                    node.data.outgoing = node.data.outgoing.filter(conn => !removedNodeIds.has(conn.connectedPanelId));
                }
            });
        }
        draft.nodes = applyNodeChanges(changes, draft.nodes as AppNode[]);
      }, isUndoableChange);
    }
  }, [updateState, updateStateNonUndoable, hasPermission, toast]);

  const onEdgesChange: OnEdgesChange = useCallback((changes: EdgeChange[]) => {
    const isUndoableChange = changes.some(c => c.type !== 'select' && c.type !== 'reset');

    updateState(draft => {
      const removeChanges = changes.filter(c => c.type === 'remove') as EdgeRemoveChange[];

      if (removeChanges.length > 0) {
        if (!hasPermission('Supervisor')) {
          toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only Supervisors can delete connections.' });
          return;
        }

        const removedEdges = removeChanges.map(c => (draft.edges as AppEdge[]).find(e => e.id === c.id)).filter(Boolean) as AppEdge[];
      
        for (const edge of removedEdges) {
          const sourceNode = draft.nodes.find(n => n.id === edge.source);
          const targetNode = draft.nodes.find(n => n.id === edge.target);
          if (sourceNode) {
            sourceNode.data.outgoing = sourceNode.data.outgoing.filter(c => c.id !== edge.id);
          }
          if (targetNode) {
            targetNode.data.incoming = targetNode.data.incoming.filter(c => c.id !== edge.id);
          }
          logEvent({ role, action: 'Delete Connection', details: `Deleted connection between ${sourceNode?.data.label} and ${targetNode?.data.label}` });
        }
      }

      draft.edges = applyEdgeChanges(changes, draft.edges as AppEdge[]);

    }, isUndoableChange);
  }, [updateState, hasPermission, toast, role]);

  const onConnect: OnConnect = useCallback((params: Connection) => {
    if (!hasPermission('Supervisor')) return;
    if (!params.source || !params.target) return;

    updateState(draft => {
      const newEdgeId = `edge-${params.source}-${params.target}-${Date.now()}`;
      
      const sourceNode = draft.nodes.find(n => n.id === params.source);
      const targetNode = draft.nodes.find(n => n.id === params.target);
      if (sourceNode && targetNode) {
        const defaultSettings = { hasSelector: true, hasBreaker: true };
        const newOutgoing: ConnectionInfo = { id: newEdgeId, connectedPanelId: targetNode.id, breakerStatus: 'Open', selectorStatus: 'Auto', isPriority: false, tag: '', settings: defaultSettings };
        const newIncoming: ConnectionInfo = { id: newEdgeId, connectedPanelId: sourceNode.id, breakerStatus: 'Open', selectorStatus: 'Auto', isPriority: false, tag: '', settings: defaultSettings };
        sourceNode.data.outgoing.push(newOutgoing);
        targetNode.data.incoming.push(newIncoming);
        
        const newEdge: AppEdge = {
          ...params,
          source: params.source!,
          target: params.target!,
          id: newEdgeId,
          animated: false,
        };
        draft.edges.push(newEdge);

        logEvent({ role, action: 'Create Connection', details: `Created connection between ${sourceNode.data.label} and ${targetNode.data.label}` });
      }
    });
  }, [updateState, hasPermission, role]);

  const addPanel = useCallback(() => {
    if (!hasPermission('Supervisor')) return;
    const newId = `panel-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    updateState(draft => {
      const position = lastClickPosition 
        ? { x: lastClickPosition.x, y: lastClickPosition.y }
        : { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 };

      const newNode: AppNode = {
        id: newId,
        type: 'distributionPanel',
        position: position,
        data: {
          label: `New Panel`,
          unitType: 'LV Panel',
          status: 'Offline',
          properties: getDefaultProperties('LV Panel'),
          incoming: [],
          outgoing: [],
        },
      };
      draft.nodes.push(newNode);
    });
    return newId;
  }, [updateState, hasPermission, lastClickPosition]);

  const addSourcePanel = useCallback((sourceGroup: 'A' | 'B') => {
    if (!hasPermission('Supervisor')) return;
    const newId = `panel-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    updateState(draft => {
        const defaultType = sourceGroup === 'A' ? 'Utility' : 'Generator';
        const newNode: AppNode = {
            id: newId,
            type: 'sourcePanel',
            position: { x: Math.random() * 400, y: Math.random() * 100 },
            data: {
                label: 'New Source',
                isSource: true,
                sourceGroup: sourceGroup,
                status: 'Offline',
                unitType: defaultType,
                properties: getDefaultProperties(defaultType),
                incoming: [],
                outgoing: [],
            },
        };
        draft.nodes.push(newNode);
    });
    return newId;
  }, [updateState, hasPermission]);

  const updateNodeConfig = useCallback((nodeId: string, data: Partial<PanelData>) => {
    updateState(draft => {
      const node = draft.nodes.find(n => n.id === nodeId);
      if (node) {
        Object.assign(node.data, data);
        if (data.status === 'Maintenance') {
          node.data.incoming.forEach(c => c.breakerStatus = 'Open');
          node.data.outgoing.forEach(c => c.breakerStatus = 'Open');
        }
      }
    });
  }, [updateState]);

  const addNodeProperty = useCallback((nodeId: string) => {
    updateState(draft => {
      const node = draft.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.properties) {
          node.data.properties = [];
        }
        const newProperty: PanelProperty = {
          id: `prop-${Date.now()}-${Math.random()}`,
          key: '',
          value: '',
        };
        node.data.properties.push(newProperty);
      }
    });
  }, [updateState]);

  const updateNodeProperty = useCallback((nodeId: string, propId: string, field: 'key' | 'value', value: string) => {
    updateState(draft => {
      const node = draft.nodes.find(n => n.id === nodeId);
      if (node?.data.properties) {
        const prop = node.data.properties.find(p => p.id === propId);
        if (prop) {
          prop[field] = value;
        }
      }
    });
  }, [updateState]);

  const deleteNodeProperty = useCallback((nodeId: string, propId: string) => {
    updateState(draft => {
      const node = draft.nodes.find(n => n.id === nodeId);
      if (node?.data.properties) {
        const propIndex = node.data.properties.findIndex(p => p.id === propId);
        if (propIndex > -1) {
          node.data.properties.splice(propIndex, 1);
        }
      }
    });
  }, [updateState]);

  const updateConnectionConfig = useCallback((
    nodeId: string,
    direction: 'incoming' | 'outgoing',
    connectionId: string,
    config: Partial<ConnectionInfo>
  ) => {
    updateState(draft => {
      const node = draft.nodes.find(n => n.id === nodeId);
      if (node && direction === 'incoming' && config.breakerStatus === 'Closed') {
        const connectionToClose = node.data.incoming.find(c => c.id === connectionId);
        const effSelector = connectionToClose ? getEffectiveSelectorStatus(connectionToClose) : 'Manual';
        if (effSelector === 'Manual') {
          const otherClosedBreaker = node.data.incoming.find(
            c => c.id !== connectionId && getEffectiveBreakerStatus(c) === 'Closed'
          );
          if (otherClosedBreaker) {
            toast({
              variant: 'destructive',
              title: 'Interlock Violation',
              description: `Cannot close breaker. Panel ${
                getNode(otherClosedBreaker.connectedPanelId)?.data.label
              } is already providing power.`,
            });
            logEvent({
              role,
              action: 'Interlock Violation',
              details: `Panel: ${node.data.label}, attempted to close breaker from ${
                connectionToClose ? (getNode(connectionToClose.connectedPanelId)?.data.label || 'Unknown') : 'Unknown'
              }`,
            });
            return;
          }
        }
      }

      // Enforce: Selector Off -> Breaker Open if both enabled
      const currentConn = node?.data[direction].find(c => c.id === connectionId);
      const settings = config.settings !== undefined ? config.settings : currentConn?.settings;
      const finalConfig = { ...config };
      const hasSelector = settings ? settings.hasSelector : true;
      const hasBreaker = settings ? settings.hasBreaker : true;
      const isSelectorOff = finalConfig.selectorStatus === 'Off' || (finalConfig.selectorStatus === undefined && currentConn?.selectorStatus === 'Off');

      if (hasSelector && hasBreaker && isSelectorOff) {
        finalConfig.breakerStatus = 'Open';
      }

      const { tag, ...otherConfig } = finalConfig;

      // Sync across all connections in the diagram
      draft.nodes.forEach(n => {
        n.data.incoming.forEach(c => {
          if (c.id === connectionId) {
            Object.assign(c, otherConfig);
            if (n.id === nodeId && direction === 'incoming' && tag !== undefined) {
              c.tag = tag;
            }
            if (c.settings?.hasSelector && c.settings?.hasBreaker && c.selectorStatus === 'Off') {
              c.breakerStatus = 'Open';
            }
          }
        });
        n.data.outgoing.forEach(c => {
          if (c.id === connectionId) {
            Object.assign(c, otherConfig);
            if (n.id === nodeId && direction === 'outgoing' && tag !== undefined) {
              c.tag = tag;
            }
            if (c.settings?.hasSelector && c.settings?.hasBreaker && c.selectorStatus === 'Off') {
              c.breakerStatus = 'Open';
            }
          }
        });
      });
    });
  }, [updateState, toast, role, getNode]);

  const setIncomingPriority = useCallback((nodeId: string, connectionId: string) => {
    updateState(draft => {
      const node = draft.nodes.find(n => n.id === nodeId);
      if (node) {
        const currentlyPriority = node.data.incoming.find(c => c.isPriority);
        if (currentlyPriority?.id === connectionId) {
            // Unset priority if clicking the same one
            node.data.incoming.forEach(c => c.isPriority = false);
        } else {
            // Set new priority
            node.data.incoming.forEach(conn => {
                conn.isPriority = conn.id === connectionId;
            });
        }
      }
    })
  }, [updateState]);

  const toggleNodeCollapse = (nodeId: string) => {
    setCollapsedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
    const node = getNode(nodeId);
    if(node) {
        logEvent({ role, action: 'Toggle Collapse', details: `Panel: ${node.data.label}, New state: ${!collapsedNodes[nodeId] ? 'Collapsed' : 'Expanded'}` });
    }
  };

  const panToNode = (nodeId: string) => {
    if (!reactFlowInstance) return;
    
    const edgeMap = new Map(edges.map(e => [e.target, e.source]));
    const parentIds: string[] = [];
    let currentNodeId: string | undefined = nodeId;
    while(currentNodeId) {
      const parentId = edgeMap.get(currentNodeId);
      if (parentId) {
        parentIds.push(parentId);
        currentNodeId = parentId;
      } else {
        currentNodeId = undefined;
      }
    }

    setCollapsedNodes(prev => {
      const newCollapsed = { ...prev };
      parentIds.forEach(id => {
        if(newCollapsed[id]) delete newCollapsed[id];
      });
      return newCollapsed;
    });

    setTimeout(() => {
        const node = reactFlowInstance.getNode(nodeId);
        if (node) {
            reactFlowInstance.setCenter(node.position.x + (node.width ?? 0) / 2, node.position.y + (node.height ?? 0) / 2, { zoom: 1.2, duration: 800 });
            selectNode(nodeId);
        }
    }, 100);
  };

  const saveDiagram = async () => {
    setIsLoading(true);
    try {
      if (isMockSession) {
        // Save to localStorage in mock mode
        localStorage.setItem(`utilix_mock_diagram_${DIAGRAM_ID}`, JSON.stringify({ nodes, edges }));
        save();
        toast({ title: 'Diagram Saved (Mock)', description: 'Your changes have been saved to local storage.' });
        logEvent({ role, action: 'Save Diagram', details: 'All changes saved to local storage.' });
        setIsLoading(false);
        return;
      }

      const { nodesToUpsert, deletedNodeIds } = getChangesForSave();

      // 1. Delete panels from Database (will cascade delete connections)
      if (deletedNodeIds.length > 0) {
        const { error: deletePanelsError } = await supabase
          .from('panels')
          .delete()
          .in('id', deletedNodeIds);
        if (deletePanelsError) throw deletePanelsError;
        
        deletedNodeIds.forEach(id => {
          logEvent({ role, action: 'Delete Panel', details: `Deleted panel with ID: ${id}` });
        });
      }

      // 2. Map nodes to SQL Panels Table
      const panelsToUpsert = nodesToUpsert.map(node => ({
        id: node.id,
        diagram_id: DIAGRAM_ID,
        label: node.data.label,
        unit_type: node.data.unitType || 'LV Panel',
        is_source: !!node.data.isSource,
        source_group: node.data.sourceGroup || null,
        status: node.data.status || 'Offline',
        properties: node.data.properties || [],
        position_x: node.position.x,
        position_y: node.position.y
      }));

      // 3. Extract unique connections to prevent double inserting link edges
      const uniqueConnections = new Map<string, any>();
      nodesToUpsert.forEach(node => {
        node.data.outgoing.forEach(conn => {
          const targetNode = nodesToUpsert.find(n => n.id === conn.connectedPanelId);
          const incomingConn = targetNode?.data.incoming.find(c => c.id === conn.id);
          
          const outgoingTag = conn.tag || '';
          const incomingTag = incomingConn?.tag || '';
          const combinedTag = (outgoingTag || incomingTag) ? `${outgoingTag}|||${incomingTag}` : '';

          uniqueConnections.set(conn.id, {
            id: conn.id,
            diagram_id: DIAGRAM_ID,
            source_panel_id: node.id,
            target_panel_id: conn.connectedPanelId,
            breaker_status: conn.breakerStatus,
            selector_status: conn.selectorStatus,
            is_priority: !!incomingConn?.isPriority,
            tag: combinedTag,
            settings: conn.settings || { hasSelector: true, hasBreaker: true }
          });
        });
      });
      const connectionsToUpsert = Array.from(uniqueConnections.values());

      // 4. Perform upserts for panels
      if (panelsToUpsert.length > 0) {
        const { error: upsertPanelsError } = await supabase
          .from('panels')
          .upsert(panelsToUpsert);
        if (upsertPanelsError) throw upsertPanelsError;
      }

      // 5. Delete removed connections
      const currentConnectionIds = connectionsToUpsert.map(c => c.id);
      if (currentConnectionIds.length > 0) {
        const { error: deleteConnectionsError } = await supabase
          .from('connections')
          .delete()
          .eq('diagram_id', DIAGRAM_ID)
          .not('id', 'in', `(${currentConnectionIds.join(',')})`);
        if (deleteConnectionsError) throw deleteConnectionsError;
      } else {
        const { error: deleteConnectionsError } = await supabase
          .from('connections')
          .delete()
          .eq('diagram_id', DIAGRAM_ID);
        if (deleteConnectionsError) throw deleteConnectionsError;
      }

      // 6. Upsert remaining connections
      if (connectionsToUpsert.length > 0) {
        const { error: upsertConnectionsError } = await supabase
          .from('connections')
          .upsert(connectionsToUpsert);
        if (upsertConnectionsError) throw upsertConnectionsError;
      }

      save();
      toast({ title: 'Diagram Saved', description: 'Your changes have been saved to Supabase.' });
      logEvent({ role, action: 'Save Diagram', details: 'All changes saved.' });
    } catch (error: any) {
      console.error("Failed to save diagram:", error);
      toast({ variant: 'destructive', title: 'Error Saving', description: error.message || 'Failed to save changes to the database.' });
    } finally {
      setIsLoading(false);
    }
  };

  const discardChanges = () => {
    resetToLastSave();
    toast({ title: 'Changes Discarded', description: 'Reverted to the last saved state.' });
    logEvent({ role, action: 'Discard Changes', details: 'All unsaved changes discarded.' });
  };
  
  const handleUndo = () => {
      undo();
      logEvent({ role, action: 'Undo', details: 'Reverted last change.' });
  }

  const handleRedo = () => {
      redo();
      logEvent({ role, action: 'Redo', details: 'Re-applied last undone change.' });
  }

  const getNodeRoot = useCallback((nodeId: string, currentNodes: AppNode[], visited: Set<string> = new Set()): 'A' | 'B' | null => {
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);
  
    const nodeMap = new Map(currentNodes.map(n => [n.id, n]));
    const node = nodeMap.get(nodeId);
  
    if (node?.data.isSource) {
      return node.data.sourceGroup ?? null;
    }
    
    if (!node || node.data.status === 'Maintenance' || node.data.status === 'Offline') return null;
    
    if (!node.data.incoming || node.data.incoming.length === 0) return null;

    for (const incomingConn of node.data.incoming) {
        if (incomingConn.selectorStatus !== 'Off' && incomingConn.breakerStatus === 'Closed') {
            const parentNode = nodeMap.get(incomingConn.connectedPanelId);
            if (!parentNode) continue;
            
            const parentOutgoingConn = parentNode.data.outgoing.find(c => c.id === incomingConn.id);
            if (!parentOutgoingConn || parentOutgoingConn.breakerStatus === 'Open') continue;

            if (parentNode.data.isSource === false && parentOutgoingConn.selectorStatus === 'Off') {
              continue;
            }

            const parentRoot = getNodeRoot(parentNode.id, currentNodes, new Set(visited));
            if (parentRoot) {
                return parentRoot;
            }
        }
    }
    return null;
  }, []);

  const styledEdges = useMemo(() => {
    return edges.map(edge => {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!targetNode) return edge;

        const incomingConn = targetNode.data.incoming.find(c => c.id === edge.id);
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode) return edge;
        const outgoingConn = sourceNode.data.outgoing.find(c => c.id === edge.id);

        const label = (outgoingConn?.tag && incomingConn?.tag && outgoingConn.tag !== incomingConn.tag)
          ? `${outgoingConn.tag} → ${incomingConn.tag}`
          : (outgoingConn?.tag || incomingConn?.tag || '');

        if (targetNode.data.status === 'Online' && incomingConn?.breakerStatus === 'Closed' && outgoingConn?.breakerStatus === 'Closed') {
            const root = getNodeRoot(edge.target, nodes);
            if (root) {
                return {
                    ...edge,
                    label,
                    animated: true,
                    style: { ...edge.style, stroke: root === 'A' ? 'hsl(var(--source-a-color))' : 'hsl(var(--source-b-color))' },
                };
            }
        }
        
        return {
            ...edge,
            label,
            animated: false,
            style: { ...edge.style, stroke: 'hsl(var(--muted-foreground))' },
        };
    });
  }, [nodes, edges, getNodeRoot]);

  const layoutDiagram = useCallback(() => {
    if (!hasPermission('Supervisor')) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only Supervisors can auto-layout panels.' });
      return;
    }
    updateState(draft => {
      draft.nodes = autoLayoutNodes(draft.nodes, draft.edges);
    });
    logEvent({ role, action: 'Auto Layout', details: 'Triggered automatic node positioning.' });
    toast({ title: 'Layout Updated', description: 'Downstream nodes aligned relative to their manual root coordinates.' });
  }, [updateState, hasPermission, role, toast]);

  const copySelectedElements = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    // Filter edges to only include those that connect selected nodes or are explicitly selected
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const edgesToCopy = edges.filter(edge => 
      edge.selected || (selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target))
    );

    setClipboard({
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(edgesToCopy))
    });

    toast({
      title: "Copied to Clipboard",
      description: `Copied ${selectedNodes.length} panel(s) and ${edgesToCopy.length} connection(s).`
    });
  }, [nodes, edges, toast]);

  const pasteElements = useCallback(() => {
    if (!clipboard || clipboard.nodes.length === 0) return;
    if (!hasPermission('Supervisor')) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only Supervisors can paste elements.' });
      return;
    }

    updateState(draft => {
      const idMap = new Map<string, string>();

      // Calculate the bounding box center of the copied nodes
      const minX = Math.min(...clipboard.nodes.map(n => n.position.x));
      const minY = Math.min(...clipboard.nodes.map(n => n.position.y));
      const maxX = Math.max(...clipboard.nodes.map(n => n.position.x));
      const maxY = Math.max(...clipboard.nodes.map(n => n.position.y));
      
      const width = maxX - minX;
      const height = maxY - minY;
      
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;

      // If we have a last click position, paste centered around it. Otherwise, use an offset.
      let targetX = centerX + 50;
      let targetY = centerY + 50;

      if (lastClickPosition) {
        targetX = lastClickPosition.x;
        targetY = lastClickPosition.y;
      }

      const offsetX = targetX - centerX;
      const offsetY = targetY - centerY;

      // Unselect existing nodes
      draft.nodes.forEach(n => n.selected = false);
      draft.edges.forEach(e => e.selected = false);

      // 1. Clone and add nodes
      clipboard.nodes.forEach((node, index) => {
        const newId = `panel-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;
        idMap.set(node.id, newId);

        const newPosition = {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY
        };

        const newProperties = node.data.properties.map(p => ({
          ...p,
          id: `prop-${Date.now()}-${Math.random()}`
        }));

        const newNode: AppNode = {
          ...node,
          id: newId,
          selected: true, // Select the pasted nodes
          position: newPosition,
          data: {
            ...node.data,
            label: `${node.data.label} (Copy)`,
            properties: newProperties,
            incoming: [], // Rebuilt below
            outgoing: []  // Rebuilt below
          }
        };

        draft.nodes.push(newNode);
      });

      // 2. Clone and add edges
      clipboard.edges.forEach((edge, index) => {
        const newSourceId = idMap.get(edge.source);
        const newTargetId = idMap.get(edge.target);

        // Only paste edge if both source and target nodes are in the clipboard
        if (newSourceId && newTargetId) {
          const newEdgeId = `edge-${newSourceId}-${newTargetId}-${Date.now()}-${index}`;
          const newEdge: AppEdge = {
            ...edge,
            id: newEdgeId,
            source: newSourceId,
            target: newTargetId,
            selected: true
          };

          // Update connection arrays on the nodes in the draft
          const sourceNode = draft.nodes.find(n => n.id === newSourceId);
          const targetNode = draft.nodes.find(n => n.id === newTargetId);

          if (sourceNode && targetNode) {
            const originalSourceNode = clipboard.nodes.find(n => n.id === edge.source);
            const originalTargetNode = clipboard.nodes.find(n => n.id === edge.target);

            const origOutgoing = originalSourceNode?.data.outgoing.find(c => c.id === edge.id);
            const origIncoming = originalTargetNode?.data.incoming.find(c => c.id === edge.id);

            sourceNode.data.outgoing.push({
              id: newEdgeId,
              connectedPanelId: newTargetId,
              breakerStatus: origOutgoing?.breakerStatus || 'Open',
              selectorStatus: origOutgoing?.selectorStatus || 'Auto',
              tag: origOutgoing?.tag || ''
            });

            targetNode.data.incoming.push({
              id: newEdgeId,
              connectedPanelId: newSourceId,
              breakerStatus: origIncoming?.breakerStatus || 'Open',
              selectorStatus: origIncoming?.selectorStatus || 'Auto',
              isPriority: origIncoming?.isPriority || false,
              tag: origIncoming?.tag || ''
            });

            draft.edges.push(newEdge);
          }
        }
      });
      
      logEvent({ role, action: 'Paste Elements', details: `Pasted ${clipboard.nodes.length} panels and ${clipboard.edges.length} connections.` });
    });

    toast({
      title: "Pasted Elements",
      description: `Successfully pasted ${clipboard.nodes.length} element(s).`
    });
  }, [clipboard, updateState, hasPermission, role, toast, lastClickPosition]);

  const createCase = useCallback(async (name: string, description?: string) => {
    if (!hasPermission('Supervisor')) return;
    const newCase: SimulationCase = {
      id: `case-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      diagramId: DIAGRAM_ID,
      name,
      description: description || '',
      state: { nodes, edges },
      createdAt: new Date().toISOString()
    };

    if (isMockSession) {
      const updatedCases = [...cases, newCase];
      localStorage.setItem(`utilix_mock_cases_${DIAGRAM_ID}`, JSON.stringify(updatedCases));
      setCases(updatedCases);
      toast({ title: 'Case Created', description: `Simulation case "${name}" created locally.` });
    } else {
      try {
        const { error } = await supabase
          .from('simulation_cases')
          .insert({
            id: newCase.id,
            diagram_id: DIAGRAM_ID,
            name: newCase.name,
            description: newCase.description,
            state: newCase.state
          });
        if (error) throw error;
        setCases(prev => [...prev, newCase]);
        toast({ title: 'Case Created', description: `Simulation case "${name}" saved to database.` });
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create simulation case.' });
      }
    }
    logEvent({ role, action: 'Create Simulation Case', details: `Created case: ${name}` });
  }, [nodes, edges, DIAGRAM_ID, isMockSession, cases, hasPermission, role, toast]);

  const deleteCase = useCallback(async (caseId: string) => {
    if (!hasPermission('Supervisor')) return;
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;

    if (isMockSession) {
      const updatedCases = cases.filter(c => c.id !== caseId);
      localStorage.setItem(`utilix_mock_cases_${DIAGRAM_ID}`, JSON.stringify(updatedCases));
      setCases(updatedCases);
      toast({ title: 'Case Removed', description: `Case "${targetCase.name}" removed.` });
    } else {
      try {
        const { error } = await supabase
          .from('simulation_cases')
          .delete()
          .eq('id', caseId);
        if (error) throw error;
        setCases(prev => prev.filter(c => c.id !== caseId));
        toast({ title: 'Case Removed', description: `Case "${targetCase.name}" removed.` });
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete case.' });
      }
    }
    logEvent({ role, action: 'Delete Simulation Case', details: `Deleted case: ${targetCase.name}` });
  }, [cases, DIAGRAM_ID, isMockSession, hasPermission, role, toast]);

  const loadCase = useCallback((caseId: string) => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;

    updateState(draft => {
      draft.nodes = JSON.parse(JSON.stringify(targetCase.state.nodes));
      draft.edges = JSON.parse(JSON.stringify(targetCase.state.edges));
    });

    toast({ title: 'Case Loaded', description: `Loaded simulation case "${targetCase.name}". Diagram is now in this state (unsaved).` });
    logEvent({ role, action: 'Load Simulation Case', details: `Loaded case: ${targetCase.name}` });
  }, [cases, updateState, toast, role]);

  return (
    <DiagramContext.Provider value={{
      nodes,
      edges: styledEdges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      reactFlowInstance,
      setReactFlowInstance,
      addPanel,
      addSourcePanel,
      updateNodeConfig,
      addNodeProperty,
      updateNodeProperty,
      deleteNodeProperty,
      updateConnectionConfig,
      setIncomingPriority,
      panToNode,
      getNode,
      selectedNode,
      selectNode,
      statusFilter,
      setStatusFilter,
      isDirty,
      saveDiagram,
      discardChanges,
      undo: handleUndo,
      redo: handleRedo,
      canUndo,
      canRedo,
      collapsedNodes,
      toggleNodeCollapse,
      isLoading,
      contextMenu,
      setContextMenu,
      setLastClickPosition,
      layoutDiagram,
      copySelectedElements,
      pasteElements,
      clipboard,
      onNodeDragStart,
      onNodeDragStop,
      cases,
      createCase,
      deleteCase,
      loadCase,
    }}>
      {children}
    </DiagramContext.Provider>
  );
}

export function useDiagram() {
  const context = useContext(DiagramContext);
  if (!context) {
    throw new Error('useDiagram must be used within a DiagramProvider');
  }
  return context;
}
