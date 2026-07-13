import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/hooks/use-auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Road→map — Master Any Skill With A Clear Roadmap",
  description:
    "Generate structured, visual learning paths powered by intelligent dependency mapping.",
  openGraph: {
    title: "Road→map",
    description: "Generate structured, visual learning paths for any topic.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
