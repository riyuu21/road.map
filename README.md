# Road→map

Generate visual learning roadmaps from a single topic. Concepts are mapped by
prerequisite, leveled beginner → advanced, and rendered as an interactive graph.

Two pieces:

- **Frontend** — Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn-style
  UI primitives, React Flow (@xyflow/react) with dagre auto-layout, Framer Motion.
- **Backend** — FastAPI (Python) in `backend/`, MongoDB via motor for
  persistence, httpx for the AI provider chain.

## Run it

```bash
# backend (terminal 1)
cd backend
uv venv .venv && uv pip install -r requirements.txt --python .venv/bin/python
cd .. && npm run backend          # FastAPI on http://localhost:8000

# frontend (terminal 2)
npm install
npm run dev                       # http://localhost:3000 — proxies /api to the backend
```

The frontend rewrites `/api/*` to the backend (`BACKEND_URL` in `.env.local`,
default `http://localhost:8000`), so the browser only ever talks same-origin.

### Configuration (`backend/.env`)

- **AI generation** — paste an API key from any OpenAI-compatible provider:
  **Groq** (recommended — fast, generous), **Google Gemini**, **OpenRouter**,
  **Mistral**, or a custom endpoint via `AI_BASE_URL`/`AI_API_KEY`. Order is
  controlled by `AI_PROVIDER_ORDER`. Model output is validated and sanitized;
  a malformed reply falls through to the next provider, then to the built-in
  mock generator — the product never breaks.
- **MongoDB** — set `MONGODB_URI` (MongoDB Atlas or a local `mongod`).
  Roadmaps are upserted into the `roadmaps` collection as
  `{ topic, nodes, edges, source, provider, createdAt }` and repeated topics
  are served from the database instead of re-calling the model. Without a URI
  the backend keeps roadmaps in memory so everything still runs with zero config.
- **Accounts** — set `AUTH_SECRET` (any long random string) so sign-in tokens
  survive backend restarts. Without it accounts still work, but everyone is
  signed out whenever the server restarts.

## How it's put together

```
backend/app/
  main.py             FastAPI app: generate/list roadmaps, auth, per-user progress
  ai_generator.py     provider chain (Groq/Gemini/OpenRouter/Mistral/custom) + sanitizer
  mock_generator.py   curated presets + generic template fallback
  repository.py       MongoRepository (motor) with in-memory fallback
  auth.py             PBKDF2 password hashing + HMAC-signed session tokens
  rate_limit.py       sliding-window IP limiter
  models.py           pydantic Roadmap / RoadmapNode / RoadmapEdge / StoredUser
src/
  app/                landing page and /roadmap generator (no server code)
  components/
    ui/               shadcn-style primitives (button, input, card, badge, skeleton)
    landing/          hero, how-it-works, features, live demo, FAQ, footer
    auth/             sign in / sign up dialog, header account menu
  features/roadmap/   React Flow canvas, custom node, generator workspace
  hooks/              use-roadmap (fetch + status), use-auth (session context),
                      use-progress (per-topic tracking + account sync)
  lib/                cn util, dagre layout + collapse visibility, demo content
  types/              Roadmap / RoadmapNode / RoadmapEdge domain types
```

Design decisions:

- **Generation lives behind one endpoint.** The UI only knows
  `POST /api/generate-roadmap` → `{ topic, nodes, edges }`. The backend decides
  cache → AI chain → mock, so providers can change without touching the frontend.
- **Database as cache.** Every generated roadmap is upserted by topic
  (case-insensitive lookup), so repeat topics cost zero tokens. A down database
  never blocks generation — persistence is best-effort.
- **Graph rendering.** dagre computes a top→bottom dependency layout; React Flow
  renders custom nodes (icon, level badge, progress bar) with animated edges.
  Clicking a node opens its details; the node chevron collapses every concept
  that builds on it.
- **Progress tracking, no account needed.** Tick off subtopics in a node's
  detail panel; node and overall completion are derived from the checks and
  persisted per topic in localStorage (`use-progress`). Signing in layers a
  synced store on top: on load the account copy is merged with local (union of
  ticks, so no device loses anything), and changes are pushed with a debounced
  PUT. Sessions are 30-day HMAC-signed tokens; passwords are PBKDF2-hashed.

## API

- `POST /api/generate-roadmap` — body `{ "topic": "System Design" }` →
  `{ topic, nodes, edges, source, provider?, cached }`. Errors return
  `{ error }` with status 400/429.
- `GET /api/roadmaps` — eight most recent `{ topic, concepts, source, createdAt }`.
- `POST /api/auth/register`, `POST /api/auth/login` — body `{ email, password }`
  → `{ token, email }`. `GET /api/auth/me` — validates a `Bearer` token.
- `GET/PUT /api/progress/{topic}` (auth required) — per-user completed subtopic
  indices, `{ nodes: { [nodeId]: number[] } }`.
- `GET /health` (backend only) — `{ ok, ai }`.

## Deploy

Deploy the two pieces separately: the FastAPI app on any Python host
(`uvicorn app.main:app`) with `backend/.env` configured, the Next.js app on
Vercel (or any Node host) with `BACKEND_URL` pointing at the API.
