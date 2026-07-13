from datetime import datetime
from typing import Literal

from pydantic import BaseModel

SkillLevel = Literal["beginner", "intermediate", "advanced"]


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
    passwordHash: str
    createdAt: datetime


# completed subtopic indices per node id, same shape the frontend keeps in localStorage
TopicProgress = dict[str, list[int]]
