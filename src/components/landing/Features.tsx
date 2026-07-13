import { Brain, GitBranch, Layers, MousePointerClick, Smartphone, Workflow } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FadeIn } from "./motion";

const FEATURES = [
  {
    icon: GitBranch,
    title: "Prerequisite mapping",
    body: "Every concept is connected to what it depends on — no more guessing the order.",
  },
  {
    icon: Workflow,
    title: "Automatic layout",
    body: "Graphs arrange themselves top-to-bottom by dependency depth. Zero manual sorting.",
  },
  {
    icon: MousePointerClick,
    title: "Interactive exploration",
    body: "Zoom, pan, fit view and collapse whole branches to focus on what's next.",
  },
  {
    icon: Layers,
    title: "Beginner → Advanced",
    body: "Nodes are leveled so you can see the full arc of the skill at a glance.",
  },
  {
    icon: Brain,
    title: "AI-ready architecture",
    body: "A clean service boundary means the mock generator swaps for a real model without rewrites.",
  },
  {
    icon: Smartphone,
    title: "Works everywhere",
    body: "Fully responsive — the graph stays usable from a phone to an ultrawide.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-line bg-card/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <FadeIn>
          <p className="text-sm font-medium text-secondary-glow">Features</p>
          <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight md:text-4xl">
            Built like a product, not a demo
          </h2>
        </FadeIn>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.06}>
              <Card className="h-full p-6 transition-colors duration-300 hover:border-primary/30">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-elevated text-primary-glow">
                  <f.icon size={18} strokeWidth={1.75} aria-hidden />
                </span>
                <p className="mt-5 font-medium">{f.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
