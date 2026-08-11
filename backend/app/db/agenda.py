from app.db.client import supabase


async def get_items(meeting_id: str) -> list[dict]:
    result = (
        supabase.table("meeting_agenda_items")
        .select("*")
        .eq("meeting_id", meeting_id)
        .order("position")
        .execute()
    )
    return result.data


async def replace_items(meeting_id: str, items: list[dict]) -> list[dict]:
    """Full replace: delete all existing rows for this meeting, then bulk-insert
    the new ordered list. Simpler and safer than diffing for reorder/add/delete
    all at once, and matches how the editor saves the whole agenda in one go."""
    supabase.table("meeting_agenda_items").delete().eq("meeting_id", meeting_id).execute()
    if not items:
        return []
    rows = [{**item, "meeting_id": meeting_id, "position": i} for i, item in enumerate(items)]
    result = supabase.table("meeting_agenda_items").insert(rows).execute()
    return sorted(result.data, key=lambda r: r["position"])


async def update_word_idiom_of_day(meeting_id: str, fields: dict) -> dict:
    result = (
        supabase.table("meetings")
        .update(fields)
        .eq("id", meeting_id)
        .execute()
    )
    return result.data[0]


async def find_previous_meeting_with_agenda(
    club_id: str, before_scheduled_at: str, exclude_meeting_id: str
) -> str | None:
    """Most recent meeting older than before_scheduled_at in this club that
    already has at least one agenda item, for the "clone previous" action."""
    meetings_result = (
        supabase.table("meetings")
        .select("id")
        .eq("club_id", club_id)
        .lt("scheduled_at", before_scheduled_at)
        .neq("id", exclude_meeting_id)
        .order("scheduled_at", desc=True)
        .limit(20)
        .execute()
    )
    for m in meetings_result.data:
        items = (
            supabase.table("meeting_agenda_items")
            .select("id", count="exact")
            .eq("meeting_id", m["id"])
            .limit(1)
            .execute()
        )
        if items.count:
            return m["id"]
    return None
