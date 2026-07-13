"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXAMPLE_TOPICS } from "@/lib/demo-content";
import { FloatingPreview } from "./FloatingPreview";

export function Hero() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const reduced = useReducedMotion();

  const go = (t: string) => {
    const trimmed = t.trim();
    if (trimmed) router.push(`/roadmap?topic=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="relative overflow-hidden bg-hero-radial">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-20 md:pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:pb-32">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs text-muted">
            <Sparkles size={12} className="text-primary-glow" aria-hidden />
            Intelligent dependency mapping
          </p>
          <h1 className="mt-6 max-w-xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
            Master Any Skill With A{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">Clear Roadmap</span>
          </h1>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted md:text-lg">
            Generate structured learning paths powered by intelligent dependency mapping — from
            first principles to mastery.
          </p>

          <form
            className="mt-9 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              go(topic);
            }}
          >
            <label htmlFor="hero-topic" className="sr-only">
              What do you want to learn?
            </label>
            <Input
              id="hero-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want to learn?"
              maxLength={80}
              autoComplete="off"
            />
            <Button type="submit" size="lg" className="sm:h-12 sm:shrink-0">
              Generate Roadmap
              <ArrowRight size={16} aria-hidden />
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-faint">Try:</span>
            {EXAMPLE_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => go(t)}
                className="rounded-full border border-line bg-card px-3 py-1 text-xs text-muted transition-colors hover:border-primary/40 hover:text-white"
              >
                {t}
              </button>
            ))}
          </div>
        </motion.div>

        <FloatingPreview />
      </div>
    </section>
  );
}
