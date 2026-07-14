import type { Metadata } from "next";
import { ApiKeyOnboarding } from "@/components/auth/ApiKeyOnboarding";

export const metadata: Metadata = {
  title: "API key onboarding — Road→map",
  description: "Bring your own AI provider keys for roadmap generation.",
};

export default function ApiKeyOnboardingPage() {
  return <ApiKeyOnboarding />;
}
