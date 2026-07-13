"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LevelBadge } from "@/components/ui/badge";
import type { RoadmapNode } from "@/types/roadmap";
import { getNodeIcon } from "./icon-map";

export interface ProgressControls {
  isChecked: (nodeId: string, index: number) => boolean;
  onToggleSubtopic: (nodeId: string, index: number) => void;
  onToggleNode: (nodeId: string) => void;
}

export function NodeDetailPanel({
  node,
  progress,
  tracking,
  collapsible,
  collapsed,
  onToggle,
  onClose,
}: {
  node: RoadmapNode;
  progress: number;
  tracking?: ProgressControls;
  collapsible: boolean;
  collapsed: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const Icon = getNodeIcon(node.icon);
  const done = progress === 100;

  return (
    <motion.aside
      role="dialog"
      aria-label={`Details: ${node.title}`}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="absolute bottom-3 right-3 top-3 z-10 w-[320px] max-w-[calc(100%-24px)] overflow-y-auto rounded-xl border border-line bg-card/95 p-5 shadow-card backdrop-blur-xl max-md:inset-x-3 max-md:top-auto max-md:max-h-[55%] max-md:w-auto"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-elevated text-primary-glow">
          <Icon size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <button
          type="button"
          aria-label="Close details"
          onClick={onClose}
          className="rounded-lg p-1.5 text-faint transition-colors hover:bg-elevated hover:text-white"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      <h3 className="mt-4 text-base font-semibold">{node.title}</h3>
      <div className="mt-2 flex items-center gap-2">
        <LevelBadge level={node.level} />
        <span className={cn("text-xs", done ? "text-success" : "text-faint")}>
          {progress}% complete
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted">{node.description}</p>

      {node.subtopics && node.subtopics.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-faint">
            What you&apos;ll cover
          </p>
          <ul className="mt-2 space-y-1.5">
            {node.subtopics.map((s, i) =>
              tracking ? (
                <li key={s}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={tracking.isChecked(node.id, i)}
                    onClick={() => tracking.onToggleSubtopic(node.id, i)}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-elevated"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        tracking.isChecked(node.id, i)
                          ? "border-success bg-success/20 text-success"
                          : "border-line text-transparent"
                      )}
                    >
                      <Check size={11} strokeWidth={3} />
                    </span>
                    <span
                      className={cn(
                        tracking.isChecked(node.id, i)
                          ? "text-faint line-through"
                          : "text-zinc-200"
                      )}
                    >
                      {s}
                    </span>
                  </button>
                </li>
              ) : (
                <li key={s} className="flex items-start gap-2 text-sm text-zinc-200">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gradient"
                  />
                  {s}
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {tracking && (
        <Button
          variant={done ? "secondary" : "primary"}
          size="sm"
          className="mt-5 w-full"
          onClick={() => tracking.onToggleNode(node.id)}
        >
          {done ? "Mark as not started" : "Mark complete"}
        </Button>
      )}

      {collapsible && (
        <Button
          variant="secondary"
          size="sm"
          className={cn("w-full", tracking ? "mt-2" : "mt-5")}
          onClick={() => onToggle(node.id)}
        >
          {collapsed ? "Expand what builds on this" : "Collapse what builds on this"}
        </Button>
      )}
    </motion.aside>
  );
}
