from enum import StrEnum
from pydantic import BaseModel, Field


class VoteCategory(StrEnum):
    best_speaker = "best_speaker"
    best_supporting_role = "best_supporting_role"
    best_table_topics_master = "best_table_topics_master"
    best_evaluator = "best_evaluator"
    best_table_topic = "best_table_topic"


class VoteIn(BaseModel):
    meeting_id: str
    category: VoteCategory
    nominee_id: str


class RatingIn(BaseModel):
    meeting_id: str
    rating: int = Field(ge=1, le=5)


class VoteSummaryItem(BaseModel):
    category: VoteCategory
    nominee_id: str
    nominee_name: str
    count: int
