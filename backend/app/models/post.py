from enum import StrEnum
from pydantic import BaseModel


class PostPlatform(StrEnum):
    instagram = "instagram"
    linkedin = "linkedin"


class PostOut(BaseModel):
    id: str
    club_id: str
    platform: PostPlatform
    url: str
    thumbnail_url: str | None
    is_active: bool
    created_at: str


class PostIn(BaseModel):
    platform: PostPlatform
    url: str
    thumbnail_url: str | None = None
