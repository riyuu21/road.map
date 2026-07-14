# Road→map

Generate visual learning roadmaps from a single topic. Concepts are mapped by
prerequisite, leveled beginner → advanced, and rendered as an interactive graph.

Two pieces:

- **Frontend** — Next.js 14 (App Router), TypeScript, Tailwind CSS,
  shadcn-style UI primitives, React Flow (@xyflow/react) with dagre auto-layout,
  Framer Motion.
- **Backend** — FastAPI (Python) in `backend/`, MongoDB via motor for
  persistence, httpx for Google OAuth and the AI provider chain.

## Run it locally

```bash
# backend (terminal 1)
cd backend
cp .env.example .env
uv venv .venv && uv pip install -r requirements.txt --python .venv/bin/python
cd .. && npm run backend          # FastAPI on http://localhost:8000

# frontend (terminal 2)
cp .env.local.example .env.local
npm install
npm run dev                       # http://localhost:3000 — proxies /api to the backend
```

The frontend rewrites `/api/*` to the backend (`BACKEND_URL` in `.env.local`,
default `http://localhost:8000`), so the browser only ever talks same-origin.

## Environment variables

Backend variables live in `backend/.env` (see `backend/.env.example`):

- `AUTH_SECRET` — signs 30-day app session tokens.
- `PROVIDER_KEYS_SECRET` — encrypts user BYOK provider keys at rest. Keep it
  stable; changing it makes saved provider keys unreadable.
- `FRONTEND_URL` — where Google OAuth callbacks redirect after backend login.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — Google
  OAuth. For local dev, set `GOOGLE_REDIRECT_URI` to
  `http://localhost:8000/api/auth/google/callback` and register that exact URI
  in Google Cloud Console.
- `MONGODB_URI`, `MONGODB_DB` — optional persistence. Without a URI the backend
  uses in-memory storage.
- Optional server-owned AI keys (`GROQ_API_KEY`, `GEMINI_API_KEY`,
  `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, `AI_BASE_URL`/`AI_API_KEY`) remain
  supported for local/admin fallback. Signed-in users generate with their own
  saved provider keys instead of relying on `backend/.env`.

Never commit real `.env` files or real provider keys.

## Google OAuth setup

1. Create an OAuth client in Google Cloud Console.
2. Add the redirect URI from `GOOGLE_REDIRECT_URI` (local default:
   `http://localhost:8000/api/auth/google/callback`).
3. Put the client id/secret in `backend/.env`.
4. Restart the FastAPI backend.

The app exposes:

- `GET /api/auth/google/login-url` — frontend starts the redirect flow.
- `GET /api/auth/google/callback` — backend exchanges the code, creates/updates
  the user in the existing repository layer, issues the same HMAC session token
  style as email/password auth, then redirects to the frontend callback page.
- `POST /api/auth/google/token` — token-verification endpoint for clients that
  use Google Identity Services credentials directly.

Email/password auth remains available.

## BYOK provider setup

After signup/login, users without configured provider keys are guided to
`/onboarding/api-keys`. They can save one or more providers and choose provider
order/preference:

- Groq — https://console.groq.com/keys (free tier available)
- Gemini — https://aistudio.google.com/apikey (free tier available)
- OpenRouter — https://openrouter.ai/keys
- Mistral — https://console.mistral.ai/api-keys
- Custom OpenAI-compatible endpoint — base URL, API key, and model

Provider keys are encrypted before storage when `PROVIDER_KEYS_SECRET` is set,
never logged intentionally, and never returned raw. API responses expose only
masked values such as `gsk_••••abcd`.

Users may skip onboarding only after accepting demo/saved-roadmap-only mode.
They can update or delete saved keys from the header's “API keys” link.

## Anonymous vs signed-in behavior

Anonymous visitors can:

- view the landing page;
- view a limited set of saved/curated roadmaps;
- open demo/example roadmaps.

Anonymous visitors cannot generate arbitrary new roadmaps, access full roadmap
history, or sync progress. When they hit the generation gate, the API returns
`SIGNUP_REQUIRED` and the UI shows:

> Sign up to generate your own roadmap and save progress.

Signed-in users without provider keys can still browse demo/saved roadmaps, but
custom generation returns `PROVIDER_KEYS_REQUIRED` and the UI links to the BYOK
onboarding flow.

Signed-in users with provider keys generate through their own provider chain in
configured order. If one provider fails, the backend falls through to the next.
If all fail, the API returns a helpful provider-level error without secrets.

## How it's put together

```
backend/app/
  main.py             FastAPI app: generate/list roadmaps, auth, Google OAuth,
                      provider settings, per-user progress
  ai_generator.py     provider chain (Groq/Gemini/OpenRouter/Mistral/custom),
                      validation helper, sanitizer
  crypto.py           provider key encryption/masking helper
  mock_generator.py   curated presets + generic template fallback
  repository.py       MongoRepository (motor) with in-memory fallback
  auth.py             PBKDF2 password hashing + HMAC-signed session tokens
  rate_limit.py       sliding-window IP limiter
  models.py           pydantic domain/auth/provider models
src/
  app/                landing, /roadmap, /onboarding/api-keys, Google callback
  components/auth/    sign in/up dialog, account menu, BYOK onboarding UI
  features/roadmap/   React Flow canvas, custom node, generator workspace
  hooks/              use-roadmap, use-auth, use-progress
```

Design decisions:

- **Generation lives behind one endpoint.** The UI calls
  `POST /api/generate-roadmap`. The backend decides cache/curated gate → user
  provider chain → error.
- **BYOK after login.** Server-owned env keys are not the default generation path
  for signed-in users; per-user provider settings are loaded from the repository.
- **Database as cache.** Every generated roadmap is upserted by topic
  (case-insensitive lookup), so repeat topics cost zero tokens. Persistence is
  best-effort.
- **Progress tracking.** Anonymous progress stays in localStorage. Signing in
  layers account sync on top via `GET/PUT /api/progress/{topic}`.

## API

- `POST /api/generate-roadmap` — body `{ "topic": "System Design" }` →
  `{ topic, nodes, edges, source, provider?, cached }`. Gated errors include
  `SIGNUP_REQUIRED` and `PROVIDER_KEYS_REQUIRED`.
- `GET /api/roadmaps` — recent roadmaps; anonymous users receive a limited
  curated/demo subset, signed-in users receive more history.
- `POST /api/auth/register`, `POST /api/auth/login` — body `{ email, password }`
  → `{ token, email, needsProviderOnboarding }`.
- `GET /api/auth/google/login-url`, `GET /api/auth/google/callback`,
  `POST /api/auth/google/token` — Google auth flow.
- `GET /api/auth/me` — validates a `Bearer` token.
- `GET /api/me/provider-settings`, `PUT /api/me/provider-settings`,
  `POST /api/me/provider-settings/validate` — BYOK settings and validation.
- `GET/PUT /api/progress/{topic}` (auth required) — per-user completed subtopic
  indices, `{ nodes: { [nodeId]: number[] } }`.
- `GET /health` (backend only) — `{ ok, ai }`.

## Deploy

Deploy the two pieces separately: the FastAPI app on any Python host
(`uvicorn app.main:app`) with `backend/.env` configured, the Next.js app on
Vercel (or any Node host) with `BACKEND_URL` pointing at the API.
