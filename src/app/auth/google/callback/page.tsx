"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

function GoogleCallbackContent() {
  const params = useSearchParams();
  const { completeGoogleLogin } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const email = params.get("email");
    const needsProviderOnboarding = params.get("needsProviderOnboarding");
    if (!token || !email) {
      window.location.replace("/roadmap");
      return;
    }
    completeGoogleLogin({ token, email, needsProviderOnboarding: needsProviderOnboarding === "true" });
    if (needsProviderOnboarding !== "true") window.location.replace("/roadmap");
  }, [completeGoogleLogin, params]);

  return <div className="p-6 text-sm text-muted">Completing Google sign-in…</div>;
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Completing Google sign-in…</div>}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
