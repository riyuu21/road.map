"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/landing/Logo";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { EXAMPLE_TOPICS } from "@/lib/demo-content";
import { useAuth } from "@/hooks/use-auth";
import { useRoadmap } from "@/hooks/use-roadmap";
import { useProgress } from "@/hooks/use-progress";
import { RoadmapCanvas } from "./RoadmapCanvas";

const LEGEND = [
  { label: "Beginner", className: "bg-primary" },
  { label: "Intermediate", className: "bg-secondary" },
  { label: "Advanced", className: "bg-success" },
] as const;

interface RecentItem {
  topic: string;
  concepts: number;
  source: string;
}

export function RoadmapWorkspace() {
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const { roadmap, status, error, errorCode, generate } = useRoadmap(token);
  const { progressByNode, overall, isChecked, toggleSubtopic, toggleNode, reset } =
    useProgress(roadmap);
  const [topic, setTopic] = useState(searchParams.get("topic") ?? "");
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const autoRan = useRef(false);

  useEffect(() => {
    const fromUrl = searchParams.get("topic");
    if (fromUrl && !autoRan.current) {
      autoRan.current = true;
      generate(fromUrl);
    }
  }, [searchParams, generate]);

  useEffect(() => {
    if (status !== "idle" && status !== "success") return;
    fetch("/api/roadmaps", token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then((r) => (r.ok ? r.json() : []))
      .then((items: RecentItem[]) => setRecent(items))
      .catch(() => {});
  }, [status, token]);

  const submit = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed || status === "loading") return;
    setTopic(trimmed);
    generate(trimmed);
  };

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-background/80 px-5 backdrop-blur-xl">
        <Logo />
        <div className="flex items-center gap-4">
          <p className="hidden text-xs text-faint sm:block">Roadmap Generator</p>
          <AccountMenu />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Controls */}
        <aside className="shrink-0 border-b border-line p-5 lg:w-[340px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(topic);
            }}
          >
            <label htmlFor="topic" className="text-sm font-medium">
              What do you want to learn?
            </label>
            <Input
              id="topic"
              className="mt-2"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. System Design"
              maxLength={80}
              autoComplete="off"
            />
            <Button type="submit" className="mt-3 w-full" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  Mapping dependencies…
                </>
              ) : (
                <>
                  Generate Roadmap
                  <ArrowRight size={16} aria-hidden />
                </>
              )}
            </Button>
          </form>

          <div className="mt-5">
            <p className="text-xs text-faint">Examples</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLE_TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => submit(t)}
                  className="rounded-full border border-line bg-card px-3 py-1 text-xs text-muted transition-colors hover:border-primary/40 hover:text-white"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {recent.length > 0 && (
            <div className="mt-5">
              <p className="text-xs text-faint">Recent</p>
              <ul className="mt-2 space-y-1">
                {recent.map((r) => (
                  <li key={r.topic}>
                    <button
                      type="button"
                      onClick={() => submit(r.topic)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-muted transition-colors hover:bg-elevated hover:text-white"
                    >
                      <span className="truncate">{r.topic}</span>
                      <span className="shrink-0 text-[10px] text-faint">
                        {r.concepts} · {r.source === "ai" ? "AI" : "curated"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {roadmap && status === "success" && (
            <div className="mt-6 rounded-xl border border-line bg-card p-4">
              <p className="text-sm font-medium">{roadmap.topic}</p>
              <p className="mt-1 text-xs text-faint">
                {roadmap.nodes.length} concepts · {roadmap.edges.length} dependencies ·{" "}
                {roadmap.source === "ai" ? `AI · ${roadmap.provider ?? "model"}` : "curated"}
                {roadmap.cached ? " · cached" : ""}
              </p>
              <div className="mt-3 border-t border-line pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">Your progress</p>
                  <span className="text-xs tabular-nums text-faint">{overall}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full bg-brand-gradient transition-[width] duration-300"
                    style={{ width: `${overall}%` }}
                  />
                </div>
                {overall > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-2 text-xs text-faint transition-colors hover:text-white"
                  >
                    Reset progress
                  </button>
                )}
              </div>
              <div className="mt-3 space-y-1.5">
                {LEGEND.map((l) => (
                  <p key={l.label} className="flex items-center gap-2 text-xs text-muted">
                    <span className={`h-2 w-2 rounded-full ${l.className}`} />
                    {l.label}
                  </p>
                ))}
              </div>
              <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-faint">
                Click a block and tick off subtopics as you learn them — progress is{" "}
                {user ? "synced to your account" : "saved on this device; sign in to sync"}.
                Use a block&apos;s chevron to collapse everything that builds on it. Scroll
                to zoom, drag to pan.
              </p>
            </div>
          )}
        </aside>

        {/* Canvas */}
        <main className="relative min-h-0 flex-1" aria-busy={status === "loading"}>
          {status === "idle" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-card text-primary-glow">
                <Map size={20} aria-hidden />
              </span>
              <p className="text-sm font-medium">Your roadmap will appear here</p>
              <p className="max-w-xs text-xs leading-relaxed text-faint">
                Enter a topic or pick an example to generate an interactive learning path.
              </p>
            </div>
          )}

          {status === "loading" && (
            <div className="flex h-full flex-col gap-4 p-6" aria-label="Generating roadmap">
              <Skeleton className="mx-auto h-20 w-60" />
              <div className="mx-auto flex gap-6">
                <Skeleton className="h-20 w-60" />
                <Skeleton className="hidden h-20 w-60 md:block" />
              </div>
              <div className="mx-auto flex gap-6">
                <Skeleton className="hidden h-20 w-60 sm:block" />
                <Skeleton className="h-20 w-60" />
                <Skeleton className="hidden h-20 w-60 lg:block" />
              </div>
              <Skeleton className="mx-auto h-20 w-60" />
            </div>
          )}

          {status === "error" && (
            <div role="alert" className="flex h-full items-center justify-center px-6">
              <div className="max-w-sm rounded-xl border border-danger/30 bg-danger/5 p-6 text-center">
                <AlertCircle size={20} className="mx-auto text-danger" aria-hidden />
                <p className="mt-3 text-sm font-medium">Couldn&apos;t generate the roadmap</p>
                <p className="mt-1 text-xs text-muted">{error}</p>
                {errorCode === "SIGNUP_REQUIRED" && (
                  <p className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-muted">
                    Sign up to generate your own roadmap and save progress.
                  </p>
                )}
                {errorCode === "PROVIDER_KEYS_REQUIRED" && (
                  <a
                    href="/onboarding/api-keys"
                    className="mt-3 block rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-muted transition-colors hover:text-white"
                  >
                    Add an API key to generate custom roadmaps. You can still browse demo roadmaps.
                  </a>
                )}
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => submit(topic)}>
                  Try again
                </Button>
              </div>
            </div>
          )}

          {status === "success" && roadmap && (
            <div className="h-full min-h-[60vh]">
              <RoadmapCanvas
                roadmap={roadmap}
                progress={progressByNode}
                tracking={{ isChecked, onToggleSubtopic: toggleSubtopic, onToggleNode: toggleNode }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
