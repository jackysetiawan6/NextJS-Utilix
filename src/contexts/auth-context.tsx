'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase, isMockDatabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | { id: string; email: string } | null;
  locationKeyword: string | null;
  isLoading: boolean;
  isMockSession: boolean;
  login: (keyword: string, passcode: string) => Promise<void>;
  register: (keyword: string, passcode: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | { id: string; email: string } | null>(null);
  const [locationKeyword, setLocationKeyword] = useState<string | null>(null);
  const [isMockSession, setIsMockSession] = useState(isMockDatabase);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load session from Supabase or LocalStorage on mount
  useEffect(() => {
    let subscription: any = null;

    async function initSession() {
      try {
        // First check if there is an active local mock session override
        const mockSession = localStorage.getItem('utilix_mock_session');
        if (mockSession) {
          const parsed = JSON.parse(mockSession);
          setUser(parsed.user);
          setLocationKeyword(parsed.locationKeyword);
          setIsMockSession(true);
          window.sessionStorage.setItem('utilix_diagram_id', parsed.locationKeyword);
          window.sessionStorage.setItem('utilix_is_mock_session', 'true');
        } else if (isMockDatabase) {
          // No session yet, but database is mock by default
          setIsMockSession(true);
          window.sessionStorage.setItem('utilix_is_mock_session', 'true');
        } else {
          // Real Supabase session initialization
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            const email = session.user.email || '';
            const keyword = email.split('@')[0];
            setLocationKeyword(keyword);
            setIsMockSession(false);
            window.sessionStorage.setItem('utilix_diagram_id', keyword);
            window.sessionStorage.setItem('utilix_is_mock_session', 'false');
          } else {
            setUser(null);
            setLocationKeyword(null);
            setIsMockSession(true);
            window.sessionStorage.removeItem('utilix_diagram_id');
            window.sessionStorage.setItem('utilix_is_mock_session', 'true');
          }
          
          // Setup auth listener
          const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const hasMockSession = !!localStorage.getItem('utilix_mock_session');
            if (hasMockSession) return; // Ignore Supabase updates if running in local demo override

            if (session?.user) {
              setUser(session.user);
              const email = session.user.email || '';
              const keyword = email.split('@')[0];
              setLocationKeyword(keyword);
              setIsMockSession(false);
              window.sessionStorage.setItem('utilix_diagram_id', keyword);
              window.sessionStorage.setItem('utilix_is_mock_session', 'false');
            } else {
              setUser(null);
              setLocationKeyword(null);
              setIsMockSession(true);
              window.sessionStorage.removeItem('utilix_diagram_id');
              window.sessionStorage.setItem('utilix_is_mock_session', 'true');
            }
          });
          subscription = sub;
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (keyword: string, passcode: string) => {
    setIsLoading(true);
    const sanitizedKeyword = keyword.trim().toLowerCase();
    const email = `${sanitizedKeyword}@gmail.com`;

    try {
      if (isMockDatabase) {
        // Mock Mode Authentication
        const mockUsersRaw = localStorage.getItem('utilix_mock_users');
        const mockUsers = mockUsersRaw ? JSON.parse(mockUsersRaw) : {};

        if (!mockUsers[sanitizedKeyword]) {
          throw new Error('Location keyword not found. Please register first.');
        }

        if (mockUsers[sanitizedKeyword] !== passcode) {
          throw new Error('Incorrect location passcode.');
        }

        const mockUserObj = { id: `mock-uid-${sanitizedKeyword}`, email };
        setUser(mockUserObj);
        setLocationKeyword(sanitizedKeyword);
        setIsMockSession(true);
        window.sessionStorage.setItem('utilix_diagram_id', sanitizedKeyword);
        window.sessionStorage.setItem('utilix_is_mock_session', 'true');
        localStorage.setItem(
          'utilix_mock_session',
          JSON.stringify({ user: mockUserObj, locationKeyword: sanitizedKeyword })
        );

        toast({
          title: 'Welcome Back',
          description: `Logged in to location: ${sanitizedKeyword} (Mock Mode)`,
        });
      } else {
        // Real Supabase Authentication
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: passcode,
        });

        if (error) throw error;

        if (data.user) {
          setUser(data.user);
          setLocationKeyword(sanitizedKeyword);
          setIsMockSession(false);
          window.sessionStorage.setItem('utilix_diagram_id', sanitizedKeyword);
          window.sessionStorage.setItem('utilix_is_mock_session', 'false');
          // Clear any local mock session overrides
          localStorage.removeItem('utilix_mock_session');
          toast({
            title: 'Welcome Back',
            description: `Successfully logged in to location: ${sanitizedKeyword}`,
          });
        }
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.message || 'Incorrect keyword or passcode.',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (keyword: string, passcode: string) => {
    setIsLoading(true);
    const sanitizedKeyword = keyword.trim().toLowerCase();
    const email = `${sanitizedKeyword}@gmail.com`;

    try {
      if (isMockDatabase) {
        // Mock Mode Registration
        const mockUsersRaw = localStorage.getItem('utilix_mock_users');
        const mockUsers = mockUsersRaw ? JSON.parse(mockUsersRaw) : {};

        if (mockUsers[sanitizedKeyword]) {
          throw new Error('This location keyword is already registered.');
        }

        mockUsers[sanitizedKeyword] = passcode;
        localStorage.setItem('utilix_mock_users', JSON.stringify(mockUsers));

        const mockUserObj = { id: `mock-uid-${sanitizedKeyword}`, email };
        setUser(mockUserObj);
        setLocationKeyword(sanitizedKeyword);
        setIsMockSession(true);
        window.sessionStorage.setItem('utilix_diagram_id', sanitizedKeyword);
        window.sessionStorage.setItem('utilix_is_mock_session', 'true');
        localStorage.setItem(
          'utilix_mock_session',
          JSON.stringify({ user: mockUserObj, locationKeyword: sanitizedKeyword })
        );

        toast({
          title: 'Location Registered',
          description: `Location ${sanitizedKeyword} registered successfully. (Mock Mode)`,
        });
      } else {
        // Real Supabase Registration
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: passcode,
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: diagramError } = await supabase
            .from('diagrams')
            .insert({
              id: sanitizedKeyword,
              name: `Diagram for ${sanitizedKeyword}`,
              owner_id: authData.user.id,
              members: { [authData.user.id]: 'owner' }
            });

          if (diagramError) {
            console.error('Error creating diagram document:', diagramError);
          }

          setUser(authData.user);
          setLocationKeyword(sanitizedKeyword);
          setIsMockSession(false);
          window.sessionStorage.setItem('utilix_diagram_id', sanitizedKeyword);
          window.sessionStorage.setItem('utilix_is_mock_session', 'false');
          // Clear any local mock session overrides
          localStorage.removeItem('utilix_mock_session');

          toast({
            title: 'Location Registered',
            description: `Successfully registered location: ${sanitizedKeyword}`,
          });
        }
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message || 'Could not register location keyword.',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = async () => {
    setIsLoading(true);
    try {
      const demoKeyword = 'local-demo';
      const mockUserObj = { id: 'mock-uid-demo', email: 'demo@gmail.com' };
      setUser(mockUserObj);
      setLocationKeyword(demoKeyword);
      setIsMockSession(true);
      window.sessionStorage.setItem('utilix_diagram_id', demoKeyword);
      window.sessionStorage.setItem('utilix_is_mock_session', 'true');
      localStorage.setItem(
        'utilix_mock_session',
        JSON.stringify({ user: mockUserObj, locationKeyword: demoKeyword })
      );

      toast({
        title: 'Local Sandbox Activated',
        description: 'Running in local Demo Mode. Data is saved in your browser.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Demo Error',
        description: error.message || 'Failed to enter Demo Mode.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const hasMockSession = !!localStorage.getItem('utilix_mock_session');
      if (hasMockSession || isMockDatabase) {
        setUser(null);
        setLocationKeyword(null);
        setIsMockSession(true);
        window.sessionStorage.removeItem('utilix_diagram_id');
        window.sessionStorage.setItem('utilix_is_mock_session', 'true');
        localStorage.removeItem('utilix_mock_session');
        toast({
          title: 'Logged Out',
          description: 'You have left the active location.',
        });
      } else {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setLocationKeyword(null);
        setIsMockSession(true);
        window.sessionStorage.removeItem('utilix_diagram_id');
        window.sessionStorage.setItem('utilix_is_mock_session', 'true');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Out Error',
        description: error.message || 'Failed to sign out.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, locationKeyword, isLoading, isMockSession, login, register, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
