import os
import re
from datetime import datetime, timezone
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorClient

from .models import ProviderSettings, Roadmap, StoredRoadmap, StoredUser, TopicProgress


class InMemoryRepository:
    """Zero-config fallback so the API runs without a database."""

    def __init__(self) -> None:
        self._store: dict[str, StoredRoadmap] = {}
        self._users: dict[str, StoredUser] = {}  # keyed by email
        self._provider_settings: dict[str, ProviderSettings] = {}
        self._progress: dict[tuple[str, str], TopicProgress] = {}  # (user id, topic)

    async def save(self, roadmap: Roadmap) -> None:
        stored = StoredRoadmap(**roadmap.model_dump(), createdAt=datetime.now(timezone.utc))
        self._store[roadmap.topic.lower()] = stored

    async def find_by_topic(self, topic: str) -> StoredRoadmap | None:
        return self._store.get(topic.lower())

    async def list_recent(self, limit: int) -> list[StoredRoadmap]:
        return sorted(self._store.values(), key=lambda r: r.createdAt, reverse=True)[:limit]

    async def create_user(self, email: str, password_hash: str) -> StoredUser | None:
        if email in self._users:
            return None
        user = StoredUser(
            id=uuid4().hex, email=email, passwordHash=password_hash,
            createdAt=datetime.now(timezone.utc),
        )
        self._users[email] = user
        return user

    async def create_or_update_google_user(self, email: str, google_sub: str) -> StoredUser:
        existing = self._users.get(email)
        if existing:
            existing.googleSub = existing.googleSub or google_sub
            self._users[email] = existing
            return existing
        user = StoredUser(
            id=uuid4().hex, email=email, googleSub=google_sub,
            createdAt=datetime.now(timezone.utc),
        )
        self._users[email] = user
        return user

    async def find_user_by_email(self, email: str) -> StoredUser | None:
        return self._users.get(email)

    async def get_user(self, user_id: str) -> StoredUser | None:
        return next((u for u in self._users.values() if u.id == user_id), None)

    async def get_progress(self, user_id: str, topic: str) -> TopicProgress:
        return self._progress.get((user_id, topic.lower()), {})

    async def save_progress(self, user_id: str, topic: str, progress: TopicProgress) -> None:
        self._progress[(user_id, topic.lower())] = progress

    async def get_provider_settings(self, user_id: str) -> ProviderSettings:
        return self._provider_settings.get(user_id, ProviderSettings())

    async def save_provider_settings(self, user_id: str, settings: ProviderSettings) -> None:
        settings.updatedAt = datetime.now(timezone.utc)
        self._provider_settings[user_id] = settings


class MongoRepository:
    def __init__(self, uri: str, db: str) -> None:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=3000)
        # same collection/shape the Next.js backend wrote: {topic, nodes, edges, createdAt}
        self._col = client[db]["roadmaps"]
        self._users = client[db]["users"]
        self._provider_settings = client[db]["provider_settings"]
        self._progress = client[db]["progress"]

    async def save(self, roadmap: Roadmap) -> None:
        doc = roadmap.model_dump(exclude_none=True)
        doc["createdAt"] = datetime.now(timezone.utc)
        await self._col.update_one({"topic": roadmap.topic}, {"$set": doc}, upsert=True)

    async def find_by_topic(self, topic: str) -> StoredRoadmap | None:
        doc = await self._col.find_one(
            {"topic": {"$regex": f"^{re.escape(topic)}$", "$options": "i"}}
        )
        return StoredRoadmap(**{k: v for k, v in doc.items() if k != "_id"}) if doc else None

    async def list_recent(self, limit: int) -> list[StoredRoadmap]:
        docs = await self._col.find().sort("createdAt", -1).limit(limit).to_list(limit)
        return [StoredRoadmap(**{k: v for k, v in d.items() if k != "_id"}) for d in docs]

    async def create_user(self, email: str, password_hash: str) -> StoredUser | None:
        user = StoredUser(
            id=uuid4().hex, email=email, passwordHash=password_hash,
            createdAt=datetime.now(timezone.utc),
        )
        # upsert + $setOnInsert keeps registration race-safe without a unique index
        result = await self._users.update_one(
            {"email": email}, {"$setOnInsert": user.model_dump()}, upsert=True
        )
        return user if result.upserted_id else None

    async def create_or_update_google_user(self, email: str, google_sub: str) -> StoredUser:
        existing = await self.find_user_by_email(email)
        if existing:
            if not existing.googleSub:
                await self._users.update_one({"id": existing.id}, {"$set": {"googleSub": google_sub}})
                existing.googleSub = google_sub
            return existing
        user = StoredUser(
            id=uuid4().hex, email=email, googleSub=google_sub,
            createdAt=datetime.now(timezone.utc),
        )
        await self._users.insert_one(user.model_dump())
        return user

    async def find_user_by_email(self, email: str) -> StoredUser | None:
        doc = await self._users.find_one({"email": email})
        return StoredUser(**{k: v for k, v in doc.items() if k != "_id"}) if doc else None

    async def get_user(self, user_id: str) -> StoredUser | None:
        doc = await self._users.find_one({"id": user_id})
        return StoredUser(**{k: v for k, v in doc.items() if k != "_id"}) if doc else None

    async def get_progress(self, user_id: str, topic: str) -> TopicProgress:
        doc = await self._progress.find_one({"userId": user_id, "topic": topic.lower()})
        return doc["nodes"] if doc else {}

    async def save_progress(self, user_id: str, topic: str, progress: TopicProgress) -> None:
        await self._progress.update_one(
            {"userId": user_id, "topic": topic.lower()},
            {"$set": {"nodes": progress, "updatedAt": datetime.now(timezone.utc)}},
            upsert=True,
        )

    async def get_provider_settings(self, user_id: str) -> ProviderSettings:
        doc = await self._provider_settings.find_one({"userId": user_id})
        return ProviderSettings(**{k: v for k, v in doc.items() if k not in {"_id", "userId"}}) if doc else ProviderSettings()

    async def save_provider_settings(self, user_id: str, settings: ProviderSettings) -> None:
        settings.updatedAt = datetime.now(timezone.utc)
        await self._provider_settings.update_one(
            {"userId": user_id},
            {"$set": {**settings.model_dump(), "userId": user_id}},
            upsert=True,
        )


Repository = InMemoryRepository | MongoRepository

_repository: Repository | None = None


def get_repository() -> Repository:
    global _repository
    if _repository is None:
        uri = os.environ.get("MONGODB_URI")
        db = os.environ.get("MONGODB_DB") or "roadmap"
        _repository = MongoRepository(uri, db) if uri else InMemoryRepository()
    return _repository
