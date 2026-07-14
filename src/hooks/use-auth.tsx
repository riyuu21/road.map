"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface Session {
  token: string;
  email: string;
  needsProviderOnboarding?: boolean | string;
}

interface AuthContextValue {
  user: { email: string; needsProviderOnboarding?: boolean } | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  continueWithGoogle: () => Promise<void>;
  completeGoogleLogin: (session: Session) => void;
  signOut: () => void;
}

const STORAGE_KEY = "roadmap-auth";
const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeSession(session: Session): Session {
  return {
    ...session,
    needsProviderOnboarding:
      session.needsProviderOnboarding === true || session.needsProviderOnboarding === "true",
  };
}

async function authenticate(path: string, email: string, password: string): Promise<Session> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return normalizeSession(data as Session);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  // restore after mount (no localStorage during SSR), then revalidate the token
  useEffect(() => {
    let stored: Session | null = null;
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Session | null;
    } catch {}
    if (!stored?.token) return;
    setSession(normalizeSession(stored));
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${stored.token}` } })
      .then(async (res) => {
        // drop the session only on a definitive rejection, not a network blip
        if (res.status === 401) {
          localStorage.removeItem(STORAGE_KEY);
          setSession(null);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          persist(normalizeSession({ ...stored, ...data, token: stored.token }));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((next: Session) => {
    const normalized = normalizeSession(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {}
    setSession(normalized);
  }, []);

  const maybeOnboard = useCallback((next: Session) => {
    if (normalizeSession(next).needsProviderOnboarding && window.location.pathname !== "/onboarding/api-keys") {
      window.location.assign("/onboarding/api-keys");
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const next = await authenticate("/api/auth/login", email, password);
      persist(next);
      maybeOnboard(next);
    },
    [maybeOnboard, persist]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const next = await authenticate("/api/auth/register", email, password);
      persist(next);
      maybeOnboard(next);
    },
    [maybeOnboard, persist]
  );

  const continueWithGoogle = useCallback(async () => {
    const res = await fetch("/api/auth/google/login-url");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Google login is not configured.");
    window.location.assign(data.url);
  }, []);

  const completeGoogleLogin = useCallback(
    (next: Session) => {
      persist(next);
      maybeOnboard(next);
    },
    [maybeOnboard, persist]
  );

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session
          ? { email: session.email, needsProviderOnboarding: Boolean(session.needsProviderOnboarding) }
          : null,
        token: session?.token ?? null,
        signIn,
        signUp,
        continueWithGoogle,
        completeGoogleLogin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
