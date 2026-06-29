import re

from fastapi import HTTPException, status

from app.db import admin_members as db
from app.models.member import AppRole, ClubRole, MemberCreateIn, MemberOut

_BIRTHDAY_RE = re.compile(r"^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")


async def create_member(club_id: str, body: MemberCreateIn) -> MemberOut:
    if body.birthday and not _BIRTHDAY_RE.match(body.birthday):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="birthday must be MM-DD format",
        )
    try:
        row = await db.insert_member(
            club_id=club_id,
            name=body.name.strip(),
            email=body.email,
            phone=body.phone.strip(),
            birthday=body.birthday,
        )
    except Exception as exc:
        msg = str(exc)
        if "already registered" in msg or "already been registered" in msg or "duplicate" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use") from exc
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=msg) from exc
    return MemberOut(**row)


async def get_all_members(club_id: str) -> list[MemberOut]:
    rows = await db.fetch_all_non_guest_members(club_id)
    return [MemberOut(**row) for row in rows]


async def get_member_by_id(member_id: str) -> MemberOut:
    row = await db.get_member_by_id(member_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return MemberOut(**row)


async def resend_invite(member_id: str) -> None:
    row = await db.get_member_by_id(member_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    if row.get("is_confirmed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member has already activated their account",
        )
    await db.resend_invite(row["email"])


async def set_member_active(member_id: str, is_active: bool) -> MemberOut:
    row = await db.set_active(member_id, is_active)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return MemberOut(**row)


async def update_club_role(
    _actor_id: str, target_member_id: str, _club_id: str, club_role: ClubRole
) -> MemberOut:
    # Guests always keep club_role = 'guest'; service layer blocks explicit assignment.
    if club_role == ClubRole.guest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign 'guest' as a club role via this endpoint",
        )

    row = await db.update_member_club_role(target_member_id, club_role.value)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return MemberOut(**row)


async def update_app_role(
    actor_id: str, target_member_id: str, club_id: str, app_role: AppRole
) -> MemberOut:
    # Prevent super admin from demoting themselves (self-lockout guard).
    if actor_id == target_member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own app role",
        )

    # Ensure at least one super_admin remains in the club after the change.
    if app_role != AppRole.super_admin:
        count = await db.count_super_admins(club_id)
        if count <= 1:
            # Check if the target is currently a super_admin before blocking.
            # (Downgrading a non-super-admin is always fine.)
            members = await db.fetch_all_non_guest_members(club_id)
            target = next((m for m in members if m["id"] == target_member_id), None)
            if target and target.get("app_role") == "super_admin":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot remove the last super admin",
                )

    row = await db.update_member_app_role(target_member_id, app_role.value)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return MemberOut(**row)
