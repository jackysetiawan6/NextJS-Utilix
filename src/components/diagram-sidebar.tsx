'use client';

import { useState } from 'react';
import { useDiagram } from "@/contexts/diagram-context";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { X, Wrench, CheckCircle, XCircle, ArrowRight, ArrowLeft, Zap, BatteryCharging, Star, Plus, Trash2 } from "lucide-react";
import { useRole } from "@/contexts/role-context";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { ConnectionInfo, UnitType, ConnectionSettings } from "@/lib/types";
import { logEvent } from "@/lib/log-service";
import { Checkbox } from "./ui/checkbox";
import { getDefaultProperties } from "@/lib/initial-data";

const statusConfig = {
    Online: { icon: CheckCircle, color: 'text-[hsl(var(--status-online))]' },
    Offline: { icon: XCircle, color: 'text-[hsl(var(--status-offline))]' },
    Maintenance: { icon: Wrench, color: 'text-[hsl(var(--status-maintenance))]' },
};

function ConnectionItem({
  conn,
  direction,
  canOperate,
  canEdit,
  isMaintenance,
  handleConnectionChange,
  handlePriorityChange,
  getNode
}: {
  conn: ConnectionInfo;
  direction: 'incoming' | 'outgoing';
  canOperate: boolean;
  canEdit: boolean;
  isMaintenance: boolean;
  handleConnectionChange: (connectionId: string, config: Partial<ConnectionInfo>) => void;
  handlePriorityChange: (connectionId: string) => void;
  getNode: (id: string) => any;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const connectedPanel = getNode(conn.connectedPanelId);
  const isSource = connectedPanel?.data.isSource;
  const isGroupA = connectedPanel?.data.sourceGroup === 'A';

  // Fallback defaults for settings
  const hasSelector = conn.settings ? conn.settings.hasSelector !== false : true;
  const hasBreaker = conn.settings ? conn.settings.hasBreaker !== false : true;

  // Labels
  const labelSelectorAuto = conn.settings?.selectorLabels?.Auto || 'Auto';
  const labelSelectorManual = conn.settings?.selectorLabels?.Manual || 'Manual';
  const labelSelectorOff = conn.settings?.selectorLabels?.Off || 'Off';

  const labelBreakerClosed = conn.settings?.breakerLabels?.Closed || 'Closed';
  const labelBreakerOpen = conn.settings?.breakerLabels?.Open || 'Open';

  const handleToggleSetting = (field: 'hasSelector' | 'hasBreaker', checked: boolean) => {
    const currentSettings = conn.settings || { hasSelector: true, hasBreaker: true };
    const newSettings: ConnectionSettings = {
      ...currentSettings,
      [field]: checked
    };
    handleConnectionChange(conn.id, { settings: newSettings });
  };

  const handleLabelChange = (type: 'selector' | 'breaker', stateKey: string, val: string) => {
    const currentSettings = conn.settings || { hasSelector: true, hasBreaker: true };
    const labelKey = type === 'selector' ? 'selectorLabels' : 'breakerLabels';
    
    const newSettings: ConnectionSettings = {
      ...currentSettings,
      [labelKey]: {
        ...(currentSettings[labelKey] || {}),
        [stateKey]: val
      }
    };
    handleConnectionChange(conn.id, { settings: newSettings });
  };

  return (
    <div className="p-3 rounded-md bg-muted/50 space-y-4">
      <div className="text-sm font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSource ? (
            isGroupA ? (
              <Zap className="h-4 w-4 text-[hsl(var(--source-a-color))]" />
            ) : (
              <BatteryCharging className="h-4 w-4 text-[hsl(var(--source-b-color))]" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
          {connectedPanel?.data.label || 'Unknown Panel'}
        </div>
        {direction === 'incoming' && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`priority-${conn.id}`}
              checked={conn.isPriority}
              onCheckedChange={() => handlePriorityChange(conn.id)}
              disabled={!canOperate || conn.selectorStatus !== 'Auto'}
            />
            <Label htmlFor={`priority-${conn.id}`} className="text-xs">Priority</Label>
            {conn.isPriority && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Connection Tag</Label>
        {canEdit ? (
          <Input
            id={`tag-${conn.id}`}
            placeholder="e.g., Q1.1 To LVDP A1-1"
            value={conn.tag || ''}
            onChange={(e) => handleConnectionChange(conn.id, { tag: e.target.value })}
          />
        ) : (
          <p className="text-xs font-semibold text-foreground bg-background/50 px-2 py-1.5 rounded border border-border/30">
            {conn.tag || 'No Tag'}
          </p>
        )}
      </div>

      {hasSelector && (
        <div className="flex items-center justify-between">
          <Label htmlFor={`selector-${conn.id}`}>Selector</Label>
          <Select
            value={conn.selectorStatus}
            onValueChange={(value) => handleConnectionChange(conn.id, { selectorStatus: value as any })}
            disabled={!canOperate}
          >
            <SelectTrigger id={`selector-${conn.id}`} className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Auto">{labelSelectorAuto}</SelectItem>
              <SelectItem value="Manual">{labelSelectorManual}</SelectItem>
              <SelectItem value="Off">{labelSelectorOff}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {hasBreaker && (
        <div className="flex items-center justify-between">
          <Label htmlFor={`breaker-${conn.id}`} className="flex items-center gap-2">
            Breaker
            {conn.breakerStatus === 'Closed' ? (
              <CheckCircle className="h-4 w-4 text-[hsl(var(--status-online))]" />
            ) : (
              <XCircle className="h-4 w-4 text-[hsl(var(--destructive))]" />
            )}
            <span className="text-xs font-normal text-muted-foreground">
              ({conn.breakerStatus === 'Closed' ? labelBreakerClosed : labelBreakerOpen})
            </span>
          </Label>
          <Switch
            id={`breaker-${conn.id}`}
            checked={conn.breakerStatus === 'Closed'}
            onCheckedChange={(checked) => handleConnectionChange(conn.id, { breakerStatus: checked ? 'Closed' : 'Open' })}
            disabled={!canOperate || isMaintenance || (direction === 'incoming' && conn.selectorStatus === 'Auto')}
          />
        </div>
      )}

      {/* Advanced supervisor settings */}
      {canEdit && (
        <div className="pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground flex justify-between h-7 px-2 hover:bg-muted/80"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span>Advanced Config</span>
            <span>{showAdvanced ? 'Hide' : 'Configure...'}</span>
          </Button>

          {showAdvanced && (
            <div className="mt-3 p-2 rounded border border-border bg-card space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <Label htmlFor={`adv-sel-${conn.id}`} className="text-xs font-normal">Enable Selector</Label>
                <Switch
                  id={`adv-sel-${conn.id}`}
                  checked={hasSelector}
                  onCheckedChange={(checked) => handleToggleSetting('hasSelector', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor={`adv-brk-${conn.id}`} className="text-xs font-normal">Enable Breaker</Label>
                <Switch
                  id={`adv-brk-${conn.id}`}
                  checked={hasBreaker}
                  onCheckedChange={(checked) => handleToggleSetting('hasBreaker', checked)}
                />
              </div>

              {hasSelector && (
                <div className="space-y-1">
                  <span className="text-muted-foreground block font-medium">Selector Labels:</span>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Auto</span>
                      <Input
                        className="h-6 px-1 py-0 text-[10px]"
                        value={labelSelectorAuto}
                        onChange={(e) => handleLabelChange('selector', 'Auto', e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Manual</span>
                      <Input
                        className="h-6 px-1 py-0 text-[10px]"
                        value={labelSelectorManual}
                        onChange={(e) => handleLabelChange('selector', 'Manual', e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Off</span>
                      <Input
                        className="h-6 px-1 py-0 text-[10px]"
                        value={labelSelectorOff}
                        onChange={(e) => handleLabelChange('selector', 'Off', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {hasBreaker && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                  <span className="text-muted-foreground block font-medium">Breaker Labels:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Closed (ON)</span>
                      <Input
                        className="h-6 px-1 py-0 text-[10px]"
                        value={labelBreakerClosed}
                        onChange={(e) => handleLabelChange('breaker', 'Closed', e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Open (OFF)</span>
                      <Input
                        className="h-6 px-1 py-0 text-[10px]"
                        value={labelBreakerOpen}
                        onChange={(e) => handleLabelChange('breaker', 'Open', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConnectionControls({ title, connections, direction }: { title: string, connections: ConnectionInfo[], direction: 'incoming' | 'outgoing' }) {
    const { updateConnectionConfig, getNode, selectedNode, setIncomingPriority } = useDiagram();
    const { role, hasPermission } = useRole();
    const canOperate = hasPermission('Operator');
    const canEdit = hasPermission('Supervisor');
    const isMaintenance = selectedNode?.data.status === 'Maintenance';

    if (!connections.length || !selectedNode) return null;
    
    const handleConnectionChange = (connectionId: string, config: Partial<ConnectionInfo>) => {
        if (!selectedNode) return;
        updateConnectionConfig(selectedNode.id, direction, connectionId, config);
        const details = `Panel: ${selectedNode.data.label}, Connection: ${getNode(connections.find(c => c.id === connectionId)?.connectedPanelId || '')?.data.label}, Change: ${JSON.stringify(config)}`;
        logEvent({ role, action: 'Update Connection', details });
    };

    const handlePriorityChange = (connectionId: string) => {
        if (!selectedNode) return;
        setIncomingPriority(selectedNode.id, connectionId);
        logEvent({ role, action: 'Set Priority', details: `Panel: ${selectedNode.data.label}, Connection: ${getNode(connections.find(c => c.id === connectionId)?.connectedPanelId || '')?.data.label}` });
    };

    return (
        <div>
            <h4 className="font-semibold mb-3 text-base flex items-center gap-2">
                {direction === 'incoming' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                {title}
            </h4>
            <div className="space-y-3">
                {connections.map(conn => (
                    <ConnectionItem
                        key={conn.id}
                        conn={conn}
                        direction={direction}
                        canOperate={canOperate}
                        canEdit={canEdit}
                        isMaintenance={isMaintenance}
                        handleConnectionChange={handleConnectionChange}
                        handlePriorityChange={handlePriorityChange}
                        getNode={getNode}
                    />
                ))}
            </div>
        </div>
    );
}

export default function DiagramSidebar() {
    const { selectedNode, selectNode, updateNodeConfig, addNodeProperty, updateNodeProperty, deleteNodeProperty } = useDiagram();
    const { role, hasPermission } = useRole();
    const canEdit = hasPermission('Supervisor');

    if (!selectedNode) {
        return null;
    }

    const { id, data } = selectedNode;

    const handleFieldChange = (field: 'label' | 'unitType', value: string) => {
        updateNodeConfig(id, { [field]: value });
        logEvent({ role, action: 'Update Panel Detail', details: `Panel: ${data.label}, Field: ${field}, New Value: ${value}` });
    }

    const handleResetPropertiesToDefault = () => {
        const defaultProps = getDefaultProperties(data.unitType || 'LV Panel');
        updateNodeConfig(id, { properties: defaultProps });
        logEvent({ role, action: 'Reset Panel Properties', details: `Panel: ${data.label}, Reset details to defaults for ${data.unitType || 'LV Panel'}` });
    }

    const handleMaintenanceModeToggle = (isMaintenance: boolean) => {
        const newStatus = isMaintenance ? 'Maintenance' : 'Offline';
        updateNodeConfig(id, { status: newStatus });
        logEvent({ role, action: 'Toggle Maintenance Mode', details: `Panel: ${data.label}, Status: ${newStatus}` });
    }

    const handleAddProperty = () => {
        addNodeProperty(id);
        logEvent({ role, action: 'Add Panel Property', details: `Added new detail field to panel ${data.label}` });
    };

    const handlePropertyChange = (propId: string, field: 'key' | 'value', value: string) => {
        updateNodeProperty(id, propId, field, value);
    };

    const handleDeleteProperty = (propId: string) => {
        deleteNodeProperty(id, propId);
        logEvent({ role, action: 'Delete Panel Property', details: `Deleted detail field from panel ${data.label}` });
    };
    
    const statusInfo = statusConfig[data.status!] || statusConfig.Offline;
    const StatusIcon = statusInfo.icon;

    return (
        <aside className="w-96 border-l bg-card shrink-0 flex flex-col">
            <div className="flex shrink-0 items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold truncate flex items-center gap-2">
                    <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                    {data.label}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => selectNode(null)}>
                    <X className="h-5 w-5" />
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {(() => {
                        const hasIncoming = !data.isSource && data.incoming && data.incoming.length > 0;
                        const hasOutgoing = data.outgoing && data.outgoing.length > 0;
                        if (hasIncoming || hasOutgoing) {
                            return (
                                <>
                                    {data.isSource ? (
                                        <ConnectionControls title="Outgoing Feeders" connections={data.outgoing} direction="outgoing" />
                                    ) : (
                                        <>
                                            {hasIncoming && <ConnectionControls title="Incoming Sources" connections={data.incoming} direction="incoming" />}
                                            {hasOutgoing && <ConnectionControls title="Outgoing Feeders" connections={data.outgoing} direction="outgoing" />}
                                        </>
                                    )}
                                    <Separator />
                                </>
                            );
                        }
                        return null;
                    })()}
 
                    <div>
                        <h4 className="font-semibold mb-3 text-base">Unit Details</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="panel-label">Unit Name</Label>
                                {canEdit ? (
                                    <Input id="panel-label" value={data.label} onChange={e => handleFieldChange('label', e.target.value)} />
                                ) : (
                                    <p className="text-sm font-semibold text-foreground bg-muted/30 px-3 py-2 rounded-md border border-border/40">
                                        {data.label}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="unit-type">Unit Type</Label>
                                {canEdit ? (
                                    <Select
                                        value={data.unitType || (data.isSource ? 'Utility' : 'LV Panel')}
                                        onValueChange={(value: UnitType) => handleFieldChange('unitType', value)}
                                    >
                                        <SelectTrigger id="unit-type">
                                            <SelectValue placeholder="Select unit type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {data.isSource ? (
                                                <>
                                                    <SelectItem value="Utility">Utility</SelectItem>
                                                    <SelectItem value="Generator">Generator</SelectItem>
                                                </>
                                            ) : (
                                                <>
                                                    <SelectItem value="LV Panel">LV Panel</SelectItem>
                                                    <SelectItem value="UPS">UPS</SelectItem>
                                                    <SelectItem value="PDU">PDU</SelectItem>
                                                    <SelectItem value="STS">STS</SelectItem>
                                                    <SelectItem value="Server Rack">Server Rack</SelectItem>
                                                    <SelectItem value="Chiller">Chiller</SelectItem>
                                                    <SelectItem value="AHU">AHU</SelectItem>
                                                    <SelectItem value="FCU">FCU</SelectItem>
                                                    <SelectItem value="Lamp">Lamp</SelectItem>
                                                    <SelectItem value="MCFA">MCFA</SelectItem>
                                                    <SelectItem value="LCFA">LCFA</SelectItem>
                                                    <SelectItem value="TBFA">TBFA</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm font-semibold text-foreground bg-muted/30 px-3 py-2 rounded-md border border-border/40 animate-none">
                                        {data.unitType || (data.isSource ? 'Utility' : 'LV Panel')}
                                    </p>
                                )}
                            </div>

                            {canEdit && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full text-xs text-muted-foreground border-dashed"
                                    onClick={handleResetPropertiesToDefault}
                                >
                                    Reset Details to Defaults
                                </Button>
                            )}
                            
                            {canEdit ? (
                                (data.properties || []).map((prop) => (
                                    <div key={prop.id} className="flex items-end gap-2">
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                            <Input
                                                placeholder="Field Name"
                                                value={prop.key}
                                                onChange={(e) => handlePropertyChange(prop.id, 'key', e.target.value)}
                                                className="font-medium"
                                                aria-label="Property Name"
                                            />
                                            <Input
                                                placeholder="Field Value"
                                                value={prop.value}
                                                onChange={(e) => handlePropertyChange(prop.id, 'value', e.target.value)}
                                                aria-label="Property Value"
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteProperty(prop.id)}
                                            aria-label={`Delete property ${prop.key}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                (data.properties || []).length > 0 && (
                                    <div className="space-y-1.5 bg-muted/30 p-3 rounded-md border border-border/40">
                                        {(data.properties || []).map((prop) => (
                                            <div key={prop.id} className="flex justify-between text-xs py-1 border-b border-border/20 last:border-0">
                                                <span className="text-muted-foreground font-medium">{prop.key || 'Unnamed Property'}</span>
                                                <span className="text-foreground font-semibold">{prop.value || 'N/A'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}

                            {canEdit && (
                                <Button variant="outline" className="w-full" onClick={handleAddProperty}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Detail Field
                                </Button>
                            )}
                        </div>
                    </div>
                    
                    {!data.isSource && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-3 text-base">Maintenance</h4>
                                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                    <Label htmlFor="maintenance-mode" className="flex flex-col gap-1">
                                        <span>Maintenance Mode</span>
                                        <span className="text-xs font-normal text-muted-foreground">Puts panel offline and opens breakers.</span>
                                    </Label>
                                    <Switch
                                        id="maintenance-mode"
                                        checked={data.status === 'Maintenance'}
                                        onCheckedChange={handleMaintenanceModeToggle}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
}
