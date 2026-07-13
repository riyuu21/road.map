import dagre from "dagre";
import type { Roadmap } from "@/types/roadmap";

export const NODE_WIDTH = 248;
export const NODE_HEIGHT = 92;

/** Top→bottom dependency layout via dagre. */
export function layoutRoadmap(roadmap: Roadmap): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 72 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of roadmap.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of roadmap.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const node of roadmap.nodes) {
    const { x, y } = g.node(node.id);
    positions.set(node.id, { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 });
  }
  return positions;
}

/**
 * Nodes that remain visible given a set of collapsed node ids: BFS from the
 * roots that never traverses past a collapsed node. A node stays visible if
 * any expanded, visible parent leads to it.
 */
export function computeVisible(roadmap: Roadmap, collapsed: Set<string>): Set<string> {
  const children = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const n of roadmap.nodes) indegree.set(n.id, 0);
  for (const e of roadmap.edges) {
    children.set(e.source, [...(children.get(e.source) ?? []), e.target]);
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  }

  const visible = new Set<string>();
  const queue: string[] = roadmap.nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  for (const id of queue) visible.add(id);

  while (queue.length) {
    const current = queue.shift()!;
    if (collapsed.has(current)) continue;
    for (const child of children.get(current) ?? []) {
      if (!visible.has(child)) {
        visible.add(child);
        queue.push(child);
      }
    }
  }
  return visible;
}
