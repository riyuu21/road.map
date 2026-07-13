import type { Roadmap, RoadmapEdge, RoadmapNode, SkillLevel } from "@/types/roadmap";

// Static UI content — roadmap generation itself lives in the FastAPI backend.

export const EXAMPLE_TOPICS = ["System Design", "Machine Learning", "Python", "Cyber Security"];

type NodeSeed = [id: string, title: string, description: string, level: SkillLevel, icon: string];
type EdgeSeed = [source: string, target: string];

const NODES: NodeSeed[] = [
  ["networks", "Computer Networks", "HTTP, TCP/IP, DNS and how data moves across the wire.", "beginner", "network"],
  ["os", "Operating Systems", "Processes, threads, memory and what the kernel does for you.", "beginner", "cpu"],
  ["databases", "Databases", "Relational modeling, indexes and transactions.", "beginner", "database"],
  ["apis", "APIs & REST", "Resource design, versioning, pagination and idempotency.", "intermediate", "plug"],
  ["caching", "Caching", "Redis, CDNs and the hard problem of invalidation.", "intermediate", "zap"],
  ["load-balancing", "Load Balancing", "Distributing traffic, health checks and failover.", "intermediate", "scale"],
  ["queues", "Message Queues", "Async processing with Kafka and friends.", "intermediate", "layers"],
  ["db-scaling", "Database Scaling", "Replication, sharding and read/write splitting.", "intermediate", "git-branch"],
  ["distributed", "Distributed Systems", "CAP, consensus and designing for partial failure.", "advanced", "globe"],
  ["microservices", "Microservices", "Service boundaries, contracts and orchestration.", "advanced", "boxes"],
  ["observability", "Observability", "Logs, metrics, traces — knowing what production is doing.", "advanced", "activity"],
  ["interviews", "Design Interviews", "Practice whiteboarding real systems end to end.", "advanced", "target"],
];

const EDGES: EdgeSeed[] = [
  ["networks", "os"],
  ["os", "databases"],
  ["networks", "apis"],
  ["databases", "caching"],
  ["networks", "load-balancing"],
  ["os", "queues"],
  ["databases", "db-scaling"],
  ["caching", "distributed"],
  ["db-scaling", "distributed"],
  ["load-balancing", "distributed"],
  ["distributed", "microservices"],
  ["apis", "microservices"],
  ["queues", "microservices"],
  ["microservices", "observability"],
  ["microservices", "interviews"],
];

/** Preset used by the landing-page live demo. */
export const DEMO_ROADMAP: Roadmap = {
  topic: "System Design",
  nodes: NODES.map(([id, title, description, level, icon]): RoadmapNode => ({
    id,
    title,
    description,
    level,
    icon,
    progress: 0,
  })),
  edges: EDGES.map(([source, target]): RoadmapEdge => ({
    id: `${source}->${target}`,
    source,
    target,
  })),
  source: "curated",
};
