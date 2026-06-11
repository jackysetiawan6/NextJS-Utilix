'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/main-layout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';
import type { LogEntry, Role } from '@/lib/types';
import { useRole } from '@/contexts/role-context';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { logEvent } from '@/lib/log-service';
import { supabase, isMockDatabase } from '@/lib/supabase';
import { getActiveDiagramId } from '@/lib/log-service';


function LogPageContent() {
  const { role, hasPermission } = useRole();
  const { toast } = useToast();

  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');
  const [actionFilter, setActionFilter] = useState('');
  const [detailsFilter, setDetailsFilter] = useState('');
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const diagramId = getActiveDiagramId();
    try {
      if (isMockDatabase) {
        // Mock Mode: Fetch logs from localStorage
        const storedLogsRaw = localStorage.getItem(`utilix_mock_logs_${diagramId}`);
        const storedLogs = storedLogsRaw ? JSON.parse(storedLogsRaw) : [];
        setLogs(storedLogs);
        return;
      }

      // Real Mode: Fetch logs filtered by current diagram_id
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('diagram_id', diagramId)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    if (isMockDatabase) {
      // Mock Mode: Listen to custom window event
      if (typeof window !== 'undefined') {
        window.addEventListener('mock_logs_changed', fetchLogs);
      }
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('mock_logs_changed', fetchLogs);
        }
      };
    }

    const diagramId = getActiveDiagramId();
    // Subscribe to live inserts and deletes on the logs table for this diagram
    const logsChannel = supabase
      .channel('schema-logs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logs', filter: `diagram_id=eq.${diagramId}` },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
    };
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      const roleMatch = roleFilter === 'All' || log.role === roleFilter;
      const actionMatch = actionFilter === '' || log.action.toLowerCase().includes(actionFilter.toLowerCase());
      const detailsMatch = detailsFilter === '' || log.details.toLowerCase().includes(detailsFilter.toLowerCase());
      return roleMatch && actionMatch && detailsMatch;
    });
  }, [logs, roleFilter, actionFilter, detailsFilter]);

  const handleClearLogs = async () => {
    if (!hasPermission('Supervisor')) {
        toast({ variant: 'destructive', title: 'Permission Denied' });
        return;
    }
    const diagramId = getActiveDiagramId();
    try {
        if (isMockDatabase) {
          localStorage.removeItem(`utilix_mock_logs_${diagramId}`);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('mock_logs_changed'));
          }
          toast({ title: 'Logs Cleared', description: 'All event logs have been successfully deleted.' });
          setIsClearAlertOpen(false);
          return;
        }

        const { error } = await supabase
          .from('logs')
          .delete()
          .eq('diagram_id', diagramId);
        if (error) throw error;

        await logEvent({ role, action: 'Clear Logs', details: `All log entries were deleted.` });
        toast({ title: 'Logs Cleared', description: 'All event logs have been successfully deleted.' });
    } catch (error) {
        console.error("Error clearing logs:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to clear logs.' });
    }
    setIsClearAlertOpen(false);
  }

  return (
    <>
    <div className="flex flex-col h-full">
      <header className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className='flex items-center gap-4'>
            <Link href="/" passHref>
              <Button variant="outline" size="icon" aria-label="Back to Diagram">
                  <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Event Log</h1>
              <p className="text-muted-foreground">A record of all significant user and system events.</p>
            </div>
          </div>
          {hasPermission('Supervisor') && (
            <Button variant="destructive" onClick={() => setIsClearAlertOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Log
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4">
            <Select value={roleFilter} onValueChange={(value: Role | 'All') => setRoleFilter(value)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Roles</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Operator">Operator</SelectItem>
                    <SelectItem value="ViewOnly">View-Only</SelectItem>
                </SelectContent>
            </Select>
            <Input 
                placeholder="Filter by action..." 
                value={actionFilter} 
                onChange={e => setActionFilter(e.target.value)}
                className="max-w-sm"
            />
            <Input 
                placeholder="Filter by details..." 
                value={detailsFilter} 
                onChange={e => setDetailsFilter(e.target.value)}
                className="flex-1"
            />
        </div>
      </header>
      <ScrollArea className="flex-1 p-4">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Timestamp</TableHead>
                <TableHead className="w-[120px]">Role</TableHead>
                <TableHead className="w-[180px]">Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading logs...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (!filteredLogs || filteredLogs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No log entries found for the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredLogs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'No timestamp'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.role === 'Supervisor' ? 'destructive' : log.role === 'Operator' ? 'secondary' : 'outline'}>
                      {log.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell className="max-w-md truncate">{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
    <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all
                event logs from the database.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearLogs} className="bg-destructive hover:bg-destructive/90">
                Continue
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

export default function LogPage() {
    return (
        <MainLayout>
            <LogPageContent />
        </MainLayout>
    );
}
