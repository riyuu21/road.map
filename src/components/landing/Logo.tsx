import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <span aria-hidden className="relative flex h-6 w-6 items-center justify-center">
        <span className="absolute inset-0 rounded-md bg-brand-gradient opacity-90" />
        <svg viewBox="0 0 24 24" className="relative h-4 w-4" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
          <path d="M6 18 L6 11 Q6 8.5 8.5 8.5 L15 8.5" />
          <circle cx="6" cy="18" r="1.6" fill="white" stroke="none" />
          <circle cx="17.5" cy="8.5" r="1.6" fill="white" stroke="none" />
        </svg>
      </span>
      Road<span className="text-primary-glow">→</span>map
    </Link>
  );
}
