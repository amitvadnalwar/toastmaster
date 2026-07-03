from app.db.client import supabase


async def get_meeting_club_id(meeting_id: str) -> str | None:
    result = (
        supabase.table("meetings")
        .select("club_id")
        .eq("id", meeting_id)
        .limit(1)
        .execute()
    )
    return result.data[0]["club_id"] if result.data else None


async def find_guest_by_meeting_name_phone(
    meeting_id: str, name: str, phone: str | None
) -> dict | None:
    query = (
        supabase.table("guests")
        .select("id, name")
        .eq("meeting_id", meeting_id)
        .filter("name", "ilike", name.strip())
    )
    if phone:
        query = query.eq("phone", phone.strip())
    else:
        query = query.is_("phone", "null")
    result = query.limit(1).execute()
    return result.data[0] if result.data else None


async def insert_guest(
    club_id: str,
    meeting_id: str,
    name: str,
    phone: str | None,
    source: str,
) -> dict:
    result = (
        supabase.table("guests")
        .insert(
            {
                "club_id": club_id,
                "meeting_id": meeting_id,
                "name": name,
                "phone": phone,
                "source": source,
            }
        )
        .execute()
    )
    return result.data[0]


async def get_speakers_for_meeting(meeting_id: str) -> list[dict]:
    # Alias + explicit FK hint needed: meeting_roles has two FKs to members
    # (member_id and evaluates_member_id), making the plain join ambiguous.
    result = (
        supabase.table("meeting_roles")
        .select("member_id, member:members!member_id(name)")
        .eq("meeting_id", meeting_id)
        .eq("role", "speaker")
        .execute()
    )
    return [
        {"member_id": row["member_id"], "name": row["member"]["name"]}
        for row in result.data
        if row.get("member")
    ]


async def get_nominees_for_meeting(meeting_id: str) -> list[dict]:
    result = (
        supabase.table("meeting_roles")
        .select("member_id, role, member:members!member_id(name)")
        .eq("meeting_id", meeting_id)
        .in_(
            "role",
            [
                "speaker",
                "evaluator",
                "table_topics_speaker",
                "tmod",
                "general_evaluator",
                "supporting_role",
            ],
        )
        .execute()
    )
    return result.data


async def upsert_speaker_feedback(
    guest_id: str, meeting_id: str, feedbacks: list[dict]
) -> None:
    rows = [{"guest_id": guest_id, "meeting_id": meeting_id, **fb} for fb in feedbacks]
    supabase.table("guest_speaker_feedback").upsert(
        rows, on_conflict="meeting_id,guest_id,speaker_member_id"
    ).execute()


async def upsert_meeting_feedback(
    guest_id: str, meeting_id: str, data: dict
) -> None:
    supabase.table("guest_meeting_feedback").upsert(
        {"guest_id": guest_id, "meeting_id": meeting_id, **data},
        on_conflict="meeting_id,guest_id",
    ).execute()


async def upsert_guest_votes(
    guest_id: str, meeting_id: str, votes: list[dict]
) -> None:
    rows = [{"guest_id": guest_id, "meeting_id": meeting_id, **v} for v in votes]
    supabase.table("guest_votes").upsert(
        rows, on_conflict="meeting_id,guest_id,category"
    ).execute()
