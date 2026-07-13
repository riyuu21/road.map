"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { AuthDialog } from "./AuthDialog";

export function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[200px] truncate text-xs text-muted sm:block" title={user.email}>
          {user.email}
        </span>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut size={14} aria-hidden />
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Sign in
      </Button>
      <AuthDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
