from app.db.client import supabase


async def get_all_for_club(club_id: str) -> list[dict]:
    result = (
        supabase.table("meetings")
        .select("*")
        .eq("club_id", club_id)
        .order("scheduled_at", desc=True)
        .execute()
    )
    return result.data


async def get_current_for_club(club_id: str) -> dict | None:
    """Next upcoming published meeting (scheduled_at >= now, soonest first)."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    result = (
        supabase.table("meetings")
        .select("*")
        .eq("club_id", club_id)
        .eq("status", "published")
        .gte("scheduled_at", now)
        .order("scheduled_at", desc=False)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def get_by_id(meeting_id: str) -> dict | None:
    result = (
        supabase.table("meetings")
        .select("*")
        .eq("id", meeting_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def insert(
    club_id: str,
    title: str,
    scheduled_at: str,
    created_by: str,
    venue: str | None = None,
    president_id: str | None = None,
    saa_id: str | None = None,
    max_speakers: int = 3,
) -> dict:
    result = (
        supabase.table("meetings")
        .insert({
            "club_id": club_id,
            "title": title,
            "scheduled_at": scheduled_at,
            "created_by": created_by,
            "status": "draft",
            "voting_status": "not_started",
            "venue": venue,
            "president_id": president_id,
            "saa_id": saa_id,
            "max_speakers": max_speakers,
        })
        .execute()
    )
    return result.data[0]


async def update_details(
    meeting_id: str,
    title: str,
    scheduled_at: str,
    venue: str | None = None,
    president_id: str | None = None,
    saa_id: str | None = None,
    max_speakers: int | None = None,
) -> dict:
    payload: dict = {"title": title, "scheduled_at": scheduled_at, "venue": venue}
    if president_id is not None:
        payload["president_id"] = president_id
    if saa_id is not None:
        payload["saa_id"] = saa_id
    if max_speakers is not None:
        payload["max_speakers"] = max_speakers
    result = (
        supabase.table("meetings")
        .update(payload)
        .eq("id", meeting_id)
        .execute()
    )
    return result.data[0]


async def update_theme(meeting_id: str, theme: str) -> dict:
    result = (
        supabase.table("meetings")
        .update({"theme": theme})
        .eq("id", meeting_id)
        .execute()
    )
    return result.data[0]


async def update_status(meeting_id: str, status: str, reopened: bool = False) -> dict:
    result = (
        supabase.table("meetings")
        .update({"status": status, "reopened": reopened})
        .eq("id", meeting_id)
        .execute()
    )
    return result.data[0]


async def update_voting_status(meeting_id: str, voting_status: str) -> dict:
    result = (
        supabase.table("meetings")
        .update({"voting_status": voting_status})
        .eq("id", meeting_id)
        .execute()
    )
    return result.data[0]


def _flatten_roster_row(r: dict) -> dict:
    # PostgREST returns the joined table under "members" key regardless of the FK hint used in the query
    member = r.pop("members", None) or r.pop("members!meeting_roles_member_id_fkey", None) or {}
    return {
        **r,
        "member_name": member.get("name"),
        "member_initials": member.get("initials"),
        "member_email": member.get("email"),
    }


async def get_roster(meeting_id: str) -> list[dict]:
    result = (
        supabase.table("meeting_roles")
        .select("*, members!meeting_roles_member_id_fkey(name, email, initials)")
        .eq("meeting_id", meeting_id)
        .execute()
    )
    return [_flatten_roster_row(r) for r in result.data]


async def count_speakers(meeting_id: str) -> int:
    result = (
        supabase.table("meeting_roles")
        .select("id", count="exact")
        .eq("meeting_id", meeting_id)
        .eq("role", "speaker")
        .execute()
    )
    return result.count or 0


async def get_member_roles_in_meeting(meeting_id: str, member_id: str) -> list[dict]:
    """All role assignments this member has in this meeting."""
    result = (
        supabase.table("meeting_roles")
        .select("*")
        .eq("meeting_id", meeting_id)
        .eq("member_id", member_id)
        .execute()
    )
    return result.data


async def get_evaluator_for_speaker(meeting_id: str, speaker_member_id: str) -> dict | None:
    """Return the evaluator row for a speaker in this meeting, or None."""
    result = (
        supabase.table("meeting_roles")
        .select("*")
        .eq("meeting_id", meeting_id)
        .eq("role", "evaluator")
        .eq("evaluates_member_id", speaker_member_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def insert_role(
    meeting_id: str,
    member_id: str,
    role: str,
    evaluates_member_id: str | None = None,
    speech_duration: str | None = None,
    role_title: str | None = None,
) -> dict:
    result = (
        supabase.table("meeting_roles")
        .insert({
            "meeting_id": meeting_id,
            "member_id": member_id,
            "role": role,
            "evaluates_member_id": evaluates_member_id,
            "speech_duration": speech_duration,
            "role_title": role_title,
        })
        .execute()
    )
    return result.data[0]


async def delete(meeting_id: str) -> None:
    supabase.table("meetings").delete().eq("id", meeting_id).execute()


async def delete_role(role_id: str) -> None:
    supabase.table("meeting_roles").delete().eq("id", role_id).execute()


async def set_role_disqualified(role_id: str, disqualified: bool) -> dict:
    result = (
        supabase.table("meeting_roles")
        .update({"disqualified": disqualified})
        .eq("id", role_id)
        .execute()
    )
    return result.data[0]


# ── QR check-in ───────────────────────────────────────────────────────────

async def get_attendance(meeting_id: str, member_id: str) -> dict | None:
    result = (
        supabase.table("meeting_attendance")
        .select("*")
        .eq("meeting_id", meeting_id)
        .eq("member_id", member_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def get_all_attendance(meeting_id: str) -> list[dict]:
    result = (
        supabase.table("meeting_attendance")
        .select("*, members(name, initials)")
        .eq("meeting_id", meeting_id)
        .order("checked_in_at")
        .execute()
    )
    rows = []
    for r in result.data:
        member = r.pop("members", None) or {}
        rows.append({**r, "member_name": member.get("name"), "member_initials": member.get("initials")})
    return rows


async def checkin_member(meeting_id: str, member_id: str) -> dict:
    result = (
        supabase.table("meeting_attendance")
        .upsert(
            {"meeting_id": meeting_id, "member_id": member_id},
            on_conflict="meeting_id,member_id",
        )
        .execute()
    )
    return result.data[0]


# ── Speaker feedback ──────────────────────────────────────────────────────

async def get_my_feedback(meeting_id: str, from_member_id: str) -> list[dict]:
    result = (
        supabase.table("speaker_feedback")
        .select("*, members!speaker_feedback_speaker_member_id_fkey(name, initials)")
        .eq("meeting_id", meeting_id)
        .eq("from_member_id", from_member_id)
        .execute()
    )
    rows = []
    for r in result.data:
        member = r.pop("members", None) or {}
        rows.append({**r, "speaker_name": member.get("name"), "speaker_initials": member.get("initials")})
    return rows


async def publish_speaker_feedback(meeting_id: str, speaker_member_id: str) -> None:
    (
        supabase.table("speaker_feedback")
        .update({"published": True})
        .eq("meeting_id", meeting_id)
        .eq("speaker_member_id", speaker_member_id)
        .execute()
    )


async def get_speakers_feedback_status(meeting_id: str) -> list[dict]:
    result = (
        supabase.table("speaker_feedback")
        .select("speaker_member_id, published")
        .eq("meeting_id", meeting_id)
        .execute()
    )
    status: dict[str, dict] = {}
    for row in result.data:
        s = status.setdefault(row["speaker_member_id"], {"has_feedback": False, "published": False})
        s["has_feedback"] = True
        if row["published"]:
            s["published"] = True
    return [{"speaker_member_id": k, **v} for k, v in status.items()]


async def get_feedback_submitter_ids(meeting_id: str) -> list[str]:
    result = (
        supabase.table("speaker_feedback")
        .select("from_member_id")
        .eq("meeting_id", meeting_id)
        .execute()
    )
    return list({row["from_member_id"] for row in result.data})


async def get_received_feedback(meeting_id: str, speaker_member_id: str) -> list[dict]:
    # Deliberately excludes from_member_id — feedback is shown to the
    # speaker anonymously, so the reviewer's identity is never selected.
    result = (
        supabase.table("speaker_feedback")
        .select("id, meeting_id, content_rating, structure_rating, confidence_rating, interaction_rating, comment, created_at")
        .eq("meeting_id", meeting_id)
        .eq("speaker_member_id", speaker_member_id)
        .eq("published", True)
        .execute()
    )
    return result.data


async def get_speaking_history(member_id: str) -> list[dict]:
    assignments = (
        supabase.table("meeting_roles")
        .select("meeting_id, meetings(title, scheduled_at)")
        .eq("member_id", member_id)
        .eq("role", "speaker")
        .execute()
    )
    feedback = (
        supabase.table("speaker_feedback")
        .select("meeting_id")
        .eq("speaker_member_id", member_id)
        .eq("published", True)
        .execute()
    )
    counts: dict[str, int] = {}
    for f in feedback.data:
        counts[f["meeting_id"]] = counts.get(f["meeting_id"], 0) + 1

    rows = []
    for a in assignments.data:
        meeting = a.get("meetings") or {}
        rows.append({
            "meeting_id": a["meeting_id"],
            "title": meeting.get("title", "—"),
            "scheduled_at": meeting.get("scheduled_at", ""),
            "feedback_count": counts.get(a["meeting_id"], 0),
        })
    return rows


async def upsert_feedback(
    meeting_id: str,
    from_member_id: str,
    speaker_member_id: str,
    content_rating: int,
    structure_rating: int,
    confidence_rating: int,
    interaction_rating: int,
    comment: str | None,
) -> dict:
    result = (
        supabase.table("speaker_feedback")
        .upsert(
            {
                "meeting_id": meeting_id,
                "from_member_id": from_member_id,
                "speaker_member_id": speaker_member_id,
                "content_rating": content_rating,
                "structure_rating": structure_rating,
                "confidence_rating": confidence_rating,
                "interaction_rating": interaction_rating,
                "comment": comment,
            },
            on_conflict="meeting_id,from_member_id,speaker_member_id",
        )
        .execute()
    )
    return result.data[0]
