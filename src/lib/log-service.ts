import { supabase, isMockDatabase } from './supabase';
import type { Role } from './types';

interface LogPayload {
  role: Role;
  action: string;
  details: string;
}

export function getActiveDiagramId(): string {
  if (typeof window === 'undefined') return 'main-diagram';
  return window.sessionStorage.getItem('utilix_diagram_id') || 'main-diagram';
}

export async function logEvent(payload: LogPayload) {
  const diagramId = getActiveDiagramId();

  try {
    if (isMockDatabase) {
      // Mock Mode: Save log to localStorage
      const storedLogsRaw = localStorage.getItem(`utilix_mock_logs_${diagramId}`);
      const storedLogs = storedLogsRaw ? JSON.parse(storedLogsRaw) : [];
      const newLog = {
        id: `mock-log-id-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        role: payload.role,
        action: payload.action,
        details: payload.details,
        diagram_id: diagramId,
      };
      storedLogs.unshift(newLog);
      localStorage.setItem(`utilix_mock_logs_${diagramId}`, JSON.stringify(storedLogs));

      // Trigger standard window event to notify LogPage of updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mock_logs_changed'));
      }
      return;
    }

    const { error } = await supabase.from('logs').insert({
      role: payload.role,
      action: payload.action,
      details: payload.details,
      diagram_id: diagramId
    });
    if (error) throw error;
  } catch (error) {
    console.error("Failed to log event:", error);
  }
}
