"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

type Mode = "signin" | "signup";

const COPY: Record<Mode, { title: string; cta: string; switchLabel: string }> = {
  signin: { title: "Welcome back", cta: "Sign in", switchLabel: "New here? Create an account" },
  signup: { title: "Create your account", cta: "Sign up", switchLabel: "Already have an account? Sign in" },
};

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, signUp, continueWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Portal needs the DOM; wait for mount so we don't render during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await (mode === "signin" ? signIn : signUp)(email, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={COPY[mode].title}
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{COPY[mode].title}</h2>
            <p className="mt-1 text-xs text-faint">
              Sync your learning progress across devices.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-faint transition-colors hover:bg-elevated hover:text-white"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await continueWithGoogle();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Google login failed.");
                setBusy(false);
              }
            }}
          >
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-faint">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="auth-email" className="text-xs font-medium text-muted">
              Email
            </label>
            <Input
              id="auth-email"
              type="email"
              className="mt-1.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="text-xs font-medium text-muted">
              Password
            </label>
            <Input
              id="auth-password"
              type="password"
              className="mt-1.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : COPY[mode].cta}
          </Button>
        </form>

        <button
          type="button"
          onClick={switchMode}
          className="mt-4 w-full text-center text-xs text-faint transition-colors hover:text-white"
        >
          {COPY[mode].switchLabel}
        </button>
      </div>
    </div>,
    document.body
  );
}
