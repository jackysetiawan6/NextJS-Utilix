'use client';
import { Plus, Save, Undo, Redo, SlidersHorizontal, CheckCircle, XCircle, Wrench, ScrollText, ChevronDown, Workflow, HelpCircle } from 'lucide-react';
import { useDiagram } from '@/contexts/diagram-context';
import { useRole } from '@/contexts/role-context';
import { Zap, LogOut, MapPin } from 'lucide-react';
import RoleSwitcher from './role-switcher';
import SearchPanel from './search-panel';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import type { Status } from '@/lib/types';
import { ThemeToggle } from './theme-toggle';
import Link from 'next/link';
import { logEvent } from '@/lib/log-service';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { isMockDatabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';


const statusConfig = {
    Online: { icon: CheckCircle, color: 'text-[hsl(var(--status-online))]', label: 'Online' },
    Offline: { icon: XCircle, color: 'text-[hsl(var(--status-offline))]', label: 'Offline' },
    Maintenance: { icon: Wrench, color: 'text-[hsl(var(--status-maintenance))]', label: 'Maintenance' },
};

function Legend() {
    return (
        <div className="space-y-4">
            <div>
                <h4 className="font-semibold mb-2 text-sm">Node Status</h4>
                <div className="space-y-2">
                    {Object.values(statusConfig).map(({icon: Icon, color, label}) => (
                        <div key={label} className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${color}`} />
                            <span className='text-sm'>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <h4 className="font-semibold mb-2 text-sm">Connection Color</h4>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-5 bg-[hsl(var(--source-a-color))] rounded-full" />
                        <span className='text-sm'>From Source A</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-5 bg-[hsl(var(--source-b-color))] rounded-full" />
                        <span className='text-sm'>From Source B</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatusFilter() {
    const { statusFilter, setStatusFilter } = useDiagram();

    const handleCheckedChange = (status: Status, checked: boolean) => {
        setStatusFilter({ ...statusFilter, [status]: checked });
    }

    return (
        <div>
            <h4 className="font-semibold mb-2 text-sm">Filter by Status</h4>
            <div className="space-y-2">
                {Object.keys(statusFilter).map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                            id={`filter-${status}`}
                            checked={statusFilter[status as Status]}
                            onCheckedChange={(checked) => handleCheckedChange(status as Status, !!checked)}
                        />
                        <label
                            htmlFor={`filter-${status}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            {status}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    )
}

function DiagramSettings() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <SlidersHorizontal className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-4">
          <Legend />
          <Separator />
          <StatusFilter />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SaveStatus() {
  const { isDirty, saveDiagram, discardChanges, undo, redo, canUndo, canRedo } = useDiagram();
  
  return (
    <div className="flex items-center gap-2">
      {isDirty ? (
        <Badge variant="destructive">Unsaved</Badge>
      ) : (
        <Badge variant="secondary">Saved</Badge>
      )}
       <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={undo} disabled={!canUndo}><Undo className="h-5 w-5" /></Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={redo} disabled={!canRedo}><Redo className="h-5 w-5" /></Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={saveDiagram} disabled={!isDirty}><Save className="h-5 w-5" /></Button>
            </TooltipTrigger>
            <TooltipContent>Save changes</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={discardChanges} disabled={!isDirty}><Zap className="h-5 w-5" /></Button>
            </TooltipTrigger>
            <TooltipContent>Discard changes</TooltipContent>
          </Tooltip>
        </TooltipProvider>
    </div>
  );
}

function DiagramActions() {
    const { addPanel, addSourcePanel } = useDiagram();
    const { role, hasPermission } = useRole();
  
    const canEdit = hasPermission('Supervisor');

    const handleAddPanel = () => {
      const newPanelId = addPanel();
      if (newPanelId) {
        logEvent({ role, action: 'Add Panel', details: `Added new distribution panel with ID: ${newPanelId}` });
      }
    }

    const handleAddSource = (group: 'A' | 'B') => {
        const newSourceId = addSourcePanel(group);
        if (newSourceId) {
            logEvent({ role, action: 'Add Source', details: `Added new source panel in group ${group} with ID: ${newSourceId}` });
        }
    }
  
    return (
        <DropdownMenu>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button disabled={!canEdit}>
                                <Plus className="h-5 w-5" />
                                <span>Add</span>
                                <ChevronDown className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{canEdit ? 'Add new element' : 'Permission denied'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={handleAddPanel}>
                    Add Distribution Panel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleAddSource('A')}>
                    Add Source (Group A)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAddSource('B')}>
                    Add Source (Group B)
                </DropdownMenuItem>
            </DropdownMenuContent>
      </DropdownMenu>
    );
  }

function AutoLayoutButton() {
  const { layoutDiagram } = useDiagram();
  const { hasPermission } = useRole();
  const canLayout = hasPermission('Supervisor');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={layoutDiagram}
            disabled={!canLayout}
            aria-label="Auto-align Downstream Panels"
          >
            <Workflow className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{canLayout ? 'Auto-align Downstream Panels (Topological)' : 'Permission Denied (Requires Supervisor)'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SystemGuide() {
  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" aria-label="System Guide">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>System Guide & Help</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Zap className="h-6 w-6 text-primary" />
            Utilix System Guide
          </DialogTitle>
          <DialogDescription>
            Reference manual for electrical flow simulation, control options, and keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm leading-relaxed">
          <section className="space-y-1.5">
            <h4 className="font-semibold text-foreground">1. Passcodes & Permissions</h4>
            <p className="text-muted-foreground">
              To edit the layout or operate breakers, elevate your role using the switcher at the top right:
            </p>
            <ul className="list-disc list-inside text-muted-foreground pl-2 space-y-0.5">
              <li><strong className="text-foreground">Supervisor (Passcode: 333 / 3333):</strong> Full layout control (add/delete panels, connect boards, edit properties, topological auto-layout).</li>
              <li><strong className="text-foreground">Operator (Passcode: 222 / 2222):</strong> Operational control (open/close manual breakers, toggle incoming priorities).</li>
              <li><strong className="text-foreground">View-Only (Passcode: 111 / 1111 or blank):</strong> Read-only monitoring of the electrical tree.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-semibold text-foreground">2. Connection Control Modes (Selector)</h4>
            <p className="text-muted-foreground">
              Each electrical line has an individual selector mode managed in the panel details sidebar:
            </p>
            <ul className="list-disc list-inside text-muted-foreground pl-2 space-y-0.5">
              <li><strong className="text-foreground">Auto:</strong> Breakers open/close dynamically based on upstream power availability. If multiple sources are active, the ATS honors the priority toggle.</li>
              <li><strong className="text-foreground">Manual:</strong> Users can manually open/close the breaker via a toggle switch (available to Operators and Supervisors).</li>
              <li><strong className="text-foreground">Off:</strong> The connection is completely cut off, locking the breaker open.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-semibold text-foreground">3. Safety Features (Interlock Rule)</h4>
            <p className="text-muted-foreground">
              To prevent dangerous short circuits, Utilix enforces interlock rules. The system blocks closing multiple incoming breakers on a single panel if they are in <code className="bg-muted px-1 rounded">Manual</code> mode and more than one active source is connected.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-semibold text-foreground">4. Keyboard Shortcuts</h4>
            <div className="grid grid-cols-2 gap-2 pl-2">
              <div className="flex items-center gap-2"><kbd className="bg-muted px-1.5 py-0.5 rounded border text-xs">Ctrl + K</kbd> <span>Open panel search</span></div>
              <div className="flex items-center gap-2"><kbd className="bg-muted px-1.5 py-0.5 rounded border text-xs">Ctrl + C</kbd> <span>Copy selected panels</span></div>
              <div className="flex items-center gap-2"><kbd className="bg-muted px-1.5 py-0.5 rounded border text-xs">Ctrl + V</kbd> <span>Paste copied panels</span></div>
              <div className="flex items-center gap-2"><kbd className="bg-muted px-1.5 py-0.5 rounded border text-xs">Delete / Backspace</kbd> <span>Remove elements</span></div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Header() {
  const { locationKeyword, logout } = useAuth();

  return (
    <header className="flex items-center justify-between p-3 border-b bg-card shadow-sm z-10 h-16 shrink-0">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <Zap className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Utilix
          </h1>
        </Link>
        {locationKeyword && (
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-semibold font-mono border bg-card/50">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>{locationKeyword}</span>
          </Badge>
        )}
        {isMockDatabase && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-500 gap-1.5 px-2.5 py-0.5 text-xs font-semibold cursor-help select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Mock Mode
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Using local fallback credentials. Changes will not persist across page refreshes. Set up Supabase environment variables to sync to a database.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex items-center gap-4">
        <SaveStatus />
        <Separator orientation='vertical' className='h-8' />
        <SearchPanel />
        <DiagramActions />
        <AutoLayoutButton />
        <DiagramSettings />
        <ThemeToggle />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/log" passHref>
                <Button variant="outline" size="icon" aria-label="View Logs">
                  <ScrollText className="h-5 w-5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Event Log</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <SystemGuide />
        <RoleSwitcher />
        <Separator orientation='vertical' className='h-8' />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={logout}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                aria-label="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sign Out / Switch Location</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
