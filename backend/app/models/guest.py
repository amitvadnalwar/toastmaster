from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel


class GuestSource(StrEnum):
    google = "Google"
    word_of_mouth = "Word of mouth"
    linkedin = "LinkedIn"
    instagram = "Instagram"
    other = "Other"


class GuestRegisterIn(BaseModel):
    meeting_id: UUID
    name: str
    phone: str | None = None
    source: GuestSource


class GuestRegisterOut(BaseModel):
    id: str
    name: str
