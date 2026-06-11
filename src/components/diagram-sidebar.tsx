'use client';
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
import type { ConnectionInfo, PanelType } from "@/lib/types";
import { logEvent } from "@/lib/log-service";
import { Checkbox } from "./ui/checkbox";

const statusConfig = {
    Online: { icon: CheckCircle, color: 'text-[hsl(var(--status-online))]' },
    Offline: { icon: XCircle, color: 'text-[hsl(var(--status-offline))]' },
    Maintenance: { icon: Wrench, color: 'text-[hsl(var(--status-maintenance))]' },
};

function ConnectionControls({ title, connections, direction }: { title: string, connections: ConnectionInfo[], direction: 'incoming' | 'outgoing' }) {
    const { updateConnectionConfig, getNode, selectedNode, setIncomingPriority } = useDiagram();
    const { role, hasPermission } = useRole();
    const canOperate = hasPermission('Operator');
    const canEdit = hasPermission('Supervisor');
    const isMaintenance = selectedNode?.data.status === 'Maintenance';

    if (!connections.length || !selectedNode) return null;
    
    const handleConnectionChange = (connectionId: string, config: Partial<Pick<ConnectionInfo, 'breakerStatus' | 'selectorStatus' | 'tag'>>) => {
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
                {connections.map(conn => {
                    const connectedPanel = getNode(conn.connectedPanelId);
                    const isSource = connectedPanel?.data.isSource;
                    const isGroupA = connectedPanel?.data.sourceGroup === 'A';

                    return (
                        <div key={conn.id} className="p-3 rounded-md bg-muted/50 space-y-4">
                            <div className="text-sm font-medium flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                {isSource ? (isGroupA ? <Zap className="h-4 w-4 text-[hsl(var(--source-a-color))]" /> : <BatteryCharging className="h-4 w-4 text-[hsl(var(--source-b-color))]" />) : <div className="h-4 w-4" />}
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
                            <div className="space-y-2">
                                <Label htmlFor={`tag-${conn.id}`}>Connection Tag</Label>
                                <Input
                                    id={`tag-${conn.id}`}
                                    placeholder="e.g., Q1.1 To LVDP A1-1"
                                    value={conn.tag || ''}
                                    onChange={(e) => handleConnectionChange(conn.id, { tag: e.target.value })}
                                    disabled={!canEdit}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor={`selector-${conn.id}`}>Selector</Label>
                                <Select
                                    value={conn.selectorStatus}
                                    onValueChange={(value) => handleConnectionChange(conn.id, { selectorStatus: value as ConnectionInfo['selectorStatus'] })}
                                    disabled={!canOperate}
                                >
                                    <SelectTrigger id={`selector-${conn.id}`} className="w-36">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Auto">Auto</SelectItem>
                                        <SelectItem value="Manual">Manual</SelectItem>
                                        <SelectItem value="Off">Off</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor={`breaker-${conn.id}`} className="flex items-center gap-2">
                                  Breaker
                                  {conn.breakerStatus === 'Closed' ? <CheckCircle className="h-4 w-4 text-[hsl(var(--status-online))]" /> : <XCircle className="h-4 w-4 text-[hsl(var(--destructive))]" />}
                                </Label>
                                <Switch
                                    id={`breaker-${conn.id}`}
                                    checked={conn.breakerStatus === 'Closed'}
                                    onCheckedChange={(checked) => handleConnectionChange(conn.id, { breakerStatus: checked ? 'Closed' : 'Open' })}
                                    disabled={!canOperate || isMaintenance || (direction === 'incoming' && conn.selectorStatus === 'Auto')}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

export default function DiagramSidebar() {
    const { selectedNode, selectNode, updateNodeConfig, addNodeProperty, updateNodeProperty, deleteNodeProperty } = useDiagram();
    const { role, hasPermission } = useRole();
    const canEdit = hasPermission('Supervisor');

    if (!selectedNode) {
        return null;
    }

    const { id, data } = selectedNode;

    const handleFieldChange = (field: 'label' | 'panelType', value: string) => {
        updateNodeConfig(id, { [field]: value });
        logEvent({ role, action: 'Update Panel Detail', details: `Panel: ${data.label}, Field: ${field}, New Value: ${value}` });
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
                    {data.isSource ? (
                        <ConnectionControls title="Outgoing Feeders" connections={data.outgoing} direction="outgoing" />
                    ) : (
                        <>
                            <ConnectionControls title="Incoming Sources" connections={data.incoming} direction="incoming" />
                            <ConnectionControls title="Outgoing Feeders" connections={data.outgoing} direction="outgoing" />
                        </>
                    )}
                    
                    <Separator />

                    <div>
                        <h4 className="font-semibold mb-3 text-base">Panel Details</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="panel-label">Panel Name</Label>
                                <Input id="panel-label" value={data.label} onChange={e => handleFieldChange('label', e.target.value)} disabled={!canEdit} />
                            </div>

                            {!data.isSource && (
                                <div className="space-y-2">
                                    <Label htmlFor="panel-type">Panel Type</Label>
                                    <Select
                                        value={data.panelType || 'LV Panel'}
                                        onValueChange={(value: PanelType) => handleFieldChange('panelType', value)}
                                        disabled={!canEdit}
                                    >
                                        <SelectTrigger id="panel-type">
                                            <SelectValue placeholder="Select panel type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LV Panel">LV Panel</SelectItem>
                                            <SelectItem value="UPS">UPS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            
                            {(data.properties || []).map((prop) => (
                                <div key={prop.id} className="flex items-end gap-2">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <Input
                                            placeholder="Field Name"
                                            value={prop.key}
                                            onChange={(e) => handlePropertyChange(prop.id, 'key', e.target.value)}
                                            disabled={!canEdit}
                                            className="font-medium"
                                            aria-label="Property Name"
                                        />
                                        <Input
                                            placeholder="Field Value"
                                            value={prop.value}
                                            onChange={(e) => handlePropertyChange(prop.id, 'value', e.target.value)}
                                            disabled={!canEdit}
                                            aria-label="Property Value"
                                        />
                                    </div>
                                    {canEdit && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteProperty(prop.id)}
                                            aria-label={`Delete property ${prop.key}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}

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
