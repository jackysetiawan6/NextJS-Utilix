'use client';

import { Zap, RefreshCw, ShieldCheck } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  type?: 'preparing' | 'cleaning' | 'general';
}

export default function LoadingScreen({ message, type = 'general' }: LoadingScreenProps) {
  const defaultMessage = 
    type === 'preparing' 
      ? 'Configuring electrical topology...' 
      : type === 'cleaning' 
      ? 'Cleaning secure workspace...' 
      : 'Securing Utilix gateway...';

  const displayMessage = message || defaultMessage;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-300">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none animate-pulse delay-75" />

      <div className="relative flex flex-col items-center p-8 text-center space-y-6 max-w-sm">
        {/* Animated logo wrapper */}
        <div className="relative flex items-center justify-center h-20 w-20">
          {/* Rotating gradient outer border */}
          <div className="absolute inset-0 rounded-full border border-primary/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary animate-spin" />
          
          {/* Inner icon selection depending on loading type */}
          <div className="relative p-4 bg-card rounded-full border border-border shadow-md">
            {type === 'cleaning' ? (
              <RefreshCw className="h-8 w-8 text-primary animate-spin [animation-duration:3s]" />
            ) : type === 'preparing' ? (
              <Zap className="h-8 w-8 text-primary animate-pulse" />
            ) : (
              <ShieldCheck className="h-8 w-8 text-primary" />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground tracking-wide uppercase text-[10px] tracking-wider text-muted-foreground">
            {type === 'preparing' ? 'Preparing Workspace' : type === 'cleaning' ? 'Resetting Gateway' : 'Processing'}
          </h3>
          <p className="text-sm font-medium text-foreground/80 animate-pulse">
            {displayMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
