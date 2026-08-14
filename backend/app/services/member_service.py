import re

from fastapi import BackgroundTasks, HTTPException, status

from app.middleware.auth import CurrentUser
from app.models.member import MemberCreateIn, MemberOut

_BIRTHDAY_RE = re.compile(r"^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")


async def register(body: MemberCreateIn, background_tasks: BackgroundTasks) -> MemberOut:
    """Public self-registration from the login screen. Reuses the same
    create-member logic admins use, scoped to the club's own club_id since
    Phase 1 only supports one club."""
    from app.db import admin_members as admin_db
    from app.services import admin_member_service

    club_id = await admin_db.get_default_club_id()
    if not club_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Club not configured")
    return await admin_member_service.create_member(club_id, body, background_tasks)


async def get_me(user: CurrentUser) -> MemberOut:
    from app.db import members as db
    row = await db.get_by_auth_user_id(user.id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member record not found")
    return MemberOut(**row)


async def get_club_members(user: CurrentUser) -> list:
    from app.db import members as db
    rows = await db.get_club_members(user.club_id)
    return rows


async def get_my_stats(user: CurrentUser) -> dict:
    from app.db import members as db
    return await db.get_stats_by_auth_user_id(user.id)


async def confirm_password_changed(user: CurrentUser) -> None:
    from app.db import admin_members as admin_db
    await admin_db.clear_must_change_password(user.id)


async def update_birthday(birthday: str, _user: CurrentUser) -> MemberOut:
    if not _BIRTHDAY_RE.match(birthday):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Birthday must be in MM-DD format",
        )
    # Atomic UPDATE: set birthday = birthday, birthday_collected = true WHERE id = member.id
    # TODO: implement
    raise NotImplementedError
