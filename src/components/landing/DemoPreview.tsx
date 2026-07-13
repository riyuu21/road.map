"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_ROADMAP } from "@/lib/demo-content";
import { FadeIn } from "./motion";

const RoadmapCanvas = dynamic(
  () => import("@/features/roadmap/RoadmapCanvas").then((m) => m.RoadmapCanvas),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

export function DemoPreview() {
  return (
    <section id="demo" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <FadeIn>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary-glow">Live demo</p>
              <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight md:text-4xl">
                The System Design roadmap, rendered live
              </h2>
            </div>
            <Link
              href="/roadmap?topic=System%20Design"
              className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-white"
            >
              Open in the generator
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="mt-10 h-[480px] overflow-hidden rounded-2xl border border-line bg-card/40 shadow-card">
            <RoadmapCanvas roadmap={DEMO_ROADMAP} demo />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
