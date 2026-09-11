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
    email: str | None = None
    phone: str | None = None
    # The check-in form no longer asks "how did you find us?" — kept optional
    # so older clients / admin tooling can still set it.
    source: GuestSource | None = None


class GuestRegisterOut(BaseModel):
    id: str
    name: str


# ── Admin: view guests registered for a meeting ────────────────────────────

class GuestOut(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    source: str | None = None
    created_at: str


class MeetingCheckinStatusOut(BaseModel):
    open: bool


# ── Meeting speakers & nominees ───────────────────────────────────────────────

class SpeakerOut(BaseModel):
    # The speaker's own meeting_roles row — stable identity whether or not
    # they have a member account.
    role_id: str
    member_id: str | None = None
    name: str


class GuestAddSpeakerIn(BaseModel):
    """Lets a guest add a speaker the admin missed, so they can rate them —
    free-text only (guests can't browse the club's member directory)."""
    guest_name: str


class NomineeOut(BaseModel):
    # The nominee's own meeting_roles row — stable identity whether or not
    # they have a member account.
    role_id: str
    member_id: str | None = None
    name: str


class NomineeCategoryOut(BaseModel):
    category: str
    label: str
    nominees: list[NomineeOut]


# ── Speaker feedback ──────────────────────────────────────────────────────────

class SpeakerFeedbackItem(BaseModel):
    speaker_role_id: UUID
    content_rating: int = Field(..., ge=1, le=3)
    structure_rating: int = Field(..., ge=1, le=3)
    interaction_rating: int = Field(..., ge=1, le=3)
    confidence_rating: int = Field(..., ge=1, le=3)
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
    nominee_role_id: UUID


class GuestVotesIn(BaseModel):
    meeting_id: UUID
    votes: list[GuestVoteItem]


# ── Resuming a returning guest's previously-submitted feedback ────────────────

class GuestSpeakerFeedbackOut(BaseModel):
    speaker_role_id: str
    content_rating: int
    structure_rating: int
    interaction_rating: int
    confidence_rating: int
    comment: str | None = None


class GuestMeetingFeedbackOut(BaseModel):
    punctual_rating: int
    agenda_rating: int
    inclusive_rating: int
    experience_rating: int
    overall_rating: int
    comment: str | None = None


class GuestVoteOut(BaseModel):
    category: str
    nominee_role_id: str
    nominee_id: str | None = None


class GuestProgressOut(BaseModel):
    guest_name: str
    speaker_feedback: list[GuestSpeakerFeedbackOut]
    meeting_feedback: GuestMeetingFeedbackOut | None = None
    votes: list[GuestVoteOut]
