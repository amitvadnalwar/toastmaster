from fastapi import HTTPException, status

from app.db import agenda as db_agenda
from app.db import meetings as db_meetings
from app.middleware.auth import CurrentUser
from app.models.agenda import AgendaItemOut, AgendaOut, AgendaSaveIn

_WOD_IOD_FIELDS = (
    "word_of_day",
    "word_of_day_meaning",
    "word_of_day_usage",
    "idiom_of_day",
    "idiom_of_day_meaning",
    "idiom_of_day_usage",
)


# ── Time cascade ──────────────────────────────────────────────────────────
# Every row's start time = the previous row's start time + the previous
# row's duration (its Red/max timing-card value for item/speech rows, or its
# break_minutes for section rows) — unless the row has its own manual
# start_time_override, which wins. This mirrors exactly how the admin's
# Excel agenda cascades today (verified against three real meeting agendas).

def _hhmm_to_seconds(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 3600 + int(m) * 60


def _seconds_to_hhmm(total_seconds: int) -> str:
    total_seconds %= 24 * 3600
    return f"{total_seconds // 3600:02d}:{(total_seconds % 3600) // 60:02d}"


def compute_times(rows: list[dict]) -> list[dict]:
    out: list[dict] = []
    current_sec: int | None = None
    for row in rows:
        if row.get("start_time_override"):
            current_sec = _hhmm_to_seconds(row["start_time_override"])
        # else: current_sec carries over from the previous row's cascade.
        # (Row 0 is guaranteed to have start_time_override — enforced in save_agenda.)
        out.append({**row, "computed_start_time": _seconds_to_hhmm(current_sec)})
        if row["item_type"] == "section":
            current_sec += (row.get("break_minutes") or 0) * 60
        else:
            current_sec += row.get("duration_red_sec") or 0
    return out


# ── Helpers ───────────────────────────────────────────────────────────────

async def _require_meeting_in_club(meeting_id: str, user: CurrentUser) -> dict:
    meeting = await db_meetings.get_by_id(meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    if meeting["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    return meeting


def _agenda_out(meeting: dict, item_rows: list[dict]) -> AgendaOut:
    computed = compute_times(item_rows)
    return AgendaOut(
        items=[AgendaItemOut(**row) for row in computed],
        **{field: meeting.get(field) for field in _WOD_IOD_FIELDS},
    )


# ── Read ──────────────────────────────────────────────────────────────────

async def get_agenda(meeting_id: str, user: CurrentUser) -> AgendaOut:
    meeting = await _require_meeting_in_club(meeting_id, user)
    rows = await db_agenda.get_items(meeting_id)
    return _agenda_out(meeting, rows)


# ── Write ─────────────────────────────────────────────────────────────────

async def save_agenda(meeting_id: str, body: AgendaSaveIn, user: CurrentUser) -> AgendaOut:
    meeting = await _require_meeting_in_club(meeting_id, user)

    if body.items and not body.items[0].start_time_override:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The first row must have a start time set.",
        )

    item_dicts = [item.model_dump() for item in body.items]
    saved_rows = await db_agenda.replace_items(meeting_id, item_dicts)

    wod_iod = {field: getattr(body, field) for field in _WOD_IOD_FIELDS}
    updated_meeting = await db_agenda.update_word_idiom_of_day(meeting_id, wod_iod)

    return _agenda_out(updated_meeting, saved_rows)


async def clone_previous_agenda(meeting_id: str, user: CurrentUser) -> AgendaOut:
    meeting = await _require_meeting_in_club(meeting_id, user)

    source_id = await db_agenda.find_previous_meeting_with_agenda(
        club_id=meeting["club_id"],
        before_scheduled_at=meeting["scheduled_at"],
        exclude_meeting_id=meeting_id,
    )
    if not source_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No previous meeting with an agenda was found to clone from.",
        )

    source_rows = await db_agenda.get_items(source_id)
    source_meeting = await db_meetings.get_by_id(source_id)

    # Drop server-assigned fields so replace_items treats these as fresh rows.
    cloned = [
        {k: v for k, v in row.items() if k not in ("id", "meeting_id", "position", "created_at")}
        for row in source_rows
    ]
    saved_rows = await db_agenda.replace_items(meeting_id, cloned)

    wod_iod = {field: source_meeting.get(field) for field in _WOD_IOD_FIELDS}
    updated_meeting = await db_agenda.update_word_idiom_of_day(meeting_id, wod_iod)

    return _agenda_out(updated_meeting, saved_rows)
