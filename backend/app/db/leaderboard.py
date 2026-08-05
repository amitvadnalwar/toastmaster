from app.db.client import supabase


async def get_meetings_in_range(club_id: str, start_iso: str, end_iso: str) -> list[dict]:
    result = (
        supabase.table("meetings")
        .select("id, scheduled_at")
        .eq("club_id", club_id)
        .gte("scheduled_at", start_iso)
        .lt("scheduled_at", end_iso)
        .execute()
    )
    return result.data


def _flatten_member_name(row: dict) -> dict:
    member = row.pop("members", None) or {}
    return {**row, "member_name": member.get("name")}


async def get_roles_for_meetings(meeting_ids: list[str]) -> list[dict]:
    if not meeting_ids:
        return []
    result = (
        supabase.table("meeting_roles")
        .select("meeting_id, member_id, role, members!meeting_roles_member_id_fkey(name)")
        .in_("meeting_id", meeting_ids)
        .eq("disqualified", False)
        .execute()
    )
    return [_flatten_member_name(r) for r in result.data]


async def get_attendance_for_meetings(meeting_ids: list[str]) -> list[dict]:
    if not meeting_ids:
        return []
    result = (
        supabase.table("meeting_attendance")
        .select("meeting_id, member_id, members!meeting_attendance_member_id_fkey(name)")
        .in_("meeting_id", meeting_ids)
        .execute()
    )
    return [_flatten_member_name(r) for r in result.data]


async def get_votes_for_meetings(meeting_ids: list[str]) -> list[dict]:
    if not meeting_ids:
        return []
    result = (
        supabase.table("votes")
        .select("meeting_id, category, nominee_id, members!votes_nominee_id_fkey(name)")
        .in_("meeting_id", meeting_ids)
        .execute()
    )
    return [_flatten_member_name(r) for r in result.data]
