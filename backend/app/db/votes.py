from app.db.client import supabase


async def insert_vote(
    meeting_id: str,
    voter_id: str,
    category: str,
    nominee_id: str,
) -> None:
    # Unique constraint (meeting_id, voter_id, category) raises on duplicate.
    # TODO: implement
    raise NotImplementedError


async def insert_rating(meeting_id: str, voter_id: str, rating: int) -> None:
    # Unique constraint (meeting_id, voter_id) raises on duplicate.
    # TODO: implement
    raise NotImplementedError


async def get_summary(meeting_id: str) -> list[dict]:
    # Returns aggregated counts per category per nominee_id, joined with member name.
    # TODO: implement
    raise NotImplementedError
