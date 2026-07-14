"use client";

import { useCallback, useRef, useState } from "react";
import type { GenerateRoadmapResponse } from "@/types/roadmap";

export type RoadmapStatus = "idle" | "loading" | "success" | "error";

export function useRoadmap(token?: string | null) {
  const [roadmap, setRoadmap] = useState<GenerateRoadmapResponse | null>(null);
  const [status, setStatus] = useState<RoadmapStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (topic: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);
    setErrorCode(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers,
        body: JSON.stringify({ topic }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorCode(typeof data.code === "string" ? data.code : null);
        throw new Error(data.error ?? "Something went wrong.");
      }
      setRoadmap(data as GenerateRoadmapResponse);
      setStatus("success");
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Failed to generate the roadmap.");
      setStatus("error");
    }
  }, [token]);

  return { roadmap, status, error, errorCode, generate };
}
