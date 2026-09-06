import re
import time

from fastapi import BackgroundTasks, HTTPException, status

from app.db.client import supabase
from app.middleware.auth import CurrentUser
from app.models.member import MemberCreateIn, MemberOut, SimpleLoginIn, SimpleLoginOut

_BIRTHDAY_RE = re.compile(r"^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")

# In-memory throttle on simple-login attempts per email — there's no password
# left to guess, but without this, the endpoint would let anyone script
# through a list of emails to discover which ones belong to real members.
# A single Render instance is fine for this; resets on restart/deploy, which
# is an acceptable tradeoff for a login-attempt limiter, not a security
# control that needs to survive that.
_LOGIN_ATTEMPTS: dict[str, list[float]] = {}
_MAX_ATTEMPTS = 5
_WINDOW_SECONDS = 600


def _check_rate_limit(email: str) -> None:
    now = time.monotonic()
    attempts = [t for t in _LOGIN_ATTEMPTS.get(email, []) if now - t < _WINDOW_SECONDS]
    if len(attempts) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please wait a few minutes and try again.",
        )
    attempts.append(now)
    _LOGIN_ATTEMPTS[email] = attempts


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


async def simple_login(body: SimpleLoginIn) -> SimpleLoginOut:
    """Passwordless sign-in: email is the only thing that gates entry — name
    and phone are recorded/kept fresh but not required to match. Deliberately
    excludes super_admin accounts, which keep signing in with a password."""
    from app.db import members as db

    email = body.email.strip().lower()
    _check_rate_limit(email)

    member = await db.get_by_email(email)
    if not member or member.get("is_guest") or not member.get("auth_user_id"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email. Please register first.",
        )
    if not member.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated.")
    if member.get("app_role") == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin accounts sign in with a password.",
        )

    await db.update_contact_info(member["id"], body.name.strip(), body.phone.strip())

    link = supabase.auth.admin.generate_link({"type": "magiclink", "email": email})
    return SimpleLoginOut(email=email, hashed_token=link.properties.hashed_token)


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
