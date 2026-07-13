import { GitBranch, Map, PenLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FadeIn } from "./motion";

const STEPS = [
  {
    icon: PenLine,
    title: "Enter a topic",
    body: "Type anything you want to learn — from System Design to watercolor painting.",
  },
  {
    icon: GitBranch,
    title: "We map the dependencies",
    body: "Concepts are ordered by prerequisites, so you always know what comes before what.",
  },
  {
    icon: Map,
    title: "Explore your path",
    body: "An interactive graph from beginner to advanced — zoom, pan and collapse branches.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <FadeIn>
          <p className="text-sm font-medium text-primary-glow">How it works</p>
          <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight md:text-4xl">
            From a single word to a complete learning plan
          </h2>
        </FadeIn>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.1}>
              <Card className="h-full p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-elevated text-primary-glow">
                  <s.icon size={18} strokeWidth={1.75} aria-hidden />
                </span>
                <p className="mt-5 flex items-baseline gap-2 font-medium">
                  <span className="text-xs text-faint">0{i + 1}</span>
                  {s.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
