import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-lg border border-line bg-card px-4 text-sm text-zinc-100 placeholder:text-faint",
        "transition-colors duration-200 hover:border-white/15 focus:border-primary/60",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
