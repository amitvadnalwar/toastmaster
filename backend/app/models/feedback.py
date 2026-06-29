from enum import StrEnum
from pydantic import BaseModel, Field


class EmailStatus(StrEnum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class FeedbackIn(BaseModel):
    meeting_id: str
    speaker_id: str
    comment: str = Field(max_length=5000)


class FeedbackUpdateIn(BaseModel):
    comment: str = Field(max_length=5000)


class FeedbackOut(BaseModel):
    id: str
    meeting_id: str
    speaker_id: str
    evaluator_id: str
    comment: str
    created_at: str
    updated_at: str


class EmailLogOut(BaseModel):
    id: str
    meeting_id: str
    speaker_id: str
    sent_at: str | None
    status: EmailStatus
    error_message: str | None


class EmailDispatchResult(BaseModel):
    sent: int
    failed: int
    skipped: int
