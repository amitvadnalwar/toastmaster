from enum import StrEnum
from pydantic import BaseModel, Field


class VoteCategory(StrEnum):
    best_speaker = "best_speaker"
    best_supporting_role = "best_supporting_role"
    best_table_topics_master = "best_table_topics_master"
    best_evaluator = "best_evaluator"
    best_table_topic = "best_table_topic"
    best_mrp = "best_mrp"  # Main Role Player — the meeting's TMOD


class VoteIn(BaseModel):
    meeting_id: str
    category: VoteCategory
    nominee_id: str


class RatingIn(BaseModel):
    meeting_id: str
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class VoteSummaryItem(BaseModel):
    category: VoteCategory
    nominee_id: str
    nominee_name: str
    count: int


# ── Member's own voting state ──────────────────────────────────────────────

class MyVoteOut(BaseModel):
    category: VoteCategory
    nominee_id: str


class MyRatingOut(BaseModel):
    rating: int
    comment: str | None = None


class MyVotingStateOut(BaseModel):
    votes: list[MyVoteOut]
    rating: MyRatingOut | None = None
