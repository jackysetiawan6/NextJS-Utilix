'use client';

import { useState } from 'react';
import { KeyRound, User, Shield } from 'lucide-react';
import { useRole } from '@/contexts/role-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logEvent } from '@/lib/log-service';
import type { Role } from '@/lib/types';

const roleIcons = {
  Supervisor: <Shield className="h-4 w-4" />,
  Operator: <User className="h-4 w-4" />,
  ViewOnly: <User className="h-4 w-4 opacity-60" />,
};

const roleColors = {
  Supervisor: "bg-red-500 hover:bg-red-600",
  Operator: "bg-yellow-500 hover:bg-yellow-600",
  ViewOnly: "bg-green-500 hover:bg-green-600",
}

export default function RoleSwitcher() {
  const { role, attemptRoleChange } = useRole();
  const [open, setOpen] = useState(false);
  const [passcode, setPasscode] = useState('');

  const handleRoleChange = () => {
    const oldRole = role;
    const newRole = attemptRoleChange(passcode);
    if (newRole && newRole !== oldRole) {
      logEvent({ role: newRole as Role, action: 'Role Change', details: `User changed role from ${oldRole} to ${newRole}` });
    }
    setOpen(false);
    setPasscode('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Badge 
            className={`w-6 h-6 p-0 flex items-center justify-center text-white ${roleColors[role]}`}
          >
            {roleIcons[role]}
          </Badge>
          <span>{role}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Switch Role</DialogTitle>
          <DialogDescription>
            Enter a passcode to elevate your permissions. Leave blank for ViewOnly.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="passcode" className="text-right">
              Passcode
            </Label>
            <Input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="col-span-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRoleChange();
                }
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md space-y-1.5 mt-2 border border-border">
            <p className="font-semibold text-foreground">Available Passcodes for testing:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-medium text-foreground">Supervisor</span>: <code>333</code> or <code>3333</code> (Full editor control)</li>
              <li><span className="font-medium text-foreground">Operator</span>: <code>222</code> or <code>2222</code> (Breaker/ATS operations)</li>
              <li><span className="font-medium text-foreground">View-Only</span>: <code>111</code>, <code>1111</code> or leave blank</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleRoleChange}>
            <KeyRound className="mr-2 h-4 w-4" />
            Authenticate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
