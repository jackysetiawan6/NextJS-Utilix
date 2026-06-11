'use client';

import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { CircuitBoard, Wrench, ChevronDown, ChevronRight, Server } from 'lucide-react';
import type { PanelData, PanelType } from '@/lib/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useDiagram } from '@/contexts/diagram-context';
import { Button } from '../ui/button';

function DistributionPanelNode({ id, data }: NodeProps<PanelData>) {
  const { collapsedNodes, toggleNodeCollapse } = useDiagram();
  const isCollapsed = collapsedNodes[id];
  const hasOutgoing = data.outgoing && data.outgoing.length > 0;

  const panelType: PanelType = data.panelType || 'LV Panel';
  const isMaintenance = data.status === 'Maintenance';
  
  const statusColorMap = {
    Online: 'text-[hsl(var(--status-online))]',
    Maintenance: 'text-[hsl(var(--status-maintenance))]',
    Offline: 'text-[hsl(var(--status-offline))]',
  }

  const PanelIcon = useMemo(() => {
    if (isMaintenance) return Wrench;
    switch (panelType) {
        case 'UPS':
            return Server;
        case 'LV Panel':
        default:
            return CircuitBoard;
    }
  }, [isMaintenance, panelType]);


  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeCollapse(id);
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card className={`w-56 shadow-md status-${data.status}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary"
      />
      <CardHeader className="p-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <PanelIcon className={`h-5 w-5 ${statusColorMap[data.status!]}`} />
            <span className="truncate">{data.label}</span>
          </CardTitle>
          {hasOutgoing && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleToggleCollapse} onDoubleClick={handleDoubleClick}>
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-primary"
        />
      )}
    </Card>
  );
}

export default memo(DistributionPanelNode);
