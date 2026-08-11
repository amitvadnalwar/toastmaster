from enum import StrEnum

from pydantic import BaseModel


class AgendaItemType(StrEnum):
    section = "section"
    item = "item"
    speech = "speech"


class AgendaItemIn(BaseModel):
    item_type: AgendaItemType
    title: str
    break_minutes: int | None = None
    duration_green_sec: int | None = None
    duration_yellow_sec: int | None = None
    duration_red_sec: int | None = None
    start_time_override: str | None = None  # "HH:MM"
    host_member_id: str | None = None
    host_name: str | None = None
    evaluator_member_id: str | None = None
    evaluator_name: str | None = None
    path_code: str | None = None
    level_project: str | None = None


class AgendaItemOut(AgendaItemIn):
    id: str
    meeting_id: str
    position: int
    computed_start_time: str  # "HH:MM" — server-computed via the time cascade


class AgendaSaveIn(BaseModel):
    items: list[AgendaItemIn]
    word_of_day: str | None = None
    word_of_day_meaning: str | None = None
    word_of_day_usage: str | None = None
    idiom_of_day: str | None = None
    idiom_of_day_meaning: str | None = None
    idiom_of_day_usage: str | None = None


class AgendaOut(BaseModel):
    items: list[AgendaItemOut]
    word_of_day: str | None = None
    word_of_day_meaning: str | None = None
    word_of_day_usage: str | None = None
    idiom_of_day: str | None = None
    idiom_of_day_meaning: str | None = None
    idiom_of_day_usage: str | None = None
