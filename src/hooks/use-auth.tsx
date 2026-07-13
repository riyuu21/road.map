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
}

interface AuthContextValue {
  user: { email: string } | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const STORAGE_KEY = "roadmap-auth";
const AuthContext = createContext<AuthContextValue | null>(null);

async function authenticate(path: string, email: string, password: string): Promise<Session> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data as Session;
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
    setSession(stored);
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${stored.token}` } })
      .then((res) => {
        // drop the session only on a definitive rejection, not a network blip
        if (res.status === 401) {
          localStorage.removeItem(STORAGE_KEY);
          setSession(null);
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: Session) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setSession(next);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) =>
      persist(await authenticate("/api/auth/login", email, password)),
    [persist]
  );

  const signUp = useCallback(
    async (email: string, password: string) =>
      persist(await authenticate("/api/auth/register", email, password)),
    [persist]
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
        user: session ? { email: session.email } : null,
        token: session?.token ?? null,
        signIn,
        signUp,
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
