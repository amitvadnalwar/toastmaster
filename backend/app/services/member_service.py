import re

from fastapi import HTTPException, status

from app.middleware.auth import CurrentUser
from app.models.member import MemberOut

_BIRTHDAY_RE = re.compile(r"^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")


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
