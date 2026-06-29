from app.db.client import supabase


async def get_active(club_id: str) -> dict | None:
    # Returns the single row where is_active = true for the club.
    # TODO: implement
    raise NotImplementedError


async def deactivate_all(club_id: str) -> None:
    # Sets is_active = false for all posts in the club.
    # Called before inserting a new active post.
    # TODO: implement
    raise NotImplementedError


async def insert(
    club_id: str,
    platform: str,
    url: str,
    thumbnail_url: str | None,
) -> dict:
    # TODO: implement
    raise NotImplementedError
