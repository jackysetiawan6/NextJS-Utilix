'use client';

import Header from '@/components/header';
import DiagramCanvas from '@/components/diagram-canvas';
import DiagramSidebar from './diagram-sidebar';
import { useDiagram } from '@/contexts/diagram-context';
import { ReactNode, useState, useEffect } from 'react';
import { Skeleton } from './ui/skeleton';

export default function MainLayout({ children }: { children?: ReactNode }) {
  const { selectedNode, isLoading } = useDiagram();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {isClient ? <Header /> : (
        <div className="flex items-center justify-between p-3 border-b bg-card shadow-sm z-10 h-16 shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7" />
            <Skeleton className="h-7 w-24" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      )}
      <main className="flex-1 flex flex-row overflow-hidden">
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-8 w-48" />
                <p className="text-muted-foreground">Loading Diagram...</p>
              </div>
            </div>
          ) : (
            children || <DiagramCanvas />
          )}
        </div>
        {selectedNode && <DiagramSidebar />}
      </main>
    </div>
  );
}
