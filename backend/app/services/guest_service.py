from fastapi import HTTPException, status

from app.middleware.auth import CurrentUser
from app.models.guest import (
    GuestMeetingFeedbackIn,
    GuestMeetingFeedbackOut,
    GuestOut,
    GuestProgressOut,
    GuestRegisterIn,
    GuestRegisterOut,
    GuestSpeakerFeedbackIn,
    GuestSpeakerFeedbackOut,
    GuestVoteOut,
    GuestVotesIn,
    NomineeCategoryOut,
    NomineeOut,
    SpeakerOut,
)

# Maps vote category → meeting_roles.role values
_CATEGORY_ROLES: dict[str, list[str]] = {
    "best_speaker": ["speaker"],
    "best_evaluator": ["evaluator"],
    "best_table_topic": ["table_topics_speaker"],
    "best_main_role": ["tmod", "general_evaluator"],
    "best_supporting_role": ["supporting_role"],
}

_CATEGORY_LABELS: dict[str, str] = {
    "best_speaker": "Best Speaker",
    "best_evaluator": "Best Evaluator",
    "best_table_topic": "Best Table Topics Speaker",
    "best_main_role": "Best Main Role Player",
    "best_supporting_role": "Best Supporting Role Player",
}


async def _fetch_current_meeting(meeting_id: str) -> dict | None:
    from app.db import meetings as db_meetings
    from app.services.meeting_service import auto_complete_if_due

    meeting_row = await db_meetings.get_by_id(meeting_id)
    if not meeting_row:
        return None
    # Mirrors the member QR check-in flow: a published meeting whose date has
    # passed is auto-completed, and registration only stays open while published.
    return await auto_complete_if_due(meeting_row)


async def is_meeting_open_for_checkin(meeting_id: str) -> bool:
    from app.models.meeting import MeetingStatus

    meeting_row = await _fetch_current_meeting(meeting_id)
    return meeting_row is not None and meeting_row["status"] == MeetingStatus.published


async def register_guest(body: GuestRegisterIn) -> GuestRegisterOut:
    from app.db import guests as db
    from app.models.meeting import MeetingStatus

    meeting_row = await _fetch_current_meeting(str(body.meeting_id))
    if not meeting_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    if meeting_row["status"] != MeetingStatus.published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This meeting is no longer accepting registrations",
        )
    club_id = meeting_row["club_id"]

    phone = body.phone.strip() if body.phone else None

    existing = await db.find_guest_by_meeting_name_phone(
        str(body.meeting_id), body.name, phone
    )
    if existing:
        return GuestRegisterOut(id=existing["id"], name=existing["name"])

    row = await db.insert_guest(
        club_id=club_id,
        meeting_id=str(body.meeting_id),
        name=body.name.strip(),
        phone=phone,
        source=body.source,
    )
    return GuestRegisterOut(id=row["id"], name=row["name"])


async def get_guest_progress(guest_id: str, meeting_id: str) -> GuestProgressOut:
    from app.db import guests as db

    guest = await db.get_guest(guest_id)
    if not guest or guest["meeting_id"] != meeting_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found")

    speaker_feedback = await db.get_speaker_feedback_for_guest(guest_id, meeting_id)
    meeting_feedback = await db.get_meeting_feedback_for_guest(guest_id, meeting_id)
    votes = await db.get_votes_for_guest(guest_id, meeting_id)

    return GuestProgressOut(
        guest_name=guest["name"],
        speaker_feedback=[GuestSpeakerFeedbackOut(**fb) for fb in speaker_feedback],
        meeting_feedback=GuestMeetingFeedbackOut(**meeting_feedback) if meeting_feedback else None,
        votes=[GuestVoteOut(**v) for v in votes],
    )


async def get_meeting_guests_for_admin(meeting_id: str, user: CurrentUser) -> list[GuestOut]:
    from app.db import guests as db

    club_id = await db.get_meeting_club_id(meeting_id)
    if not club_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    if club_id != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")

    rows = await db.get_guests_for_meeting(meeting_id)
    return [GuestOut(**r) for r in rows]


async def get_meeting_speakers(meeting_id: str) -> list[SpeakerOut]:
    from app.db import guests as db

    rows = await db.get_speakers_for_meeting(meeting_id)
    return [SpeakerOut(member_id=r["member_id"], name=r["name"]) for r in rows]


async def get_meeting_nominees(meeting_id: str) -> list[NomineeCategoryOut]:
    from app.db import guests as db

    rows = await db.get_nominees_for_meeting(meeting_id)

    by_category: dict[str, list[NomineeOut]] = {cat: [] for cat in _CATEGORY_ROLES}

    for row in rows:
        role = row.get("role")
        member = row.get("member")
        if not member:
            continue
        nominee = NomineeOut(member_id=row["member_id"], name=member["name"])
        for category, roles in _CATEGORY_ROLES.items():
            if role in roles:
                by_category[category].append(nominee)

    return [
        NomineeCategoryOut(category=cat, label=_CATEGORY_LABELS[cat], nominees=nominees)
        for cat, nominees in by_category.items()
        if nominees
    ]


async def submit_speaker_feedback(guest_id: str, body: GuestSpeakerFeedbackIn) -> None:
    if not body.feedbacks:
        return
    from app.db import guests as db

    feedbacks = [
        {
            "speaker_member_id": str(fb.speaker_member_id),
            "content_rating": fb.content_rating,
            "structure_rating": fb.structure_rating,
            "interaction_rating": fb.interaction_rating,
            "confidence_rating": fb.confidence_rating,
            "comment": fb.comment,
        }
        for fb in body.feedbacks
    ]
    await db.upsert_speaker_feedback(guest_id, str(body.meeting_id), feedbacks)


async def submit_meeting_feedback(guest_id: str, body: GuestMeetingFeedbackIn) -> None:
    from app.db import guests as db

    await db.upsert_meeting_feedback(
        guest_id,
        str(body.meeting_id),
        {
            "punctual_rating": body.punctual_rating,
            "agenda_rating": body.agenda_rating,
            "inclusive_rating": body.inclusive_rating,
            "experience_rating": body.experience_rating,
            "overall_rating": body.overall_rating,
            "comment": body.comment,
        },
    )


async def submit_votes(guest_id: str, body: GuestVotesIn) -> None:
    if not body.votes:
        return
    from app.db import guests as db

    votes = [
        {"category": v.category, "nominee_id": str(v.nominee_id)}
        for v in body.votes
    ]
    await db.upsert_guest_votes(guest_id, str(body.meeting_id), votes)
