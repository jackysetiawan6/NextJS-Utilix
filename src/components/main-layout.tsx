'use client';

import Header from '@/components/header';
import DiagramCanvas from '@/components/diagram-canvas';
import DiagramSidebar from './diagram-sidebar';
import { useDiagram } from '@/contexts/diagram-context';
import { useAuth } from '@/contexts/auth-context';
import { ReactNode, useState, useEffect, useRef } from 'react';
import { Skeleton } from './ui/skeleton';
import LoadingScreen from './ui/loading-screen';

export default function MainLayout({ children }: { children?: ReactNode }) {
  const { selectedNode, isLoading: isDiagramLoading } = useDiagram();
  const { isLoading: isAuthLoading, locationKeyword } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const prevKeywordRef = useRef<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (locationKeyword) {
      prevKeywordRef.current = locationKeyword;
    }
  }, [locationKeyword]);

  const isCleaning = isAuthLoading && !locationKeyword && prevKeywordRef.current !== null;
  const isPreparing = isDiagramLoading || (isAuthLoading && !isCleaning);
  const showLoader = isClient && (isPreparing || isCleaning);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground relative">
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
      <main className="flex-1 flex flex-row overflow-hidden relative">
        <div className="flex-1 relative">
          {children || <DiagramCanvas />}
        </div>
        {selectedNode && <DiagramSidebar />}
      </main>
      
      {showLoader && (
        <LoadingScreen 
          type={isCleaning ? 'cleaning' : 'preparing'} 
          message={
            isCleaning 
              ? 'Cleaning secure workspace...' 
              : isDiagramLoading 
              ? 'Configuring electrical topology...' 
              : 'Securing Utilix gateway...'
          } 
        />
      )}
    </div>
  );
}
