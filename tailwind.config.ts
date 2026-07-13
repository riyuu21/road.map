import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        card: "#111113",
        elevated: "#18181b",
        line: "rgba(255, 255, 255, 0.08)",
        primary: {
          DEFAULT: "#3b82f6",
          glow: "#60a5fa",
        },
        secondary: {
          DEFAULT: "#8b5cf6",
          glow: "#a78bfa",
        },
        success: "#22c55e",
        danger: "#ef4444",
        muted: "#a1a1aa",
        faint: "#71717a",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(59, 130, 246, 0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 32px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(60% 50% at 50% 0%, rgba(59,130,246,0.13) 0%, rgba(139,92,246,0.07) 45%, transparent 100%)",
        "brand-gradient": "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
      },
    },
  },
  plugins: [animate],
};

export default config;
