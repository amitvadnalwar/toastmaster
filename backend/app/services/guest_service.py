from fastapi import HTTPException, status

from app.models.guest import (
    GuestMeetingFeedbackIn,
    GuestRegisterIn,
    GuestRegisterOut,
    GuestSpeakerFeedbackIn,
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


async def register_guest(body: GuestRegisterIn) -> GuestRegisterOut:
    from app.db import guests as db

    club_id = await db.get_meeting_club_id(str(body.meeting_id))
    if not club_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

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
            "overall_rating": fb.overall_rating,
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
