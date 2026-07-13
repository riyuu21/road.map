"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Roadmap } from "@/types/roadmap";
import { useAuth } from "@/hooks/use-auth";

/**
 * Per-topic learning progress. Always persisted in localStorage; when signed
 * in it also syncs to the account (merged on load, debounced PUT on change).
 * Completed subtopic indices per node id; nodes without subtopics count as a
 * single implicit item, so [0] means "done".
 */
type TopicProgress = Record<string, number[]>;

const storageKey = (topic: string) => `roadmap-progress:${topic.trim().toLowerCase()}`;
const apiPath = (topic: string) => `/api/progress/${encodeURIComponent(topic.trim().toLowerCase())}`;

function load(topic: string): TopicProgress {
  try {
    return JSON.parse(localStorage.getItem(storageKey(topic)) ?? "{}") as TopicProgress;
  } catch {
    return {};
  }
}

function store(topic: string, progress: TopicProgress) {
  try {
    localStorage.setItem(storageKey(topic), JSON.stringify(progress));
  } catch {
    // storage full or blocked — progress still works for the session
  }
}

/** Union of checked indices, so neither device loses ticks. */
function merge(a: TopicProgress, b: TopicProgress): TopicProgress {
  const out: TopicProgress = { ...a };
  for (const [nodeId, indices] of Object.entries(b)) {
    out[nodeId] = [...new Set([...(out[nodeId] ?? []), ...indices])].sort((x, y) => x - y);
  }
  return out;
}

const itemCount = (subtopics?: string[]) => Math.max(1, subtopics?.length ?? 0);

export function useProgress(roadmap: Roadmap | null) {
  const topic = roadmap?.topic ?? "";
  const { token } = useAuth();
  const [progress, setProgress] = useState<TopicProgress>({});
  const putTimer = useRef<ReturnType<typeof setTimeout>>();

  const push = useCallback((t: string, tok: string, nodes: TopicProgress) => {
    fetch(apiPath(t), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
      body: JSON.stringify(nodes),
    }).catch(() => {});
  }, []);

  // load after mount / on topic or sign-in change — localStorage isn't
  // available during SSR; when signed in, merge the account copy on top
  useEffect(() => {
    if (!topic) {
      setProgress({});
      return;
    }
    const local = load(topic);
    setProgress(local);
    if (!token) return;

    let cancelled = false;
    fetch(apiPath(topic), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { nodes?: TopicProgress } | null) => {
        if (cancelled || !data) return;
        const server = data.nodes ?? {};
        const merged = merge(local, server);
        store(topic, merged);
        setProgress((prev) => merge(prev, server));
        // bring the account up to date with ticks made while signed out
        if (JSON.stringify(merged) !== JSON.stringify(server)) push(topic, token, merged);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [topic, token, push]);

  useEffect(() => () => clearTimeout(putTimer.current), []);

  const update = useCallback(
    (mutate: (prev: TopicProgress) => TopicProgress) => {
      setProgress((prev) => {
        const next = mutate(prev);
        store(topic, next);
        if (token) {
          clearTimeout(putTimer.current);
          putTimer.current = setTimeout(() => push(topic, token, next), 600);
        }
        return next;
      });
    },
    [topic, token, push]
  );

  const isChecked = useCallback(
    (nodeId: string, index: number) => (progress[nodeId] ?? []).includes(index),
    [progress]
  );

  const toggleSubtopic = useCallback(
    (nodeId: string, index: number) =>
      update((prev) => {
        const checked = new Set(prev[nodeId] ?? []);
        if (checked.has(index)) checked.delete(index);
        else checked.add(index);
        const next = { ...prev, [nodeId]: [...checked].sort((a, b) => a - b) };
        if (!checked.size) delete next[nodeId];
        return next;
      }),
    [update]
  );

  /** Completes the whole node, or clears it when already complete. */
  const toggleNode = useCallback(
    (nodeId: string) => {
      const node = roadmap?.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const total = itemCount(node.subtopics);
      update((prev) => {
        const next = { ...prev };
        if ((prev[nodeId] ?? []).length >= total) delete next[nodeId];
        else next[nodeId] = Array.from({ length: total }, (_, i) => i);
        return next;
      });
    },
    [roadmap, update]
  );

  const reset = useCallback(() => {
    update(() => ({}));
    try {
      localStorage.removeItem(storageKey(topic));
    } catch {}
  }, [topic, update]);

  const progressByNode = useMemo(() => {
    const map = new Map<string, number>();
    for (const node of roadmap?.nodes ?? []) {
      const total = itemCount(node.subtopics);
      const done = Math.min((progress[node.id] ?? []).length, total);
      map.set(node.id, Math.round((done / total) * 100));
    }
    return map;
  }, [roadmap, progress]);

  const overall = useMemo(() => {
    if (!progressByNode.size) return 0;
    let sum = 0;
    for (const pct of progressByNode.values()) sum += pct;
    return Math.round(sum / progressByNode.size);
  }, [progressByNode]);

  return { progressByNode, overall, isChecked, toggleSubtopic, toggleNode, reset };
}
