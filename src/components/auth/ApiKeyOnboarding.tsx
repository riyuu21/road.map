"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

type ProviderId = "groq" | "gemini" | "openrouter" | "mistral" | "custom";

interface ProviderForm {
  id: ProviderId;
  enabled: boolean;
  order: number;
  apiKey: string;
  apiKeyMasked?: string;
  baseUrl?: string;
  model?: string;
  deleted?: boolean;
}

const PROVIDERS: Array<{ id: ProviderId; name: string; href?: string; note: string; model?: string; baseUrl?: string }> = [
  { id: "groq", name: "Groq", href: "https://console.groq.com/keys", note: "Fast hosted models; free tier is available.", model: "llama-3.3-70b-versatile" },
  { id: "gemini", name: "Gemini", href: "https://aistudio.google.com/apikey", note: "Google AI Studio keys; free tier is available.", model: "gemini-2.5-flash" },
  { id: "openrouter", name: "OpenRouter", href: "https://openrouter.ai/keys", note: "Use OpenRouter free models or your own credits.", model: "meta-llama/llama-3.3-70b-instruct:free" },
  { id: "mistral", name: "Mistral", href: "https://console.mistral.ai/api-keys", note: "Mistral API keys for their hosted models.", model: "mistral-small-latest" },
  { id: "custom", name: "Custom OpenAI-compatible", note: "Any endpoint with /chat/completions support.", model: "gpt-4o-mini", baseUrl: "https://api.example.com/v1" },
];

const emptyForms: ProviderForm[] = PROVIDERS.map((p, index) => ({
  id: p.id,
  enabled: true,
  order: index,
  apiKey: "",
  deleted: false,
  baseUrl: p.baseUrl,
  model: p.model,
}));

export function ApiKeyOnboarding({ settingsMode = false }: { settingsMode?: boolean }) {
  const { user, token } = useAuth();
  const [forms, setForms] = useState<ProviderForm[]>(emptyForms);
  const [demoOnlyAccepted, setDemoOnlyAccepted] = useState(false);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      setBusy(false);
      return;
    }
    fetch("/api/me/provider-settings", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Could not load provider settings.");
        const saved = new Map((data.providers ?? []).map((p: ProviderForm) => [p.id, p]));
        setForms(emptyForms.map((base) => ({ ...base, ...(saved.get(base.id) ?? {}), apiKey: "" })));
        setDemoOnlyAccepted(Boolean(data.demoOnlyAccepted));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load provider settings."))
      .finally(() => setBusy(false));
  }, [token]);

  const configuredCount = useMemo(
    () => forms.filter((form) => form.enabled && (form.apiKey.trim() || form.apiKeyMasked)).length,
    [forms]
  );

  const update = (id: ProviderId, patch: Partial<ProviderForm>) => {
    setForms((current) => current.map((form) => (form.id === id ? { ...form, ...patch } : form)));
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        demoOnlyAccepted,
        providers: forms
          .filter((form) => form.apiKey.trim() || form.apiKeyMasked || form.deleted)
          .map((form, index) => ({
            id: form.id,
            enabled: form.enabled,
            order: Number.isFinite(form.order) ? form.order : index,
            apiKey: form.apiKey.trim() || undefined,
            baseUrl: form.id === "custom" ? form.baseUrl?.trim() : undefined,
            model: form.model?.trim() || undefined,
            delete: Boolean(form.deleted),
          })),
      };
      const res = await fetch("/api/me/provider-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save API keys.");
      const saved = new Map((data.providers ?? []).map((p: ProviderForm) => [p.id, p]));
      setForms(emptyForms.map((base) => ({ ...base, ...(saved.get(base.id) ?? {}), apiKey: "", deleted: false })));
      setMessage(configuredCount > 0 ? "Provider settings saved. Raw keys were not returned by the API." : "Demo-only mode saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save API keys.");
    } finally {
      setSaving(false);
    }
  };

  const validate = async (form: ProviderForm) => {
    if (!token) return;
    setValidation((current) => ({ ...current, [form.id]: "Validating…" }));
    const res = await fetch("/api/me/provider-settings/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: form.id,
        apiKey: form.apiKey,
        baseUrl: form.baseUrl,
        model: form.model,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setValidation((current) => ({
      ...current,
      [form.id]: data.message ?? (res.ok ? "Validated." : `Your ${form.id} key could not be validated.`),
    }));
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <p className="text-sm text-muted">Sign up to generate your own roadmap and save progress.</p>
        <Link href="/roadmap" className="mt-4 inline-flex text-sm text-primary-glow hover:text-white">
          Back to roadmaps
        </Link>
      </div>
    );
  }

  if (busy) {
    return <div className="p-6 text-sm text-muted">Loading provider settings…</div>;
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/roadmap" className="inline-flex items-center gap-2 text-xs text-faint hover:text-white">
          <ArrowLeft size={14} /> Back to roadmaps
        </Link>
        <div className="mt-6 rounded-2xl border border-line bg-card p-6 shadow-glow">
          <p className="text-xs uppercase tracking-[0.2em] text-primary-glow">Bring your own API key</p>
          <h1 className="mt-2 text-2xl font-semibold">{settingsMode ? "API key settings" : "Set up roadmap generation"}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Add one or more provider keys to generate custom roadmaps. Keys are used only to generate your roadmaps,
            encrypted at rest when PROVIDER_KEYS_SECRET is configured, and never returned to the browser after saving.
            Groq and Gemini are highlighted first because they can be used with free tiers.
          </p>
          <p className="mt-2 text-xs text-faint">Signed in as {user.email}</p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {forms.map((form) => {
            const meta = PROVIDERS.find((p) => p.id === form.id)!;
            return (
              <section key={form.id} className="rounded-2xl border border-line bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{meta.name}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-faint">{meta.note}</p>
                    {meta.href && (
                      <a href={meta.href} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-primary-glow hover:text-white">
                        Get a key
                      </a>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" checked={form.enabled} onChange={(e) => update(form.id, { enabled: e.target.checked })} />
                    Enabled
                  </label>
                </div>

                <label className="mt-4 block text-xs font-medium text-muted">Provider order</label>
                <Input className="mt-1" type="number" min={0} value={form.order} onChange={(e) => update(form.id, { order: Number(e.target.value) })} />

                {form.id === "custom" && (
                  <>
                    <label className="mt-4 block text-xs font-medium text-muted">API base URL</label>
                    <Input className="mt-1" value={form.baseUrl ?? ""} onChange={(e) => update(form.id, { baseUrl: e.target.value })} placeholder="https://api.example.com/v1" />
                  </>
                )}

                <label className="mt-4 block text-xs font-medium text-muted">Model</label>
                <Input className="mt-1" value={form.model ?? ""} onChange={(e) => update(form.id, { model: e.target.value })} />

                <label className="mt-4 block text-xs font-medium text-muted">API key</label>
                <Input className="mt-1" type="password" value={form.apiKey} onChange={(e) => update(form.id, { apiKey: e.target.value })} placeholder={form.apiKeyMasked ? `${form.apiKeyMasked} saved — enter a new key to replace` : "Paste API key"} />

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" disabled={!form.apiKey.trim()} onClick={() => validate(form)}>
                    Validate
                  </Button>
                  {form.apiKeyMasked && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => update(form.id, { apiKeyMasked: undefined, apiKey: "", enabled: false, deleted: true })}>
                      <Trash2 size={14} /> Delete saved key
                    </Button>
                  )}
                </div>
                {validation[form.id] && <p className="mt-3 text-xs text-muted">{validation[form.id]}</p>}
              </section>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-card p-5">
          <label className="flex items-start gap-3 text-sm text-muted">
            <input type="checkbox" className="mt-1" checked={demoOnlyAccepted} onChange={(e) => setDemoOnlyAccepted(e.target.checked)} />
            <span>
              Skip API keys for now. I understand I can browse demo/saved roadmaps only until I add a key.
            </span>
          </label>
          {message && <p className="mt-4 flex items-center gap-2 text-sm text-success"><CheckCircle2 size={16} /> {message}</p>}
          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={save} disabled={saving || (configuredCount === 0 && !demoOnlyAccepted)}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Save provider settings"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.location.assign("/roadmap")}>
              Continue to roadmaps
            </Button>
          </div>
          {configuredCount === 0 && !demoOnlyAccepted && (
            <p className="mt-3 text-xs text-faint">Add at least one API key, or accept demo-only browsing to skip.</p>
          )}
        </div>
      </div>
    </main>
  );
}
