from app.db.client import supabase


async def insert_vote(
    meeting_id: str,
    voter_id: str,
    category: str,
    nominee_id: str,
) -> None:
    # Unique constraint (meeting_id, voter_id, category) raises on duplicate.
    supabase.table("votes").insert(
        {
            "meeting_id": meeting_id,
            "voter_id": voter_id,
            "category": category,
            "nominee_id": nominee_id,
        }
    ).execute()


async def get_my_votes(meeting_id: str, voter_id: str) -> list[dict]:
    result = (
        supabase.table("votes")
        .select("category, nominee_id")
        .eq("meeting_id", meeting_id)
        .eq("voter_id", voter_id)
        .execute()
    )
    return result.data


async def insert_rating(
    meeting_id: str,
    voter_id: str,
    rating: int,
    comment: str | None,
) -> None:
    # Unique constraint (meeting_id, voter_id) raises on duplicate.
    supabase.table("meeting_ratings").insert(
        {
            "meeting_id": meeting_id,
            "voter_id": voter_id,
            "rating": rating,
            "comment": comment,
        }
    ).execute()


async def get_my_rating(meeting_id: str, voter_id: str) -> dict | None:
    result = (
        supabase.table("meeting_ratings")
        .select("*")
        .eq("meeting_id", meeting_id)
        .eq("voter_id", voter_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def get_summary(meeting_id: str) -> list[dict]:
    # Returns aggregated counts per category per nominee_id, joined with member name.
    # TODO: implement
    raise NotImplementedError
