import { cn } from "@/lib/utils";
import type { SkillLevel } from "@/types/roadmap";

const LEVEL_STYLES: Record<SkillLevel, string> = {
  beginner: "bg-primary/10 text-primary-glow border-primary/20",
  intermediate: "bg-secondary/10 text-secondary-glow border-secondary/20",
  advanced: "bg-success/10 text-success border-success/20",
};

export function LevelBadge({ level, className }: { level: SkillLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize tracking-wide",
        LEVEL_STYLES[level],
        className
      )}
    >
      {level}
    </span>
  );
}
