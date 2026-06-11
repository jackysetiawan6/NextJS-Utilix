import type { AppNode, PanelData, PanelProperty, BreakerStatus, SelectorStatus, UnitType } from './types';

export const defaultUnitProperties: Record<UnitType, PanelProperty[]> = {
  Utility: [
    { id: 'prop-loc', key: 'Location', value: '' },
    { id: 'prop-volt', key: 'Voltage', value: '480 V' },
    { id: 'prop-power', key: 'Active Power', value: '1500 kW' },
    { id: 'prop-pf', key: 'Power Factor', value: '0.98' },
    { id: 'prop-freq', key: 'Frequency', value: '60 Hz' },
    { id: 'prop-sync', key: 'Grid Status', value: 'Synchronized' },
    { id: 'prop-vendor', key: 'Vendor', value: 'Utility Corp' },
  ],
  Generator: [
    { id: 'prop-loc', key: 'Location', value: '' },
    { id: 'prop-volt', key: 'Voltage', value: '480 V' },
    { id: 'prop-power', key: 'Active Power', value: '0 kW' },
    { id: 'prop-fuel', key: 'Fuel Level', value: '95%' },
    { id: 'prop-temp', key: 'Coolant Temp', value: '75°C' },
    { id: 'prop-bat', key: 'Battery Voltage', value: '24.5 V' },
    { id: 'prop-hours', key: 'Run Hours', value: '128 hrs' },
    { id: 'prop-vendor', key: 'Vendor', value: 'Caterpillar' },
  ],
  'LV Panel': [
    { id: 'prop-loc', key: 'Location', value: '' },
    { id: 'prop-volt', key: 'Voltage', value: '480 V' },
    { id: 'prop-amp', key: 'Current', value: '320 A' },
    { id: 'prop-temp', key: 'Busbar Temp', value: '38°C' },
    { id: 'prop-power', key: 'Active Power', value: '250 kW' },
  ],
  UPS: [
    { id: 'prop-loc', key: 'Location', value: '' },
    { id: 'prop-in-volt', key: 'Input Voltage', value: '480 V' },
    { id: 'prop-out-volt', key: 'Output Voltage', value: '480 V' },
    { id: 'prop-cap', key: 'Battery Capacity', value: '100%' },
    { id: 'prop-time', key: 'Backup Time', value: '15 mins' },
    { id: 'prop-load', key: 'Load Percentage', value: '42%' },
    { id: 'prop-health', key: 'Battery Health', value: '98%' },
    { id: 'prop-vendor', key: 'Vendor', value: 'Eaton' },
  ],
  PDU: [
    { id: 'prop-loc', key: 'Location', value: '' },
    { id: 'prop-in-volt', key: 'Input Voltage', value: '480 V' },
    { id: 'prop-out-volt', key: 'Output Voltage', value: '120/208 V' },
    { id: 'prop-power', key: 'Active Power', value: '75 kW' },
    { id: 'prop-ld-a', key: 'Feed A Load', value: '45 A' },
    { id: 'prop-ld-b', key: 'Feed B Load', value: '42 A' },
  ],
  STS: [
    { id: 'prop-loc', key: 'Location', value: '' },
    { id: 'prop-pref', key: 'Preferred Source', value: 'Source A' },
    { id: 'prop-sel', key: 'Selected Source', value: 'Source A' },
    { id: 'prop-src-a', key: 'Source A Voltage', value: '208 V' },
    { id: 'prop-src-b', key: 'Source B Voltage', value: '208 V' },
    { id: 'prop-time', key: 'Transfer Time', value: '4.2 ms' },
    { id: 'prop-vendor', key: 'Vendor', value: 'APC' },
  ],
  'Server Rack': [
    { id: 'prop-loc', key: 'Location', value: '' },
    { id: 'prop-load', key: 'Load', value: '6.5 kW' },
    { id: 'prop-temp-in', key: 'Inlet Temperature', value: '21.5°C' },
    { id: 'prop-temp-out', key: 'Outlet Temperature', value: '32.2°C' },
    { id: 'prop-hum', key: 'Humidity', value: '45% RH' },
    { id: 'prop-psu1', key: 'PSU 1 Status', value: 'Active' },
    { id: 'prop-psu2', key: 'PSU 2 Status', value: 'Active' },
  ],
  Chiller: [
    { id: 'prop-loc', key: 'Location', value: '' },
    { id: 'prop-load', key: 'Cooling Load', value: '350 Tons' },
    { id: 'prop-temp-in', key: 'Chilled Water Inlet', value: '12.2°C' },
    { id: 'prop-temp-out', key: 'Chilled Water Outlet', value: '6.7°C' },
    { id: 'prop-flow', key: 'Water Flow Rate', value: '840 GPM' },
    { id: 'prop-cop', key: 'COP (Efficiency)', value: '5.8' },
    { id: 'prop-vendor', key: 'Vendor', value: 'York' },
  ],
  AHU: [
    { id: 'prop-loc', key: 'Location', value: '' },
    { id: 'prop-speed', key: 'Fan Speed', value: '85%' },
    { id: 'prop-temp-sup', key: 'Supply Temp', value: '18.0°C' },
    { id: 'prop-temp-ret', key: 'Return Temp', value: '24.5°C' },
    { id: 'prop-flow', key: 'Airflow', value: '12000 CFM' },
    { id: 'prop-filter', key: 'Filter Status', value: 'Clean' },
  ],
  FCU: [
    { id: 'prop-loc', key: 'Location', value: '' },
    { id: 'prop-speed', key: 'Fan Speed', value: 'Medium' },
    { id: 'prop-temp-sup', key: 'Supply Temp', value: '19.5°C' },
    { id: 'prop-temp-room', key: 'Room Temp', value: '22.8°C' },
    { id: 'prop-mode', key: 'Control Mode', value: 'Auto' },
  ],
  Lamp: [
    { id: 'prop-loc', key: 'Location', value: '' },
    { id: 'prop-lux', key: 'Illuminance', value: '350 Lux' },
    { id: 'prop-power', key: 'Power Consumption', value: '32 W' },
    { id: 'prop-mode', key: 'Operating Mode', value: 'Schedule' },
    { id: 'prop-life', key: 'LED Life Remaining', value: '92%' },
  ],
};

export const getDefaultProperties = (type: UnitType): PanelProperty[] => {
  return JSON.parse(JSON.stringify(defaultUnitProperties[type] || []));
};

export const initialRawNodes: (Omit<AppNode, 'data'> & { data: Omit<PanelData, 'incoming' | 'outgoing'> })[] = [
  // Group A Sources
  { id: 'CL-A', type: 'sourcePanel', position: { x: 50, y: 50 }, data: { label: 'Utility Line A', sourceGroup: 'A', status: 'Offline', isSource: true, unitType: 'Utility', properties: defaultUnitProperties['Utility'] } },
  { id: 'GEN-A1', type: 'sourcePanel', position: { x: 275, y: 50 }, data: { label: 'Generator A1', sourceGroup: 'A', status: 'Offline', isSource: true, unitType: 'Generator', properties: defaultUnitProperties['Generator'] } },
  { id: 'GEN-A-R', type: 'sourcePanel', position: { x: 500, y: 50 }, data: { label: 'Reserve Gen A', sourceGroup: 'A', status: 'Offline', isSource: true, unitType: 'Generator', properties: defaultUnitProperties['Generator'] } },
  
  // Neutral/Main Source
  { id: 'GEN-MC-1', type: 'sourcePanel', position: { x: 725, y: 100 }, data: { label: 'Main Generator', status: 'Offline', isSource: true, unitType: 'Generator', properties: defaultUnitProperties['Generator'] } },

  // Group B Sources
  { id: 'CL-B', type: 'sourcePanel', position: { x: 950, y: 50 }, data: { label: 'Utility Line B', sourceGroup: 'B', status: 'Offline', isSource: true, unitType: 'Utility', properties: defaultUnitProperties['Utility'] } },
  { id: 'GEN-B1', type: 'sourcePanel', position: { x: 1175, y: 50 }, data: { label: 'Generator B1', sourceGroup: 'B', status: 'Offline', isSource: true, unitType: 'Generator', properties: defaultUnitProperties['Generator'] } },
  { id: 'GEN-B-R', type: 'sourcePanel', position: { x: 1400, y: 50 }, data: { label: 'Reserve Gen B', sourceGroup: 'B', status: 'Offline', isSource: true, unitType: 'Generator', properties: defaultUnitProperties['Generator'] } },

  // Automatic Transfer Switches (ATS)
  { id: 'ATS-A', type: 'distributionPanel', position: { x: 160, y: 250 }, data: { label: 'ATS A', unitType: 'LV Panel', status: 'Offline', isSource: false, properties: defaultUnitProperties['LV Panel'] } },
  { id: 'ATS-B', type: 'distributionPanel', position: { x: 1060, y: 250 }, data: { label: 'ATS B', unitType: 'LV Panel', status: 'Offline', isSource: false, properties: defaultUnitProperties['LV Panel'] } },
  { id: 'ATS-M', type: 'distributionPanel', position: { x: 610, y: 250 }, data: { label: 'ATS Main', unitType: 'LV Panel', status: 'Offline', isSource: false, properties: defaultUnitProperties['LV Panel'] } },

  // UPS Panels
  { id: 'UPS-A', type: 'distributionPanel', position: { x: 160, y: 400 }, data: { label: 'UPS A', unitType: 'UPS', status: 'Offline', isSource: false, properties: defaultUnitProperties['UPS'] } },
  { id: 'UPS-B', type: 'distributionPanel', position: { x: 1060, y: 400 }, data: { label: 'UPS B', unitType: 'UPS', status: 'Offline', isSource: false, properties: defaultUnitProperties['UPS'] } },

  // LV Distribution Boards
  { id: 'LVDP-A1', type: 'distributionPanel', position: { x: 50, y: 550 }, data: { label: 'LVDP A1-1', unitType: 'LV Panel', status: 'Offline', isSource: false, properties: defaultUnitProperties['LV Panel'] } },
  { id: 'LVDP-A2', type: 'distributionPanel', position: { x: 275, y: 550 }, data: { label: 'LVDP A1-2', unitType: 'LV Panel', status: 'Offline', isSource: false, properties: defaultUnitProperties['LV Panel'] } },
  { id: 'LVDP-B1', type: 'distributionPanel', position: { x: 950, y: 550 }, data: { label: 'LVDP B1-1', unitType: 'LV Panel', status: 'Offline', isSource: false, properties: defaultUnitProperties['LV Panel'] } },
  { id: 'LVDP-B2', type: 'distributionPanel', position: { x: 1175, y: 550 }, data: { label: 'LVDP B1-2', unitType: 'LV Panel', status: 'Offline', isSource: false, properties: defaultUnitProperties['LV Panel'] } },
  { id: 'LVDP-M1', type: 'distributionPanel', position: { x: 610, y: 550 }, data: { label: 'LVDP Main-1', unitType: 'LV Panel', status: 'Offline', isSource: false, properties: defaultUnitProperties['LV Panel'] } },

  // Tier 4 Detailed Downstream loads
  { id: 'STS-1', type: 'distributionPanel', position: { x: 50, y: 700 }, data: { label: 'STS 1', unitType: 'STS', status: 'Offline', isSource: false, properties: defaultUnitProperties['STS'] } },
  { id: 'PDU-1', type: 'distributionPanel', position: { x: 275, y: 700 }, data: { label: 'PDU 1', unitType: 'PDU', status: 'Offline', isSource: false, properties: defaultUnitProperties['PDU'] } },
  { id: 'Chiller-1', type: 'distributionPanel', position: { x: 500, y: 700 }, data: { label: 'Chiller 1', unitType: 'Chiller', status: 'Offline', isSource: false, properties: defaultUnitProperties['Chiller'] } },
  { id: 'AHU-1', type: 'distributionPanel', position: { x: 725, y: 700 }, data: { label: 'AHU 1', unitType: 'AHU', status: 'Offline', isSource: false, properties: defaultUnitProperties['AHU'] } },
  { id: 'FCU-1', type: 'distributionPanel', position: { x: 950, y: 700 }, data: { label: 'FCU 1', unitType: 'FCU', status: 'Offline', isSource: false, properties: defaultUnitProperties['FCU'] } },
  { id: 'Lamp-1', type: 'distributionPanel', position: { x: 1175, y: 700 }, data: { label: 'Lamp 1', unitType: 'Lamp', status: 'Offline', isSource: false, properties: defaultUnitProperties['Lamp'] } },

  { id: 'Server-Rack-1', type: 'distributionPanel', position: { x: 50, y: 850 }, data: { label: 'Server Rack 1', unitType: 'Server Rack', status: 'Offline', isSource: false, properties: defaultUnitProperties['Server Rack'] } },
  { id: 'Server-Rack-2', type: 'distributionPanel', position: { x: 275, y: 850 }, data: { label: 'Server Rack 2', unitType: 'Server Rack', status: 'Offline', isSource: false, properties: defaultUnitProperties['Server Rack'] } },
];

export const initialRawEdges: {
  source: string;
  target: string;
  breakerStatus?: BreakerStatus;
  selectorStatus?: SelectorStatus;
  isPriority?: boolean;
  tag?: string;
  settings?: {
    hasSelector: boolean;
    hasBreaker: boolean;
  };
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

  // Downstream of LVDPs
  { source: 'LVDP-A1', target: 'STS-1', breakerStatus: 'Closed', selectorStatus: 'Auto', tag: 'STS Feed A' },
  { source: 'LVDP-B1', target: 'STS-1', breakerStatus: 'Closed', selectorStatus: 'Auto', tag: 'STS Feed B' },
  { source: 'LVDP-A2', target: 'PDU-1', breakerStatus: 'Closed', selectorStatus: 'Auto', tag: 'PDU 1 Feed' },
  { source: 'LVDP-M1', target: 'Chiller-1', breakerStatus: 'Closed', selectorStatus: 'Manual', tag: 'Chiller Power Line', settings: { hasSelector: false, hasBreaker: true } },
  { source: 'LVDP-M1', target: 'AHU-1', breakerStatus: 'Closed', selectorStatus: 'Manual', tag: 'AHU Power Line', settings: { hasSelector: false, hasBreaker: true } },
  { source: 'LVDP-B2', target: 'FCU-1', breakerStatus: 'Closed', selectorStatus: 'Auto', tag: 'FCU Power Line' },
  { source: 'LVDP-B2', target: 'Lamp-1', breakerStatus: 'Closed', selectorStatus: 'Manual', tag: 'Lighting Feed', settings: { hasSelector: false, hasBreaker: true } },

  // Downstream of STS/PDU to Server Racks
  { source: 'STS-1', target: 'Server-Rack-1', breakerStatus: 'Closed', selectorStatus: 'Manual', tag: 'STS Dual Feed Output', settings: { hasSelector: false, hasBreaker: false } },
  { source: 'PDU-1', target: 'Server-Rack-2', breakerStatus: 'Closed', selectorStatus: 'Manual', tag: 'PDU Output', settings: { hasSelector: false, hasBreaker: true } },
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
          const defaultSettings = {
            hasSelector: edge.settings?.hasSelector !== false,
            hasBreaker: edge.settings?.hasBreaker !== false,
          };
          sourceNode.data.outgoing.push({
            id: edge.id,
            connectedPanelId: targetNode.id,
            breakerStatus: edge.breakerStatus as BreakerStatus || 'Open',
            selectorStatus: edge.selectorStatus as SelectorStatus || 'Auto',
            tag: edge.tag || '',
            settings: defaultSettings,
          });
          targetNode.data.incoming.push({
            id: edge.id,
            connectedPanelId: sourceNode.id,
            breakerStatus: edge.breakerStatus as BreakerStatus || 'Open',
            selectorStatus: edge.selectorStatus as SelectorStatus || 'Auto',
            isPriority: !!edge.isPriority,
            tag: edge.tag || '',
            settings: defaultSettings,
          });
        }
      });

      return nodes;
}
