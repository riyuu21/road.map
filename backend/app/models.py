from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SkillLevel = Literal["beginner", "intermediate", "advanced"]
ProviderId = Literal["groq", "gemini", "openrouter", "mistral", "custom"]


class RoadmapNode(BaseModel):
    id: str
    title: str
    description: str
    level: SkillLevel
    icon: str
    progress: int = 0
    subtopics: list[str] | None = None


class RoadmapEdge(BaseModel):
    id: str
    source: str
    target: str


class Roadmap(BaseModel):
    topic: str
    nodes: list[RoadmapNode]
    edges: list[RoadmapEdge]
    source: Literal["ai", "curated"] = "curated"
    provider: str | None = None


class StoredRoadmap(Roadmap):
    # camelCase to stay compatible with the collection the Next.js backend wrote
    createdAt: datetime


class StoredUser(BaseModel):
    id: str
    email: str
    passwordHash: str = ""
    googleSub: str | None = None
    createdAt: datetime


class ProviderSetting(BaseModel):
    id: ProviderId
    enabled: bool = True
    order: int = 0
    encryptedApiKey: str | None = None
    apiKeyMasked: str | None = None
    baseUrl: str | None = None
    model: str | None = None


class ProviderSettings(BaseModel):
    providers: list[ProviderSetting] = Field(default_factory=list)
    demoOnlyAccepted: bool = False
    updatedAt: datetime | None = None


# completed subtopic indices per node id, same shape the frontend keeps in localStorage
TopicProgress = dict[str, list[int]]
