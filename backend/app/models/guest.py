from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


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


# ── Meeting speakers & nominees ───────────────────────────────────────────────

class SpeakerOut(BaseModel):
    member_id: str
    name: str


class NomineeOut(BaseModel):
    member_id: str
    name: str


class NomineeCategoryOut(BaseModel):
    category: str
    label: str
    nominees: list[NomineeOut]


# ── Speaker feedback ──────────────────────────────────────────────────────────

class SpeakerFeedbackItem(BaseModel):
    speaker_member_id: UUID
    content_rating: int = Field(..., ge=1, le=5)
    structure_rating: int = Field(..., ge=1, le=5)
    interaction_rating: int = Field(..., ge=1, le=5)
    confidence_rating: int = Field(..., ge=1, le=5)
    overall_rating: int = Field(..., ge=1, le=5)
    comment: str | None = None


class GuestSpeakerFeedbackIn(BaseModel):
    meeting_id: UUID
    feedbacks: list[SpeakerFeedbackItem]


# ── Meeting quality feedback ──────────────────────────────────────────────────

class GuestMeetingFeedbackIn(BaseModel):
    meeting_id: UUID
    punctual_rating: int = Field(..., ge=1, le=5)
    agenda_rating: int = Field(..., ge=1, le=5)
    inclusive_rating: int = Field(..., ge=1, le=5)
    experience_rating: int = Field(..., ge=1, le=5)
    overall_rating: int = Field(..., ge=1, le=5)
    comment: str | None = None


# ── Award votes ───────────────────────────────────────────────────────────────

class GuestVoteItem(BaseModel):
    category: str
    nominee_id: UUID


class GuestVotesIn(BaseModel):
    meeting_id: UUID
    votes: list[GuestVoteItem]
