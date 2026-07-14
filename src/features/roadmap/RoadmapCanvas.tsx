"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Roadmap } from "@/types/roadmap";
import { computeVisible, layoutRoadmap } from "@/lib/graph-layout";
import { RoadmapNodeCard, type RoadmapFlowNode } from "./RoadmapNode";
import { NodeDetailPanel, type ProgressControls } from "./NodeDetailPanel";

const nodeTypes = { roadmap: RoadmapNodeCard };

const EDGE_STYLE = { stroke: "#3b82f6", strokeWidth: 1.5 };
const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: "#3b82f6", width: 16, height: 16 };

export function RoadmapCanvas({
  roadmap,
  demo = false,
  progress,
  tracking,
}: {
  roadmap: Roadmap;
  demo?: boolean;
  /** per-node completion 0–100; falls back to the node's own value (demo) */
  progress?: Map<string, number>;
  tracking?: ProgressControls;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setCollapsed(new Set());
    setSelectedId(null);
  }, [roadmap]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const select = useCallback((id: string) => setSelectedId(id), []);

  const positions = useMemo(() => layoutRoadmap(roadmap), [roadmap]);
  const visible = useMemo(() => computeVisible(roadmap, collapsed), [roadmap, collapsed]);
  const parents = useMemo(() => new Set(roadmap.edges.map((e) => e.source)), [roadmap]);

  const nodes = useMemo<RoadmapFlowNode[]>(
    () =>
      roadmap.nodes.map((node) => ({
        id: node.id,
        type: "roadmap",
        position: positions.get(node.id) ?? { x: 0, y: 0 },
        hidden: !visible.has(node.id),
        data: {
          node,
          progress: progress?.get(node.id) ?? node.progress,
          collapsible: parents.has(node.id),
          collapsed: collapsed.has(node.id),
          selected: selectedId === node.id,
          onToggle: toggle,
          onSelect: select,
        },
      })),
    [roadmap, positions, visible, parents, collapsed, selectedId, toggle, select, progress]
  );

  const edges = useMemo<Edge[]>(
    () =>
      roadmap.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: !demo,
        hidden: !visible.has(edge.source) || !visible.has(edge.target),
        style: EDGE_STYLE,
        markerEnd: EDGE_MARKER,
      })),
    [roadmap, visible]
  );

  const selectedNode = selectedId ? roadmap.nodes.find((n) => n.id === selectedId) : null;

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        key={roadmap.topic}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        preventScrolling={!demo}
        zoomOnScroll={!demo}
        panOnDrag
        onPaneClick={() => setSelectedId(null)}
        onNodeClick={(_, node) => select(node.id)}
        colorMode="dark"
        aria-label={`${roadmap.topic} roadmap graph`}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={1.5} color="rgba(255,255,255,0.07)" />
        {!demo && <Controls showInteractive={false} position="bottom-right" />}
      </ReactFlow>

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          progress={progress?.get(selectedNode.id) ?? selectedNode.progress}
          tracking={tracking}
          collapsible={parents.has(selectedNode.id)}
          collapsed={collapsed.has(selectedNode.id)}
          onToggle={toggle}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
