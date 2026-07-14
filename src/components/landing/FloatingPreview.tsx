import { Database, Globe, Network, Zap, Boxes, type LucideIcon } from "lucide-react";

interface PreviewNode {
  icon: LucideIcon;
  label: string;
  level: string;
  levelClass: string;
  position: string;
}

const NODES: PreviewNode[] = [
  { icon: Network, label: "Computer Networks", level: "Beginner", levelClass: "text-primary-glow", position: "left-[6%] top-[2%]" },
  { icon: Database, label: "Databases", level: "Beginner", levelClass: "text-primary-glow", position: "right-[8%] top-[18%]" },
  { icon: Zap, label: "Caching", level: "Intermediate", levelClass: "text-secondary-glow", position: "left-[12%] top-[40%]" },
  { icon: Globe, label: "Distributed Systems", level: "Advanced", levelClass: "text-success", position: "right-[4%] top-[58%]" },
  { icon: Boxes, label: "Microservices", level: "Advanced", levelClass: "text-success", position: "left-[18%] top-[78%]" },
];

const LINES = [
  ["18%", "10%", "72%", "24%"],
  ["72%", "26%", "22%", "46%"],
  ["22%", "48%", "76%", "64%"],
  ["76%", "66%", "28%", "84%"],
] as const;

export function FloatingPreview() {
  return (
    <div aria-hidden className="relative hidden h-[440px] select-none lg:block">
      <div className="absolute inset-0 rounded-2xl border border-line bg-card/40" />
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {LINES.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#edge)" strokeWidth="1.5" strokeDasharray="5 5" />
        ))}
      </svg>
      {NODES.map((n) => (
        <div
          key={n.label}
          className={`absolute ${n.position} flex items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 py-2.5 shadow-card`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-elevated text-primary-glow">
            <n.icon size={13} strokeWidth={1.75} />
          </span>
          <span>
            <span className="block text-xs font-medium text-zinc-100">{n.label}</span>
            <span className={`block text-[10px] ${n.levelClass}`}>{n.level}</span>
          </span>
        </div>
      ))}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-secondary/15 blur-3xl" />
    </div>
  );
}
