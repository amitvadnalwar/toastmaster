from enum import StrEnum
from pydantic import BaseModel


class MeetingStatus(StrEnum):
    draft = "draft"
    published = "published"
    completed = "completed"


class VotingStatus(StrEnum):
    not_started = "not_started"
    open = "open"
    closed = "closed"


class MeetingRole(StrEnum):
    # Role player positions
    tmod = "tmod"
    general_evaluator = "general_evaluator"
    ah_counter = "ah_counter"
    timer = "timer"
    grammarian = "grammarian"
    table_topics_master = "table_topics_master"
    table_topics_speaker = "table_topics_speaker"
    # Speaker / evaluator slots (multiple allowed per meeting)
    speaker = "speaker"
    evaluator = "evaluator"
    # Legacy catch-all
    supporting_role = "supporting_role"


# Roles for which only ONE assignment is allowed per meeting
SINGLETON_ROLES: frozenset[MeetingRole] = frozenset({
    MeetingRole.tmod,
    MeetingRole.general_evaluator,
    MeetingRole.ah_counter,
    MeetingRole.timer,
    MeetingRole.grammarian,
    MeetingRole.table_topics_master,
})

SPEECH_DURATIONS: frozenset[str] = frozenset({"5-7 mins", "7-9 mins", "10-12 mins"})


class MeetingOut(BaseModel):
    id: str
    club_id: str
    title: str
    scheduled_at: str
    venue: str | None = None
    theme: str | None = None
    president_id: str | None = None
    saa_id: str | None = None
    max_speakers: int = 3
    voting_status: VotingStatus
    status: MeetingStatus
    created_by: str
    created_at: str
    qr_token: str | None = None


class MeetingCreateIn(BaseModel):
    title: str
    scheduled_at: str
    venue: str | None = None
    president_id: str | None = None
    saa_id: str | None = None
    max_speakers: int = 3


class MeetingStatusUpdateIn(BaseModel):
    status: MeetingStatus


class VotingStatusUpdateIn(BaseModel):
    voting_status: VotingStatus


class MeetingRoleAssignmentOut(BaseModel):
    id: str
    meeting_id: str
    member_id: str
    role: MeetingRole
    evaluates_member_id: str | None
    speech_duration: str | None = None
    member_name: str | None = None
    member_email: str | None = None


# ── Self-enrollment inputs (member enrolling themselves) ──────────────────

class EnrollRoleIn(BaseModel):
    """Enroll in a singleton role-player slot (TMOD, GE, Ah Counter, etc.)."""
    role: MeetingRole
    theme: str | None = None  # required when role == tmod


class EnrollSpeakerIn(BaseModel):
    speech_duration: str  # "5-7 mins" | "7-9 mins" | "10-12 mins"


class EnrollEvaluatorIn(BaseModel):
    evaluates_member_id: str  # member_id of the speaker to evaluate


# ── Admin assignment (admin picks any member for any role) ────────────────

class AdminAssignRoleIn(BaseModel):
    member_id: str
    role: MeetingRole
    speech_duration: str | None = None       # required when role == speaker
    evaluates_member_id: str | None = None   # required when role == evaluator
    theme: str | None = None                 # optional: sets meeting theme when role == tmod


class RoleAssignIn(BaseModel):
    meeting_id: str
    member_id: str
    role: MeetingRole
    evaluates_member_id: str | None = None


# ── Check-in ──────────────────────────────────────────────────────────────

class CheckinIn(BaseModel):
    qr_token: str


class CheckinOut(BaseModel):
    meeting: MeetingOut
    already_checked_in: bool


# ── Speaker feedback ──────────────────────────────────────────────────────

class SpeakerFeedbackIn(BaseModel):
    speaker_member_id: str
    rating: int   # 1–5
    comment: str | None = None


class MeetingFeedbackIn(BaseModel):
    feedbacks: list[SpeakerFeedbackIn]


class SpeakerFeedbackOut(BaseModel):
    id: str
    meeting_id: str
    from_member_id: str
    speaker_member_id: str
    speaker_name: str | None = None
    rating: int
    comment: str | None = None
    created_at: str
