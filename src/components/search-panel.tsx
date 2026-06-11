'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, CircuitBoard, Zap, BatteryCharging, Server, Cpu, ArrowRightLeft, Snowflake, Wind, Fan, Lightbulb } from 'lucide-react';
import { useDiagram } from '@/contexts/diagram-context';
import { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { logEvent } from '@/lib/log-service';
import { useRole } from '@/contexts/role-context';


export default function SearchPanel() {
  const { nodes, panToNode } = useDiagram();
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])


  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const location = node.data.properties?.find(p => p.key.toLowerCase() === 'location')?.value || '';
      if (!query) return true;
      return (
        node.data.label.toLowerCase().includes(query.toLowerCase()) || 
        location.toLowerCase().includes(query.toLowerCase())
      );
    });
  }, [query, nodes]);

  const runCommand = (command: () => void, nodeLabel: string) => {
    setOpen(false)
    command()
    logEvent({ role, action: 'Search Navigation', details: `Navigated to panel: ${nodeLabel}` });
  }

  const getNodeIcon = (node: typeof nodes[number]) => {
    if (node.data.isSource) {
      if (node.data.sourceGroup === 'A') return Zap;
      if (node.data.sourceGroup === 'B') return BatteryCharging;
      return Zap;
    }
    switch (node.data.unitType) {
      case 'Utility':
        return Zap;
      case 'Generator':
        return BatteryCharging;
      case 'UPS':
        return Server;
      case 'PDU':
        return Cpu;
      case 'STS':
        return ArrowRightLeft;
      case 'Server Rack':
        return Server;
      case 'Chiller':
        return Snowflake;
      case 'AHU':
        return Wind;
      case 'FCU':
        return Fan;
      case 'Lamp':
        return Lightbulb;
      case 'LV Panel':
      default:
        return CircuitBoard;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-64 justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Search panels...
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search for a panel by name or location..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Panels">
            {filteredNodes.map(node => {
              const location = node.data.properties?.find(p => p.key.toLowerCase() === 'location')?.value;
              const Icon = getNodeIcon(node);
              const isSourceA = node.data.isSource && node.data.sourceGroup === 'A';
              const isSourceB = node.data.isSource && node.data.sourceGroup === 'B';
              
              const iconColor = isSourceA 
                ? 'text-[hsl(var(--source-a-color))]' 
                : isSourceB 
                  ? 'text-[hsl(var(--source-b-color))]' 
                  : 'text-muted-foreground';

              return (
                <CommandItem
                  key={node.id}
                  value={`${node.data.label} ${location || ''}`}
                  onSelect={() => {
                    runCommand(() => panToNode(node.id), node.data.label)
                  }}
                >
                  <Icon className={`mr-2 h-4 w-4 ${iconColor}`} />
                  <span>{node.data.label}</span>
                  {location && <span className="ml-2 text-xs text-muted-foreground">{location}</span>}
                  {node.data.isSource && (
                    <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      Source {node.data.sourceGroup || ''}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
