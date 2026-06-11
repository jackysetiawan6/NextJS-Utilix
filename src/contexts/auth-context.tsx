'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase, isMockDatabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | { id: string; email: string } | null;
  locationKeyword: string | null;
  isLoading: boolean;
  login: (keyword: string, passcode: string) => Promise<void>;
  register: (keyword: string, passcode: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | { id: string; email: string } | null>(null);
  const [locationKeyword, setLocationKeyword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load session from Supabase or LocalStorage on mount
  useEffect(() => {
    async function initSession() {
      try {
        if (isMockDatabase) {
          // Mock Mode session initialization
          const mockSession = localStorage.getItem('utilix_mock_session');
          if (mockSession) {
            const parsed = JSON.parse(mockSession);
            setUser(parsed.user);
            setLocationKeyword(parsed.locationKeyword);
            // Save active diagram ID for logger access
            window.sessionStorage.setItem('utilix_diagram_id', parsed.locationKeyword);
          }
        } else {
          // Real Supabase session initialization
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            // Extract keyword from email: keyword@utilix.local
            const email = session.user.email || '';
            const keyword = email.split('@')[0];
            setLocationKeyword(keyword);
            window.sessionStorage.setItem('utilix_diagram_id', keyword);
          }
          
          // Setup auth listener
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
              setUser(session.user);
              const email = session.user.email || '';
              const keyword = email.split('@')[0];
              setLocationKeyword(keyword);
              window.sessionStorage.setItem('utilix_diagram_id', keyword);
            } else {
              setUser(null);
              setLocationKeyword(null);
              window.sessionStorage.removeItem('utilix_diagram_id');
            }
          });

          return () => {
            subscription.unsubscribe();
          };
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  const login = async (keyword: string, passcode: string) => {
    setIsLoading(true);
    const sanitizedKeyword = keyword.trim().toLowerCase();
    const email = `${sanitizedKeyword}@utilix.local`;

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

        // Create mock session
        const mockUserObj = { id: `mock-uid-${sanitizedKeyword}`, email };
        setUser(mockUserObj);
        setLocationKeyword(sanitizedKeyword);
        window.sessionStorage.setItem('utilix_diagram_id', sanitizedKeyword);
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
          window.sessionStorage.setItem('utilix_diagram_id', sanitizedKeyword);
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
    const email = `${sanitizedKeyword}@utilix.local`;

    try {
      if (isMockDatabase) {
        // Mock Mode Registration
        const mockUsersRaw = localStorage.getItem('utilix_mock_users');
        const mockUsers = mockUsersRaw ? JSON.parse(mockUsersRaw) : {};

        if (mockUsers[sanitizedKeyword]) {
          throw new Error('This location keyword is already registered.');
        }

        // Save new user
        mockUsers[sanitizedKeyword] = passcode;
        localStorage.setItem('utilix_mock_users', JSON.stringify(mockUsers));

        // Auto-login after registration
        const mockUserObj = { id: `mock-uid-${sanitizedKeyword}`, email };
        setUser(mockUserObj);
        setLocationKeyword(sanitizedKeyword);
        window.sessionStorage.setItem('utilix_diagram_id', sanitizedKeyword);
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
        // 1. Sign up user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: passcode,
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // 2. Create the associated diagram entry
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
            // Even if diagram insert fails (e.g. database schema not applied yet), we are authenticated.
          }

          setUser(authData.user);
          setLocationKeyword(sanitizedKeyword);
          window.sessionStorage.setItem('utilix_diagram_id', sanitizedKeyword);

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

  const logout = async () => {
    setIsLoading(true);
    try {
      if (isMockDatabase) {
        setUser(null);
        setLocationKeyword(null);
        window.sessionStorage.removeItem('utilix_diagram_id');
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
        window.sessionStorage.removeItem('utilix_diagram_id');
        toast({
          title: 'Logged Out',
          description: 'Successfully signed out.',
        });
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
    <AuthContext.Provider value={{ user, locationKeyword, isLoading, login, register, logout }}>
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
