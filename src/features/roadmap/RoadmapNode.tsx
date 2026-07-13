"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LevelBadge } from "@/components/ui/badge";
import type { RoadmapNode } from "@/types/roadmap";
import { getNodeIcon } from "./icon-map";

export type RoadmapNodeData = {
  node: RoadmapNode;
  progress: number;
  collapsible: boolean;
  collapsed: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
};

export type RoadmapFlowNode = Node<RoadmapNodeData, "roadmap">;

export const RoadmapNodeCard = memo(function RoadmapNodeCard({
  data,
}: NodeProps<RoadmapFlowNode>) {
  const { node, progress, collapsible, collapsed, selected, onToggle, onSelect } = data;
  const done = progress === 100;
  const Icon = done ? Check : getNodeIcon(node.icon);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${node.title} — view details`}
      onClick={() => onSelect(node.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(node.id);
        }
      }}
      className={cn(
        "nodrag nopan group w-[248px] cursor-pointer rounded-xl border bg-card p-3 shadow-card transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-glow",
        selected ? "border-primary/60 ring-1 ring-primary/40" : "border-line"
      )}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-elevated",
            done ? "text-success" : "text-primary-glow"
          )}
        >
          <Icon size={16} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-zinc-100">{node.title}</p>
            {collapsible && (
              <button
                type="button"
                aria-label={collapsed ? `Expand what builds on ${node.title}` : `Collapse what builds on ${node.title}`}
                aria-expanded={!collapsed}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.id);
                }}
                className="shrink-0 rounded p-0.5 text-faint transition-colors hover:bg-elevated hover:text-white"
              >
                <ChevronDown
                  size={14}
                  aria-hidden
                  className={cn("transition-transform duration-300", collapsed && "-rotate-90")}
                />
              </button>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-faint">{node.description}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <LevelBadge level={node.level} />
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-elevated">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width] duration-300",
                  done ? "bg-success" : "bg-brand-gradient"
                )}
                style={{ width: `${progress}%` }}
              />
            </span>
            <span className={cn("text-[10px] tabular-nums", done ? "text-success" : "text-faint")}>
              {progress}%
            </span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
