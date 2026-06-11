'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Zap, BatteryCharging } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import type { PanelData } from '@/lib/types';

function SourcePanelNode({ data, id }: NodeProps<PanelData>) {
  const isGroupA = data.sourceGroup === 'A';
  
  return (
    <Card className="w-52 shadow-lg border-2 border-primary/50">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center justify-center gap-2 text-base">
          {isGroupA ? <Zap className="h-5 w-5 text-[hsl(var(--source-a-color))]" /> : <BatteryCharging className="h-5 w-5 text-[hsl(var(--source-b-color))]" />}
          {data.label}
        </CardTitle>
      </CardHeader>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-primary"
      />
    </Card>
  );
}

export default memo(SourcePanelNode);
