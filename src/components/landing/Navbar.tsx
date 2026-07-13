import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#demo", label: "Demo" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/70 backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"
      >
        <Logo />
        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>
        <Link
          href="/roadmap"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-gradient px-4 text-sm font-medium text-white shadow-glow transition-all hover:brightness-110"
        >
          Open Generator
          <ArrowRight size={14} aria-hidden />
        </Link>
      </nav>
    </header>
  );
}
