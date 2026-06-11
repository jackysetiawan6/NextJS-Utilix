import type { AppNode, PanelData, PanelProperty, BreakerStatus, SelectorStatus } from './types';

const defaultProperties: PanelProperty[] = [
    { id: 'prop-volt', key: 'Voltage', value: '480' },
    { id: 'prop-amp', key: 'Amperage', value: '200' },
    { id: 'prop-vendor', key: 'Vendor', value: 'Schneider' },
    { id: 'prop-model', key: 'Model', value: 'Power-Core X' },
];

const sourceDefaults = {
  status: 'Offline' as const,
  isSource: true,
  properties: defaultProperties,
};

const distDefaults = {
  status: 'Offline' as const,
  isSource: false,
  properties: [
    { id: 'prop-volt', key: 'Voltage', value: '480' },
    { id: 'prop-amp', key: 'Amperage', value: '400' },
    { id: 'prop-loc', key: 'Location', value: 'Primary Server Hall' },
  ],
};

export const initialRawNodes: (Omit<AppNode, 'data'> & { data: Omit<PanelData, 'incoming' | 'outgoing'> })[] = [
  // Group A Sources
  { id: 'CL-A', type: 'sourcePanel', position: { x: 50, y: 50 }, data: { label: 'Utility Line A', sourceGroup: 'A', ...sourceDefaults } },
  { id: 'GEN-A1', type: 'sourcePanel', position: { x: 275, y: 50 }, data: { label: 'Generator A1', sourceGroup: 'A', ...sourceDefaults } },
  { id: 'GEN-A-R', type: 'sourcePanel', position: { x: 500, y: 50 }, data: { label: 'Reserve Gen A', sourceGroup: 'A', ...sourceDefaults } },
  
  // Neutral/Main Source
  { id: 'GEN-MC-1', type: 'sourcePanel', position: { x: 725, y: 100 }, data: { label: 'Main Generator', ...sourceDefaults, isSource: true } },

  // Group B Sources
  { id: 'CL-B', type: 'sourcePanel', position: { x: 950, y: 50 }, data: { label: 'Utility Line B', sourceGroup: 'B', ...sourceDefaults } },
  { id: 'GEN-B1', type: 'sourcePanel', position: { x: 1175, y: 50 }, data: { label: 'Generator B1', sourceGroup: 'B', ...sourceDefaults } },
  { id: 'GEN-B-R', type: 'sourcePanel', position: { x: 1400, y: 50 }, data: { label: 'Reserve Gen B', sourceGroup: 'B', ...sourceDefaults } },

  // Automatic Transfer Switches (ATS)
  { id: 'ATS-A', type: 'distributionPanel', position: { x: 160, y: 250 }, data: { label: 'ATS A', panelType: 'LV Panel', ...distDefaults } },
  { id: 'ATS-B', type: 'distributionPanel', position: { x: 1060, y: 250 }, data: { label: 'ATS B', panelType: 'LV Panel', ...distDefaults } },
  { id: 'ATS-M', type: 'distributionPanel', position: { x: 610, y: 250 }, data: { label: 'ATS Main', panelType: 'LV Panel', ...distDefaults } },

  // UPS Panels
  { id: 'UPS-A', type: 'distributionPanel', position: { x: 160, y: 400 }, data: { label: 'UPS A', panelType: 'UPS', ...distDefaults } },
  { id: 'UPS-B', type: 'distributionPanel', position: { x: 1060, y: 400 }, data: { label: 'UPS B', panelType: 'UPS', ...distDefaults } },

  // LV Distribution Boards
  { id: 'LVDP-A1', type: 'distributionPanel', position: { x: 50, y: 550 }, data: { label: 'LVDP A1-1', panelType: 'LV Panel', ...distDefaults } },
  { id: 'LVDP-A2', type: 'distributionPanel', position: { x: 275, y: 550 }, data: { label: 'LVDP A1-2', panelType: 'LV Panel', ...distDefaults } },
  { id: 'LVDP-B1', type: 'distributionPanel', position: { x: 950, y: 550 }, data: { label: 'LVDP B1-1', panelType: 'LV Panel', ...distDefaults } },
  { id: 'LVDP-B2', type: 'distributionPanel', position: { x: 1175, y: 550 }, data: { label: 'LVDP B1-2', panelType: 'LV Panel', ...distDefaults } },
  { id: 'LVDP-M1', type: 'distributionPanel', position: { x: 610, y: 550 }, data: { label: 'LVDP Main-1', panelType: 'LV Panel', ...distDefaults } },
];

export const initialRawEdges: {
  source: string;
  target: string;
  breakerStatus?: BreakerStatus;
  selectorStatus?: SelectorStatus;
  isPriority?: boolean;
  tag?: string;
}[] = [
  // Group A Connections to ATS A
  { source: 'CL-A', target: 'ATS-A', breakerStatus: 'Closed', selectorStatus: 'Auto', isPriority: true, tag: 'CL-A Primary' },
  { source: 'GEN-A1', target: 'ATS-A', breakerStatus: 'Open', selectorStatus: 'Auto', isPriority: false, tag: 'GEN-A1 Standby' },

  // Group B Connections to ATS B
  { source: 'CL-B', target: 'ATS-B', breakerStatus: 'Closed', selectorStatus: 'Auto', isPriority: true, tag: 'CL-B Primary' },
  { source: 'GEN-B1', target: 'ATS-B', breakerStatus: 'Open', selectorStatus: 'Auto', isPriority: false, tag: 'GEN-B1 Standby' },

  // Main Connections to ATS Main
  { source: 'GEN-MC-1', target: 'ATS-M', breakerStatus: 'Closed', selectorStatus: 'Auto', isPriority: true, tag: 'Main Line' },
  { source: 'GEN-A-R', target: 'ATS-M', breakerStatus: 'Open', selectorStatus: 'Auto', isPriority: false, tag: 'Reserve A backup' },

  // ATS to UPS
  { source: 'ATS-A', target: 'UPS-A', breakerStatus: 'Closed', selectorStatus: 'Auto', tag: 'ATS-A Feed' },
  { source: 'ATS-B', target: 'UPS-B', breakerStatus: 'Closed', selectorStatus: 'Auto', tag: 'ATS-B Feed' },

  // UPS to downstream LVDPs
  { source: 'UPS-A', target: 'LVDP-A1', breakerStatus: 'Closed', selectorStatus: 'Auto', tag: 'A1-1 Main Feed' },
  { source: 'UPS-A', target: 'LVDP-A2', breakerStatus: 'Closed', selectorStatus: 'Auto', tag: 'A1-2 Main Feed' },
  { source: 'UPS-B', target: 'LVDP-B1', breakerStatus: 'Closed', selectorStatus: 'Auto', tag: 'B1-1 Main Feed' },
  { source: 'UPS-B', target: 'LVDP-B2', breakerStatus: 'Closed', selectorStatus: 'Auto', tag: 'B1-2 Main Feed' },

  // ATS Main to downstream LVDP Main-1
  { source: 'ATS-M', target: 'LVDP-M1', breakerStatus: 'Closed', selectorStatus: 'Auto', tag: 'Main distribution feed' },
];

// This function generates the final nodes with connection info for seeding
export const getInitialNodesForSeeding = (): AppNode[] => {
    const nodes: AppNode[] = initialRawNodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          incoming: [],
          outgoing: [],
        },
      }));
      
      const edges = initialRawEdges.map((e, i) => ({
        ...e,
        id: `edge_${e.source}_${e.target}_${i}`,
      }));
      
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      
      edges.forEach(edge => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (sourceNode && targetNode) {
          sourceNode.data.outgoing.push({
            id: edge.id,
            connectedPanelId: targetNode.id,
            breakerStatus: edge.breakerStatus as BreakerStatus || 'Open',
            selectorStatus: edge.selectorStatus as SelectorStatus || 'Auto',
            tag: edge.tag || '',
          });
          targetNode.data.incoming.push({
            id: edge.id,
            connectedPanelId: sourceNode.id,
            breakerStatus: edge.breakerStatus as BreakerStatus || 'Open',
            selectorStatus: edge.selectorStatus as SelectorStatus || 'Auto',
            isPriority: !!edge.isPriority,
            tag: edge.tag || '',
          });
        }
      });

      return nodes;
}
