"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "./motion";

const ITEMS = [
  {
    q: "Is Road→map free to use?",
    a: "Yes. Generating and exploring roadmaps is free. Accounts and premium features may come later, but the core experience stays open.",
  },
  {
    q: "Where do the roadmaps come from?",
    a: "Right now they come from a curated generation engine with hand-built paths for popular topics. The architecture is AI-ready — the same API will be backed by a language model next.",
  },
  {
    q: "Does it work for any topic?",
    a: "Yes. Popular topics like System Design, Python and Machine Learning get deeply curated paths; anything else gets a sensible structured template from fundamentals to mastery.",
  },
  {
    q: "Can I track my progress?",
    a: "Every node carries a progress indicator. Persistent tracking across sessions ships with accounts — the data model already supports it.",
  },
  {
    q: "Is my data stored?",
    a: "Only the topic you generate and its roadmap are saved to improve the catalog. No personal data is collected.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <FadeIn>
          <p className="text-center text-sm font-medium text-secondary-glow">FAQ</p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight md:text-4xl">
            Questions, answered
          </h2>
        </FadeIn>
        <div className="mt-12 space-y-3">
          {ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <FadeIn key={item.q} delay={i * 0.05}>
                <div className="rounded-xl border border-line bg-card">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium"
                  >
                    {item.q}
                    <ChevronDown
                      size={16}
                      aria-hidden
                      className={cn(
                        "shrink-0 text-faint transition-transform duration-300",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
