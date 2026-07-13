import asyncio
import logging
import re
import time
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .ai_generator import generate_with_ai, is_ai_configured  # noqa: E402
from .auth import create_token, hash_password, verify_password, verify_token  # noqa: E402
from .mock_generator import generate_roadmap  # noqa: E402
from .models import StoredUser, TopicProgress  # noqa: E402
from .rate_limit import rate_limit  # noqa: E402
from .repository import get_repository  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("roadmap")


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


async def current_user(request: Request) -> StoredUser:
    token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    user_id = verify_token(token) if token else None
    user = await get_repository().get_user(user_id) if user_id else None
    if not user:
        raise HTTPException(401, "Sign in to continue.")
    return user


@app.get("/health")
async def health():
    return {"ok": True, "ai": is_ai_configured()}


@app.post("/api/generate-roadmap")
async def generate(request: Request):
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

    # 1. Cache — serve a previously generated roadmap instead of burning tokens.
    try:
        cached = await repo.find_by_topic(clean_topic)
    except Exception as e:
        log.error("cache lookup failed: %s", e)
        cached = None
    if cached:
        took = int((time.monotonic() - started) * 1000)
        log.info('topic="%s" cache=hit took=%dms', clean_topic, took)
        return {**cached.model_dump(exclude_none=True, exclude={"createdAt"}), "cached": True}

    # 2. Generate — AI provider chain when configured, mock otherwise.
    if is_ai_configured():
        try:
            roadmap = await generate_with_ai(request.app.state.http, clean_topic)
        except Exception as e:
            log.error("AI chain exhausted, using mock: %s", e)
            roadmap = generate_roadmap(clean_topic)
    else:
        roadmap = generate_roadmap(clean_topic)
        # small artificial latency so the mock still feels like a generation step
        await asyncio.sleep(0.4)

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
async def recent():
    """Recently generated roadmaps — powers the "Recent" list in the workspace."""
    try:
        items = await get_repository().list_recent(8)
    except Exception as e:
        log.error("list failed: %s", e)
        return []
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
    return {"token": create_token(user.id), "email": user.email}


@app.post("/api/auth/login")
async def login(credentials: Credentials, request: Request):
    if not rate_limit(f"auth:{_client_ip(request)}"):
        raise HTTPException(429, "Too many attempts — try again in a minute.")
    user = await get_repository().find_user_by_email(credentials.normalized_email())
    if not user or not verify_password(credentials.password, user.passwordHash):
        raise HTTPException(401, "Incorrect email or password.")
    return {"token": create_token(user.id), "email": user.email}


@app.get("/api/auth/me")
async def me(user: StoredUser = Depends(current_user)):
    return {"email": user.email}


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
