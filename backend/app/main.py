import asyncio
import logging
import os
import re
import time
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .ai_generator import Provider, generate_with_ai, is_ai_configured, validate_provider  # noqa: E402
from .auth import create_token, hash_password, verify_password, verify_token  # noqa: E402
from .crypto import decrypt_secret, encrypt_secret, mask_secret  # noqa: E402
from .google_auth import (  # noqa: E402
    exchange_google_code,
    fetch_google_userinfo,
    google_login_url,
    google_session,
)
from .mock_generator import generate_roadmap  # noqa: E402
from .models import ProviderSettings, ProviderSetting, StoredUser, TopicProgress  # noqa: E402
from .rate_limit import rate_limit  # noqa: E402
from .repository import get_repository  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("roadmap")

CURATED_TOPICS = {"system design", "machine learning", "python", "cyber security"}
PROVIDER_DEFAULTS = {
    "groq": ("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
    "gemini": ("https://generativelanguage.googleapis.com/v1beta/openai", "gemini-2.5-flash"),
    "openrouter": ("https://openrouter.ai/api/v1", "meta-llama/llama-3.3-70b-instruct:free"),
    "mistral": ("https://api.mistral.ai/v1", "mistral-small-latest"),
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient()
    yield
    await app.state.http.aclose()


app = FastAPI(title="Road→map API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    # the frontend reads errors from an "error" key
    return JSONResponse({"error": exc.detail}, status_code=exc.status_code)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "local"


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class Credentials(BaseModel):
    email: str
    password: str

    def normalized_email(self) -> str:
        return self.email.strip().lower()


class ProviderSettingIn(BaseModel):
    id: str
    enabled: bool = True
    order: int = 0
    apiKey: str | None = None
    baseUrl: str | None = None
    model: str | None = None
    delete: bool = False


class ProviderSettingsIn(BaseModel):
    providers: list[ProviderSettingIn] = Field(default_factory=list)
    demoOnlyAccepted: bool = False


class ValidateProviderIn(ProviderSettingIn):
    pass


class GoogleTokenIn(BaseModel):
    credential: str


async def current_user(request: Request) -> StoredUser:
    token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    user_id = verify_token(token) if token else None
    user = await get_repository().get_user(user_id) if user_id else None
    if not user:
        raise HTTPException(401, "Sign in to continue.")
    return user


async def optional_user(request: Request) -> StoredUser | None:
    token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    user_id = verify_token(token) if token else None
    return await get_repository().get_user(user_id) if user_id else None


@app.get("/health")
async def health():
    return {"ok": True, "ai": is_ai_configured()}


@app.post("/api/generate-roadmap")
async def generate(request: Request, user: StoredUser | None = Depends(optional_user)):
    started = time.monotonic()

    if not rate_limit(_client_ip(request)):
        return JSONResponse({"error": "Too many requests — try again in a minute."}, status_code=429)

    try:
        body = await request.json()
        topic = body.get("topic") if isinstance(body, dict) else None
    except Exception:
        return JSONResponse({"error": "Invalid JSON body."}, status_code=400)

    if not isinstance(topic, str) or not topic.strip():
        return JSONResponse({"error": "Provide a topic to generate a roadmap."}, status_code=400)
    clean_topic = topic.strip()
    if len(clean_topic) > 80:
        return JSONResponse({"error": "Topic must be 80 characters or fewer."}, status_code=400)

    repo = get_repository()

    # 1. Cache/curated — anonymous users can browse limited saved/demo roadmaps.
    try:
        cached = await repo.find_by_topic(clean_topic)
    except Exception as e:
        log.error("cache lookup failed: %s", e)
        cached = None
    if cached:
        if not user and cached.source != "curated" and clean_topic.lower() not in CURATED_TOPICS:
            return JSONResponse(
                {"error": "Sign up to generate your own roadmap and save progress.", "code": "SIGNUP_REQUIRED"},
                status_code=401,
            )
        took = int((time.monotonic() - started) * 1000)
        log.info('topic="%s" cache=hit took=%dms', clean_topic, took)
        return {**cached.model_dump(exclude_none=True, exclude={"createdAt"}), "cached": True}

    if not user and clean_topic.lower() not in CURATED_TOPICS:
        return JSONResponse(
            {"error": "Sign up to generate your own roadmap and save progress.", "code": "SIGNUP_REQUIRED"},
            status_code=401,
        )

    if not user and clean_topic.lower() in CURATED_TOPICS:
        roadmap = generate_roadmap(clean_topic)
        await asyncio.sleep(0.25)
    else:
        settings = await repo.get_provider_settings(user.id) if user else ProviderSettings()
        providers = _providers_from_settings(settings)
        if not providers:
            return JSONResponse(
                {"error": "Add an API key to generate custom roadmaps. You can still browse demo roadmaps.", "code": "PROVIDER_KEYS_REQUIRED"},
                status_code=402,
            )
        try:
            roadmap = await generate_with_ai(request.app.state.http, clean_topic, providers)
        except Exception as e:
            log.warning("user provider chain exhausted: %s", e)
            return JSONResponse({"error": str(e)}, status_code=502)

    # 3. Persist — best-effort; a down database never blocks generation.
    try:
        await repo.save(roadmap)
    except Exception as e:
        log.error("failed to persist: %s", e)

    took = int((time.monotonic() - started) * 1000)
    log.info(
        'topic="%s" cache=miss source=%s provider=%s nodes=%d took=%dms',
        clean_topic, roadmap.source, roadmap.provider or "-", len(roadmap.nodes), took,
    )
    return {**roadmap.model_dump(exclude_none=True), "cached": False}


@app.get("/api/roadmaps")
async def recent(user: StoredUser | None = Depends(optional_user)):
    """Recently generated roadmaps — limited for anonymous users."""
    try:
        items = await get_repository().list_recent(20 if user else 4)
    except Exception as e:
        log.error("list failed: %s", e)
        return []
    if not user:
        items = [r for r in items if r.source == "curated" or r.topic.lower() in CURATED_TOPICS][:4]
    return [
        {"topic": r.topic, "concepts": len(r.nodes), "source": r.source, "createdAt": r.createdAt}
        for r in items
    ]


@app.post("/api/auth/register")
async def register(credentials: Credentials, request: Request):
    if not rate_limit(f"auth:{_client_ip(request)}"):
        raise HTTPException(429, "Too many attempts — try again in a minute.")
    email = credentials.normalized_email()
    if not EMAIL_RE.match(email) or len(email) > 254:
        raise HTTPException(400, "Enter a valid email address.")
    if len(credentials.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")
    user = await get_repository().create_user(email, hash_password(credentials.password))
    if not user:
        raise HTTPException(409, "An account with this email already exists.")
    return {"token": create_token(user.id), "email": user.email, "needsProviderOnboarding": True}


@app.post("/api/auth/login")
async def login(credentials: Credentials, request: Request):
    if not rate_limit(f"auth:{_client_ip(request)}"):
        raise HTTPException(429, "Too many attempts — try again in a minute.")
    user = await get_repository().find_user_by_email(credentials.normalized_email())
    if not user or not user.passwordHash or not verify_password(credentials.password, user.passwordHash):
        raise HTTPException(401, "Incorrect email or password.")
    settings = await get_repository().get_provider_settings(user.id)
    return {"token": create_token(user.id), "email": user.email, "needsProviderOnboarding": not _has_enabled_key(settings)}


@app.get("/api/auth/google/login-url")
async def google_login_url_endpoint():
    return {"url": google_login_url()}


@app.get("/api/auth/google/callback")
async def google_callback(code: str, request: Request):
    token_data = await exchange_google_code(request.app.state.http, code)
    userinfo = await fetch_google_userinfo(request.app.state.http, token_data["access_token"])
    session = await google_session(userinfo)
    frontend = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return RedirectResponse(f"{frontend}/auth/google/callback?{urlencode(session)}")


@app.post("/api/auth/google/token")
async def google_token(payload: GoogleTokenIn, request: Request):
    res = await request.app.state.http.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": payload.credential},
        timeout=12.0,
    )
    if res.status_code != 200:
        raise HTTPException(401, "Google token could not be verified.")
    info = res.json()
    if info.get("aud") != os.environ.get("GOOGLE_CLIENT_ID"):
        raise HTTPException(401, "Google token audience mismatch.")
    return await google_session(info)


@app.get("/api/auth/me")
async def me(user: StoredUser = Depends(current_user)):
    settings = await get_repository().get_provider_settings(user.id)
    return {"email": user.email, "needsProviderOnboarding": not _has_enabled_key(settings)}


@app.get("/api/me/provider-settings")
async def get_provider_settings(user: StoredUser = Depends(current_user)):
    settings = await get_repository().get_provider_settings(user.id)
    return _public_settings(settings)


@app.put("/api/me/provider-settings")
async def put_provider_settings(payload: ProviderSettingsIn, user: StoredUser = Depends(current_user)):
    current = await get_repository().get_provider_settings(user.id)
    merged = _merge_provider_settings(current, payload)
    await get_repository().save_provider_settings(user.id, merged)
    return _public_settings(merged)


@app.post("/api/me/provider-settings/validate")
async def post_validate_provider(payload: ValidateProviderIn, request: Request, user: StoredUser = Depends(current_user)):
    provider = _provider_from_input(payload)
    ok, message = await validate_provider(request.app.state.http, provider)
    return {"ok": ok, "message": message}


@app.get("/api/progress/{topic}")
async def get_progress(topic: str, user: StoredUser = Depends(current_user)):
    return {"nodes": await get_repository().get_progress(user.id, topic)}


@app.put("/api/progress/{topic}")
async def put_progress(
    topic: str, nodes: TopicProgress, user: StoredUser = Depends(current_user)
):
    if len(topic) > 80 or len(nodes) > 200 or any(len(v) > 100 for v in nodes.values()):
        raise HTTPException(400, "Progress payload too large.")
    await get_repository().save_progress(user.id, topic, nodes)
    return {"ok": True}


def _merge_provider_settings(current: ProviderSettings, payload: ProviderSettingsIn) -> ProviderSettings:
    old_by_id = {p.id: p for p in current.providers}
    providers: list[ProviderSetting] = []
    for item in payload.providers[:5]:
        if item.id not in {"groq", "gemini", "openrouter", "mistral", "custom"}:
            raise HTTPException(400, f"Unsupported provider: {item.id}")
        old = old_by_id.get(item.id)
        raw_key = (item.apiKey or "").strip()
        if item.delete:
            # explicit delete: drop the stored ciphertext and masked value
            encrypted = None
            masked = None
        else:
            encrypted = encrypt_secret(raw_key) if raw_key else (old.encryptedApiKey if old else None)
            masked = mask_secret(raw_key) if raw_key else (old.apiKeyMasked if old else None)
        default_base, default_model = PROVIDER_DEFAULTS.get(item.id, (None, None))
        providers.append(ProviderSetting(
            id=item.id, enabled=item.enabled, order=item.order,
            encryptedApiKey=encrypted, apiKeyMasked=masked,
            baseUrl=(item.baseUrl or default_base).rstrip("/") if (item.baseUrl or default_base) else None,
            model=item.model or (old.model if old else None) or default_model,
        ))
    return ProviderSettings(providers=providers, demoOnlyAccepted=payload.demoOnlyAccepted)


def _provider_from_input(item: ProviderSettingIn) -> Provider:
    if item.id not in {"groq", "gemini", "openrouter", "mistral", "custom"}:
        raise HTTPException(400, f"Unsupported provider: {item.id}")
    if not item.apiKey:
        raise HTTPException(400, "API key is required for validation.")
    default_base, default_model = PROVIDER_DEFAULTS.get(item.id, (None, None))
    base_url = (item.baseUrl or default_base or "").rstrip("/")
    model = item.model or default_model or "gpt-4o-mini"
    if not base_url:
        raise HTTPException(400, "Custom provider base URL is required.")
    return Provider(id=item.id, base_url=base_url, model=model, api_key=item.apiKey)


def _providers_from_settings(settings: ProviderSettings) -> list[Provider]:
    providers: list[Provider] = []
    for item in sorted(settings.providers, key=lambda p: p.order):
        if not item.enabled or not item.encryptedApiKey:
            continue
        try:
            api_key = decrypt_secret(item.encryptedApiKey)
        except Exception as e:
            log.warning("stored provider key could not be decrypted for %s: %s", item.id, e)
            continue
        default_base, default_model = PROVIDER_DEFAULTS.get(item.id, (None, None))
        base_url = (item.baseUrl or default_base or "").rstrip("/")
        model = item.model or default_model or "gpt-4o-mini"
        if base_url:
            providers.append(Provider(id=item.id, base_url=base_url, model=model, api_key=api_key))
    return providers


def _has_enabled_key(settings: ProviderSettings) -> bool:
    return any(p.enabled and p.encryptedApiKey for p in settings.providers)


def _public_settings(settings: ProviderSettings) -> dict:
    return {
        "providers": [
            {
                "id": p.id,
                "enabled": p.enabled,
                "order": p.order,
                "apiKeyMasked": p.apiKeyMasked,
                "baseUrl": p.baseUrl,
                "model": p.model,
            }
            for p in sorted(settings.providers, key=lambda item: item.order)
        ],
        "demoOnlyAccepted": settings.demoOnlyAccepted,
        "hasConfiguredProvider": _has_enabled_key(settings),
    }
