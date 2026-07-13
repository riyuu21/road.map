import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RoadmapWorkspace } from "@/features/roadmap/RoadmapWorkspace";

export const metadata: Metadata = {
  title: "Roadmap Generator — Road→map",
  description: "Generate a structured, visual learning roadmap for any topic.",
};

export default function RoadmapPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-[80vh] w-full" />
        </div>
      }
    >
      <RoadmapWorkspace />
    </Suspense>
  );
}
