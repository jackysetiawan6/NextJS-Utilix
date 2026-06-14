'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, MapPin, Zap, Lock, ShieldCheck, HelpCircle, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuthModal() {
  const { user, locationKeyword, login, register, loginDemo, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [keyword, setKeyword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();

  // If user is already authenticated and has a location, do not show the modal
  if (user && locationKeyword) {
    return null;
  }

  const validateInputs = (): boolean => {
    setErrorMsg(null);
    const trimmedKeyword = keyword.trim();

    if (activeTab === 'register' && trimmedKeyword.length < 8) {
      setErrorMsg('Location keyword must be at least 8 characters long.');
      return false;
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(trimmedKeyword)) {
      setErrorMsg('Location keyword must contain only letters, numbers, hyphens, or underscores.');
      return false;
    }

    if (activeTab === 'register' && passcode.length < 6) {
      setErrorMsg('Location passcode must be at least 6 characters long.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    try {
      if (activeTab === 'login') {
        await login(keyword, passcode);
      } else {
        await register(keyword, passcode);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      {/* Lock Screen Content Card */}
      <div className="relative w-full max-w-[460px] mx-4 p-8 bg-card/65 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl z-10 transition-all duration-300 transform scale-100 hover:border-primary/30">
        
        {/* Glow Border Effect */}
        <div className="absolute inset-px rounded-2xl bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-3 mb-6 relative">
          <div className="p-3 bg-primary/10 rounded-full border border-primary/20 shadow-inner shadow-primary/10">
            <img src="/logo.png" alt="Utilix Logo" className="h-8 w-8 object-contain rounded-md" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
              Utilix Security Gate
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Access secure diagram locations with credentials.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-lg border mb-6 relative">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
            }}
            disabled={isLoading}
            className={`py-2 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'login'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/20'
            }`}
          >
            Access Location
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg(null);
            }}
            disabled={isLoading}
            className={`py-2 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'register'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/20'
            }`}
          >
            Register Location
          </button>
        </div>

        {/* Auth Error Display */}
        {errorMsg && (
          <div className="p-3 mb-4 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
            <Lock className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div className="space-y-2">
            <Label htmlFor="keyword" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Location Keyword
            </Label>
            <div className="relative">
              <Input
                id="keyword"
                type="text"
                placeholder="e.g. location001"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={isLoading}
                required
                className="pl-3 pr-10 focus-visible:ring-primary/40 focus-visible:border-primary/80 transition-all font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none pointer-events-none">
                {keyword.length > 0 && `${keyword.length} chars`}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/80 leading-normal pl-0.5">
              Unique name for this location site. (Min. 8 characters, alphanumeric/hyphens)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passcode" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <KeyRound className="h-4 w-4 text-primary" />
              Location Passcode / Password
            </Label>
            <div className="relative">
              <Input
                id="passcode"
                type="password"
                placeholder="••••••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={isLoading}
                required
                className="pl-3 pr-3 focus-visible:ring-primary/40 focus-visible:border-primary/80 transition-all"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/80 leading-normal pl-0.5">
              Secret access passcode for this location. (Min. 6 characters)
            </p>
          </div>

          <Button
            type="submit"
            className="w-full mt-6 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : activeTab === 'login' ? (
              <>
                <ShieldCheck className="h-4 w-4" />
                Unlock Location
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Create Location Site
              </>
            )}
          </Button>

          {/* Quick Demo Selector */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border/60"></div>
            <span className="flex-shrink mx-4 text-muted-foreground text-[10px] uppercase font-bold tracking-wider select-none">Or</span>
            <div className="flex-grow border-t border-border/60"></div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={loginDemo}
            disabled={isLoading}
            className="w-full border-dashed border-primary/40 hover:border-primary/80 hover:bg-primary/5 text-primary font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Play className="h-4 w-4" />
            Try Quick Demo (Mock Mode)
          </Button>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 rounded-lg bg-muted/40 border text-xs text-muted-foreground leading-relaxed flex gap-2 relative">
          <HelpCircle className="h-4 w-4 text-primary/80 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Global Role Passcodes</p>
            <p>
              Use <code>111</code> (View-Only), <code>222</code> (Operator), or <code>333</code> (Supervisor) to manage user permissions once inside the diagram location.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
