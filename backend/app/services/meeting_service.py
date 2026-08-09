import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.db import meetings as db_meetings
from app.db import members as db_members
from app.middleware.auth import CurrentUser
from app.models.meeting import (
    AdminAssignRoleIn,
    AttendanceOut,
    CheckinOut,
    MeetingCreateIn,
    MeetingFeedbackIn,
    MeetingOut,
    MeetingRole,
    MeetingRoleAssignmentOut,
    MeetingStatus,
    ReceivedFeedbackOut,
    SINGLETON_ROLES,
    SPEECH_DURATIONS,
    RoleAssignIn,
    SpeakerFeedbackOut,
    SpeakerFeedbackStatusOut,
    SpeakingHistoryItemOut,
    VotingStatus,
)

_VALID_STATUS_TRANSITIONS = {
    MeetingStatus.draft: MeetingStatus.published,
    MeetingStatus.published: MeetingStatus.completed,
    # Reopening (super_admin only, enforced in update_meeting_status) sends a
    # completed meeting back to published.
    MeetingStatus.completed: MeetingStatus.published,
}


# ── Helpers ───────────────────────────────────────────────────────────────

def _meeting_out(row: dict) -> MeetingOut:
    return MeetingOut(**row)


def _role_out(row: dict) -> MeetingRoleAssignmentOut:
    return MeetingRoleAssignmentOut(**row)


async def auto_complete_if_due(row: dict) -> dict:
    """A published meeting whose date has passed is auto-marked completed.
    Skipped for meetings a super admin has just reopened (reopened=True) so
    the reopen isn't immediately undone on the next read."""
    if row["status"] != MeetingStatus.published.value or row.get("reopened"):
        return row
    try:
        scheduled = datetime.fromisoformat(row["scheduled_at"])
    except (ValueError, TypeError):
        return row
    if scheduled.tzinfo is None:
        scheduled = scheduled.replace(tzinfo=timezone.utc)
    if scheduled >= datetime.now(timezone.utc):
        return row
    return await db_meetings.update_status(row["id"], MeetingStatus.completed.value)


async def _require_meeting(meeting_id: str) -> dict:
    row = await db_meetings.get_by_id(meeting_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return await auto_complete_if_due(row)


async def _require_member(user: CurrentUser) -> dict:
    member = await db_members.get_by_auth_user_id(user.id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member record not found")
    return member


# ── Read ──────────────────────────────────────────────────────────────────

async def get_meeting_by_id(meeting_id: str) -> MeetingOut:
    return _meeting_out(await _require_meeting(meeting_id))


async def get_all_meetings(club_id: str) -> list[MeetingOut]:
    rows = await db_meetings.get_all_for_club(club_id)
    updated = [await auto_complete_if_due(r) for r in rows]
    return [_meeting_out(r) for r in updated]


async def get_current_meeting(club_id: str) -> dict:
    meeting_row = await db_meetings.get_current_for_club(club_id)
    if not meeting_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active meeting")
    roster_rows = await db_meetings.get_roster(meeting_row["id"])
    return {
        "meeting": _meeting_out(meeting_row).model_dump(),
        "roster": [_role_out(r).model_dump() for r in roster_rows],
    }


async def get_meeting_with_roster(meeting_id: str, user: CurrentUser) -> dict:
    meeting_row = await _require_meeting(meeting_id)
    if meeting_row["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    roster_rows = await db_meetings.get_roster(meeting_id)

    already_checked_in = False
    member = await db_members.get_by_auth_user_id(user.id)
    if member:
        attendance = await db_meetings.get_attendance(meeting_id, member["id"])
        already_checked_in = attendance is not None

    return {
        "meeting": _meeting_out(meeting_row).model_dump(),
        "roster": [_role_out(r).model_dump() for r in roster_rows],
        "already_checked_in": already_checked_in,
    }


# ── Create / Update ───────────────────────────────────────────────────────

async def create_meeting(body: MeetingCreateIn, user: CurrentUser) -> MeetingOut:
    member = await _require_member(user)
    row = await db_meetings.insert(
        club_id=user.club_id,
        title=body.title,
        scheduled_at=body.scheduled_at,
        created_by=member["id"],
        venue=body.venue,
        president_id=body.president_id,
        saa_id=body.saa_id,
        max_speakers=body.max_speakers,
    )
    return _meeting_out(row)


async def update_meeting_details(
    meeting_id: str, body: MeetingCreateIn, _user: CurrentUser
) -> MeetingOut:
    await _require_meeting(meeting_id)
    updated = await db_meetings.update_details(
        meeting_id,
        title=body.title,
        scheduled_at=body.scheduled_at,
        venue=body.venue,
        president_id=body.president_id,
        saa_id=body.saa_id,
        max_speakers=body.max_speakers,
    )
    return _meeting_out(updated)


async def update_meeting_status(
    meeting_id: str, new_status: MeetingStatus, user: CurrentUser
) -> MeetingOut:
    row = await _require_meeting(meeting_id)
    current = MeetingStatus(row["status"])
    allowed = _VALID_STATUS_TRANSITIONS.get(current)
    if allowed != new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {current} to {new_status}",
        )

    is_reopen = current == MeetingStatus.completed and new_status == MeetingStatus.published
    if is_reopen and user.app_role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a super admin can reopen a completed meeting",
        )

    updated = await db_meetings.update_status(meeting_id, new_status, reopened=is_reopen)
    return _meeting_out(updated)


async def update_voting_status(
    meeting_id: str, voting_status: VotingStatus, _user: CurrentUser
) -> MeetingOut:
    await _require_meeting(meeting_id)
    updated = await db_meetings.update_voting_status(meeting_id, voting_status)
    return _meeting_out(updated)


async def delete_meeting(meeting_id: str, _user: CurrentUser) -> None:
    await _require_meeting(meeting_id)
    await db_meetings.delete(meeting_id)


# ── Role assignment (admin) ───────────────────────────────────────────────

async def admin_assign_role(
    meeting_id: str, body: AdminAssignRoleIn, user: CurrentUser
) -> MeetingRoleAssignmentOut:
    meeting = await _require_meeting(meeting_id)
    if meeting["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    if meeting["status"] == MeetingStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign roles to a completed meeting",
        )

    roster = await db_meetings.get_roster(meeting_id)

    # Singleton roles: only one per meeting
    if body.role in SINGLETON_ROLES:
        if any(r["role"] == body.role for r in roster):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Role '{body.role}' is already assigned in this meeting",
            )

    # Speaker: enforce max_speakers and require duration
    if body.role == MeetingRole.speaker:
        if not body.speech_duration or body.speech_duration not in SPEECH_DURATIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"speech_duration must be one of: {', '.join(sorted(SPEECH_DURATIONS))}",
            )
        count = await db_meetings.count_speakers(meeting_id)
        if count >= meeting["max_speakers"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Speaker slots are full"
            )

    # Evaluator: require target speaker, check uniqueness
    if body.role == MeetingRole.evaluator:
        if not body.evaluates_member_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="evaluates_member_id is required for evaluator role",
            )
        speaker_enrolled = any(
            r["member_id"] == body.evaluates_member_id and r["role"] == "speaker"
            for r in roster
        )
        if not speaker_enrolled:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target speaker is not enrolled in this meeting",
            )
        existing = await db_meetings.get_evaluator_for_speaker(meeting_id, body.evaluates_member_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This speaker already has an evaluator",
            )

    if body.role == MeetingRole.tmod and body.theme:
        await db_meetings.update_theme(meeting_id, body.theme.strip())

    # Supporting role: admin-defined roles (e.g. "Guest Lecture") require a title
    role_title = None
    if body.role == MeetingRole.supporting_role:
        if not body.role_title or not body.role_title.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="role_title is required for supporting_role",
            )
        role_title = body.role_title.strip()

    row = await db_meetings.insert_role(
        meeting_id=meeting_id,
        member_id=body.member_id,
        role=body.role,
        evaluates_member_id=body.evaluates_member_id,
        speech_duration=body.speech_duration,
        role_title=role_title,
    )
    # Re-fetch with member name/email
    roster_fresh = await db_meetings.get_roster(meeting_id)
    enriched = next((r for r in roster_fresh if r["id"] == row["id"]), row)
    return _role_out(enriched)


# ── Self-enrollment (member) ──────────────────────────────────────────────

async def enroll_role(
    meeting_id: str, role: MeetingRole, theme: str | None, user: CurrentUser
) -> MeetingRoleAssignmentOut:
    if user.is_guest:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guests cannot enroll")

    meeting = await _require_meeting(meeting_id)
    if meeting["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    if meeting["status"] != MeetingStatus.published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only enroll in published meetings",
        )
    if role not in SINGLETON_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Use /enroll/speaker or /enroll/evaluator for that role",
        )

    roster = await db_meetings.get_roster(meeting_id)
    if any(r["role"] == role for r in roster):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Role '{role}' is already taken",
        )

    member = await _require_member(user)
    existing = await db_meetings.get_member_roles_in_meeting(meeting_id, member["id"])
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already enrolled in a role for this meeting",
        )

    if role == MeetingRole.tmod:
        if not theme or not theme.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Theme is required when enrolling as TMOD",
            )
        await db_meetings.update_theme(meeting_id, theme.strip())

    row = await db_meetings.insert_role(meeting_id, member["id"], role)
    return _role_out({**row, "member_name": member["name"], "member_email": member["email"]})


async def enroll_speaker(
    meeting_id: str, speech_duration: str, user: CurrentUser
) -> MeetingRoleAssignmentOut:
    if user.is_guest:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guests cannot enroll")

    if speech_duration not in SPEECH_DURATIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"speech_duration must be one of: {', '.join(sorted(SPEECH_DURATIONS))}",
        )

    meeting = await _require_meeting(meeting_id)
    if meeting["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    if meeting["status"] != MeetingStatus.published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only enroll in published meetings",
        )

    count = await db_meetings.count_speakers(meeting_id)
    if count >= meeting["max_speakers"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Speaker slots are full"
        )

    member = await _require_member(user)
    existing = await db_meetings.get_member_roles_in_meeting(meeting_id, member["id"])
    if any(r["role"] == "speaker" for r in existing):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already enrolled as a speaker",
        )

    row = await db_meetings.insert_role(
        meeting_id, member["id"], MeetingRole.speaker, speech_duration=speech_duration
    )
    return _role_out({**row, "member_name": member["name"], "member_email": member["email"]})


async def enroll_evaluator(
    meeting_id: str, evaluates_member_id: str, user: CurrentUser
) -> MeetingRoleAssignmentOut:
    if user.is_guest:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guests cannot enroll")

    meeting = await _require_meeting(meeting_id)
    if meeting["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    if meeting["status"] != MeetingStatus.published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only enroll in published meetings",
        )

    member = await _require_member(user)
    existing = await db_meetings.get_member_roles_in_meeting(meeting_id, member["id"])
    if any(r["role"] == "evaluator" for r in existing):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already assigned as an evaluator",
        )

    roster = await db_meetings.get_roster(meeting_id)
    speaker_enrolled = any(
        r["member_id"] == evaluates_member_id and r["role"] == "speaker" for r in roster
    )
    if not speaker_enrolled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target speaker is not enrolled in this meeting",
        )

    existing_eval = await db_meetings.get_evaluator_for_speaker(meeting_id, evaluates_member_id)
    if existing_eval:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This speaker already has an evaluator",
        )

    row = await db_meetings.insert_role(
        meeting_id, member["id"], MeetingRole.evaluator,
        evaluates_member_id=evaluates_member_id,
    )
    return _role_out({**row, "member_name": member["name"], "member_email": member["email"]})


async def withdraw_from_role(
    meeting_id: str, role_id: str, user: CurrentUser
) -> None:
    roster = await db_meetings.get_roster(meeting_id)
    assignment = next((r for r in roster if r["id"] == role_id), None)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Role assignment not found"
        )

    if user.app_role in ("admin", "super_admin"):
        pass  # Admin can remove any assignment
    else:
        member = await _require_member(user)
        if assignment["member_id"] != member["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only withdraw from your own role",
            )

    await db_meetings.delete_role(role_id)


async def set_role_disqualified(
    meeting_id: str, role_id: str, disqualified: bool, user: CurrentUser
) -> MeetingRoleAssignmentOut:
    meeting_row = await _require_meeting(meeting_id)
    if meeting_row["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")

    roster = await db_meetings.get_roster(meeting_id)
    assignment = next((r for r in roster if r["id"] == role_id), None)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Role assignment not found"
        )

    row = await db_meetings.set_role_disqualified(role_id, disqualified)
    return _role_out({
        **row,
        "member_name": assignment["member_name"],
        "member_email": assignment["member_email"],
    })


# ── Legacy role assign (kept for backward compat) ─────────────────────────

async def assign_role(body: RoleAssignIn) -> MeetingRoleAssignmentOut:
    if body.role == "evaluator" and not body.evaluates_member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="evaluates_member_id is required for evaluator role",
        )
    row = await db_meetings.insert_role(
        meeting_id=body.meeting_id,
        member_id=body.member_id,
        role=body.role,
        evaluates_member_id=body.evaluates_member_id,
    )
    return MeetingRoleAssignmentOut(**row)


async def delete_role(role_id: str) -> None:
    await db_meetings.delete_role(role_id)


# ── QR check-in ───────────────────────────────────────────────────────────

async def checkin(qr_token: str, user: CurrentUser) -> CheckinOut:
    # The printed/scanned QR encodes the meeting's id (same convention the
    # guest check-in flow already uses) — the frontend extracts it from the
    # `toastmasters://join?meeting_id=...` deep link before calling this.
    # Validate the format ourselves too: a camera can scan any QR code in
    # the world, and an unrelated one would otherwise reach the database as
    # a malformed uuid and crash with an unhandled 500.
    try:
        uuid.UUID(qr_token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid QR code")

    meeting_row = await db_meetings.get_by_id(qr_token)
    if not meeting_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid QR code")
    meeting_row = await auto_complete_if_due(meeting_row)
    if meeting_row["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    if meeting_row["status"] != MeetingStatus.published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-in is only available for published meetings",
        )

    member = await _require_member(user)
    existing = await db_meetings.get_attendance(meeting_row["id"], member["id"])
    if not existing:
        await db_meetings.checkin_member(meeting_row["id"], member["id"])

    return CheckinOut(
        meeting=_meeting_out(meeting_row),
        already_checked_in=existing is not None,
    )


async def get_all_attendance(meeting_id: str, user: CurrentUser) -> list[AttendanceOut]:
    meeting_row = await _require_meeting(meeting_id)
    if meeting_row["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    rows = await db_meetings.get_all_attendance(meeting_id)
    return [AttendanceOut(**r) for r in rows]


# ── Speaker feedback ──────────────────────────────────────────────────────

async def get_my_feedback(meeting_id: str, user: CurrentUser) -> list[SpeakerFeedbackOut]:
    member = await _require_member(user)
    rows = await db_meetings.get_my_feedback(meeting_id, member["id"])
    return [SpeakerFeedbackOut(**r) for r in rows]


async def submit_feedback(
    meeting_id: str, body: MeetingFeedbackIn, user: CurrentUser
) -> list[SpeakerFeedbackOut]:
    meeting_row = await _require_meeting(meeting_id)
    if meeting_row["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")

    member = await _require_member(user)
    attendance = await db_meetings.get_attendance(meeting_id, member["id"])
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must check in to the meeting before submitting feedback",
        )

    roster = await db_meetings.get_roster(meeting_id)
    results = []
    for fb in body.feedbacks:
        target = next(
            (r for r in roster if r["member_id"] == fb.speaker_member_id and r["role"] == "speaker"),
            None,
        )
        if not target or target.get("disqualified"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Speaker is not eligible for feedback",
            )
        row = await db_meetings.upsert_feedback(
            meeting_id=meeting_id,
            from_member_id=member["id"],
            speaker_member_id=fb.speaker_member_id,
            content_rating=fb.content_rating,
            structure_rating=fb.structure_rating,
            confidence_rating=fb.confidence_rating,
            interaction_rating=fb.interaction_rating,
            comment=fb.comment,
        )
        results.append(SpeakerFeedbackOut(**row))
    return results


async def publish_speaker_feedback(meeting_id: str, speaker_member_id: str, user: CurrentUser) -> None:
    meeting_row = await _require_meeting(meeting_id)
    if meeting_row["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    await db_meetings.publish_speaker_feedback(meeting_id, speaker_member_id)


async def get_speakers_feedback_status(meeting_id: str, user: CurrentUser) -> list[SpeakerFeedbackStatusOut]:
    meeting_row = await _require_meeting(meeting_id)
    if meeting_row["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    rows = await db_meetings.get_speakers_feedback_status(meeting_id)
    return [SpeakerFeedbackStatusOut(**r) for r in rows]


async def get_received_feedback(meeting_id: str, user: CurrentUser) -> list[ReceivedFeedbackOut]:
    member = await _require_member(user)
    rows = await db_meetings.get_received_feedback(meeting_id, member["id"])
    return [ReceivedFeedbackOut(**r) for r in rows]


async def get_speaking_history(user: CurrentUser) -> list[SpeakingHistoryItemOut]:
    member = await _require_member(user)
    rows = await db_meetings.get_speaking_history(member["id"])
    return [SpeakingHistoryItemOut(**r) for r in rows]
