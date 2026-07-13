export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  level: SkillLevel;
  /** lucide icon key, resolved in the UI layer */
  icon: string;
  /** server default 0 — real progress is tracked client-side per topic (use-progress) */
  progress: number;
  subtopics?: string[];
}

export interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
}

export interface Roadmap {
  topic: string;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  source?: "ai" | "curated";
  /** which AI provider produced it, when source === "ai" */
  provider?: string;
}

/** API transport shape — adds whether the result came from the cache. */
export interface GenerateRoadmapResponse extends Roadmap {
  cached?: boolean;
}

export interface StoredRoadmap extends Roadmap {
  createdAt: Date;
}
