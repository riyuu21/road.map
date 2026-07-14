import json
import logging
import os
import re
from dataclasses import dataclass

import httpx

from .mock_generator import display_topic
from .models import Roadmap, RoadmapEdge, RoadmapNode

# AI generation pipeline: tries each configured provider in order and returns
# the first valid roadmap. Output is validated and sanitized — a malformed
# reply moves on to the next provider; if all fail, the caller falls back to
# the mock generator.

log = logging.getLogger("roadmap.ai")

ICON_KEYS = [
    "activity", "bar-chart", "book-open", "boxes", "brain", "check-circle", "code", "cpu",
    "database", "file-text", "filter", "flame", "function-square", "git-branch", "globe",
    "keyboard", "layers", "lightbulb", "message-square", "network", "package", "plug",
    "rocket", "scale", "scatter-chart", "shield", "sigma", "target", "trophy", "wrench", "zap",
]

LEVELS = ("beginner", "intermediate", "advanced")


@dataclass
class Provider:
    id: str
    base_url: str
    model: str
    api_key: str


DEFINITIONS = [
    ("groq", "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile", "GROQ_API_KEY", "GROQ_MODEL"),
    ("gemini", "https://generativelanguage.googleapis.com/v1beta/openai", "gemini-2.5-flash", "GEMINI_API_KEY", "GEMINI_MODEL"),
    ("openrouter", "https://openrouter.ai/api/v1", "meta-llama/llama-3.3-70b-instruct:free", "OPENROUTER_API_KEY", "OPENROUTER_MODEL"),
    ("mistral", "https://api.mistral.ai/v1", "mistral-small-latest", "MISTRAL_API_KEY", "MISTRAL_MODEL"),
]


def configured_providers() -> list[Provider]:
    """Providers with a key set, in AI_PROVIDER_ORDER (custom endpoint first)."""
    providers: list[Provider] = []

    if os.environ.get("AI_API_KEY") and os.environ.get("AI_BASE_URL"):
        providers.append(Provider(
            id="custom",
            base_url=os.environ["AI_BASE_URL"].rstrip("/"),
            model=os.environ.get("AI_MODEL") or "llama-3.3-70b-versatile",
            api_key=os.environ["AI_API_KEY"],
        ))

    order = os.environ.get("AI_PROVIDER_ORDER") or ",".join(d[0] for d in DEFINITIONS)
    for wanted in (s.strip().lower() for s in order.split(",") if s.strip()):
        definition = next((d for d in DEFINITIONS if d[0] == wanted), None)
        if not definition:
            continue
        id, base_url, model, key_env, model_env = definition
        api_key = os.environ.get(key_env)
        if not api_key:
            continue
        providers.append(Provider(
            id=id,
            base_url=base_url,
            model=os.environ.get(model_env) or model,
            api_key=api_key,
        ))

    return providers


def is_ai_configured() -> bool:
    return bool(configured_providers())


async def generate_with_ai(
    client: httpx.AsyncClient, raw_topic: str, providers: list[Provider] | None = None
) -> Roadmap:
    topic = display_topic(raw_topic)
    failures: list[str] = []

    for provider in (providers if providers is not None else configured_providers()):
        try:
            roadmap = await _call_provider(client, provider, topic)
            roadmap.provider = provider.id
            return roadmap
        except Exception as e:
            failures.append(f"{provider.id}: {_safe_error(e)}")
            log.warning("provider %s failed — %s", provider.id, _safe_error(e))

    raise RuntimeError(f"All AI providers failed — {' | '.join(failures)}")


async def validate_provider(client: httpx.AsyncClient, provider: Provider) -> tuple[bool, str]:
    """Validate an OpenAI-compatible provider without exposing secrets."""
    try:
        res = await client.get(
            f"{provider.base_url}/models",
            headers={"Authorization": f"Bearer {provider.api_key}"},
            timeout=12.0,
        )
        if res.status_code == 200:
            return True, "Validated."
        if res.status_code in {401, 403}:
            return False, f"{provider.id} rejected the API key."
        # Some compatible endpoints do not implement /models; try tiny chat request.
        if res.status_code in {404, 405}:
            body = {"model": provider.model, "messages": [{"role": "user", "content": "Reply with OK"}], "max_tokens": 3}
            chat = await _post(client, provider, body)
            if chat.status_code == 200:
                return True, "Validated."
            return False, f"{provider.id} validation failed with HTTP {chat.status_code}."
        return False, f"{provider.id} validation failed with HTTP {res.status_code}."
    except Exception as e:
        return False, f"{provider.id} validation failed: {_safe_error(e)}"


def _safe_error(error: Exception) -> str:
    text = str(error)
    # Avoid reflecting bearer tokens or long key-like strings from provider error bodies.
    text = re.sub(r"Bearer\s+[A-Za-z0-9._\-]+", "Bearer [redacted]", text)
    text = re.sub(r"(gsk_|sk-|AIza)[A-Za-z0-9._\-]+", r"\1[redacted]", text)
    return text[:220]


async def _call_provider(client: httpx.AsyncClient, provider: Provider, topic: str) -> Roadmap:
    body = {
        "model": provider.model,
        "temperature": 0.4,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You design learning roadmaps as prerequisite dependency graphs. "
                           "Reply with valid JSON only — no prose, no markdown fences.",
            },
            {"role": "user", "content": _build_prompt(topic)},
        ],
    }

    res = await _post(client, provider, body)
    if res.status_code == 400:
        # some providers reject response_format — retry without it
        res = await _post(client, provider, {k: v for k, v in body.items() if k != "response_format"})
    if res.status_code != 200:
        raise RuntimeError(f"HTTP {res.status_code}: {res.text[:160]}")

    content = res.json().get("choices", [{}])[0].get("message", {}).get("content", "")
    return _sanitize(topic, _extract_json(content))


def _post(client: httpx.AsyncClient, provider: Provider, body: dict):
    return client.post(
        f"{provider.base_url}/chat/completions",
        json=body,
        headers={"Authorization": f"Bearer {provider.api_key}"},
        timeout=30.0,
    )


def _build_prompt(topic: str) -> str:
    return f'''Create a learning roadmap for "{topic}".

Return JSON in exactly this shape:
{{"nodes":[{{"id":"kebab-case-id","title":"Short Title","description":"One or two sentences explaining what this covers and why it matters.","level":"beginner","icon":"book-open","subtopics":["short item","short item","short item"]}}],"edges":[{{"source":"node-id","target":"node-id"}}]}}

Rules:
- 10 to 14 nodes covering "{topic}" from absolute basics to advanced mastery
- "level" is exactly one of: beginner, intermediate, advanced — progressing through the graph
- every edge means "source is a prerequisite of target"; the graph must be acyclic and flow beginner → advanced
- every node except the 1–3 entry points must be the target of at least one edge; no orphan nodes
- 3 to 5 subtopics per node, short noun phrases
- "icon" must be one of: {", ".join(ICON_KEYS)}'''


def _extract_json(text: str):
    cleaned = text.strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("reply contained no JSON object")
    return json.loads(cleaned[start : end + 1])


def _slug(s: str) -> str:
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", str(s).lower().strip()))[:40]


def _sanitize(topic: str, raw) -> Roadmap:
    if not isinstance(raw, dict) or not isinstance(raw.get("nodes"), list) or not isinstance(raw.get("edges"), list):
        raise ValueError("reply missing nodes/edges arrays")

    nodes: list[RoadmapNode] = []
    ids: set[str] = set()
    for item in raw["nodes"][:18]:
        if not isinstance(item, dict):
            continue
        id = _slug(item.get("id") or item.get("title") or "")
        title = str(item.get("title") or "").strip()[:60]
        if not id or not title or id in ids:
            continue
        ids.add(id)
        subtopics = item.get("subtopics")
        nodes.append(RoadmapNode(
            id=id,
            title=title,
            description=str(item.get("description") or "").strip()[:240],
            level=item["level"] if item.get("level") in LEVELS else "intermediate",
            icon=item["icon"] if item.get("icon") in ICON_KEYS else "book-open",
            subtopics=[str(s).strip()[:80] for s in subtopics[:6] if str(s).strip()]
            if isinstance(subtopics, list) else None,
        ))

    edges: list[RoadmapEdge] = []
    seen: set[str] = set()
    for item in raw["edges"]:
        if not isinstance(item, dict):
            continue
        source, target = _slug(item.get("source") or ""), _slug(item.get("target") or "")
        id = f"{source}->{target}"
        if source not in ids or target not in ids or source == target or id in seen:
            continue
        seen.add(id)
        edges.append(RoadmapEdge(id=id, source=source, target=target))
    if not edges:
        raise ValueError("no valid edges")

    # prune nodes the graph never references — floating islands confuse the layout
    connected = {e.source for e in edges} | {e.target for e in edges}
    nodes = [n for n in nodes if n.id in connected]
    if len(nodes) < 5:
        raise ValueError("too few valid nodes")

    return Roadmap(topic=topic, nodes=nodes, edges=edges, source="ai")
