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
