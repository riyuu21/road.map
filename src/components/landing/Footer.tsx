import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Logo />
          <p className="text-xs text-faint">Structured learning paths for any skill.</p>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-6 text-sm text-muted">
          <a href="#how-it-works" className="transition-colors hover:text-white">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
          <Link href="/roadmap" className="transition-colors hover:text-white">
            Generator
          </Link>
        </nav>
        <p className="text-xs text-faint">© 2026 Road→map</p>
      </div>
    </footer>
  );
}
