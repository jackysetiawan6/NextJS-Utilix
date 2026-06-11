'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface RoleContextType {
  role: Role;
  attemptRoleChange: (passcode: string) => Role | undefined;
  hasPermission: (requiredRole: Role) => boolean;
}

const RoleContext = createContext<RoleContextType | null>(null);

const PASSCODES: Record<string, Role> = {
  '333': 'Supervisor',
  '3333': 'Supervisor',
  '222': 'Operator',
  '2222': 'Operator',
  '111': 'ViewOnly',
  '1111': 'ViewOnly',
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('ViewOnly');
  const { toast } = useToast();

  const attemptRoleChange = (passcode: string): Role | undefined => {
    if (passcode === '') {
      setRole('ViewOnly');
      toast({
        title: 'Switched to ViewOnly',
        description: 'You are now in view-only mode.',
      });
      return 'ViewOnly';
    }

    const newRole = PASSCODES[passcode];
    if (newRole) {
      setRole(newRole);
      toast({
        title: 'Access Granted',
        description: `You now have ${newRole} permissions.`,
      });
      return newRole;
    } else {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'The passcode entered is incorrect.',
      });
      return undefined;
    }
  };

  const hasPermission = (requiredRole: Role): boolean => {
    const roleHierarchy: Record<Role, number> = {
      'ViewOnly': 0,
      'Operator': 1,
      'Supervisor': 2,
    };
    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  };

  return (
    <RoleContext.Provider value={{ role, attemptRoleChange, hasPermission }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
