from fastapi import BackgroundTasks

from app.db.client import supabase
from app.utils.password import generate_temp_password
from app.utils.email import send_temp_password_email


def _is_confirmed(auth_user) -> bool:
    """True when the user has set their permanent password (must_change_password cleared)."""
    meta = getattr(auth_user, "app_metadata", None) or {}
    return not meta.get("must_change_password", False)


async def insert_member(
    club_id: str,
    name: str,
    email: str,
    phone: str,
    birthday: str | None,
    background_tasks: BackgroundTasks,
) -> dict:
    temp_password = generate_temp_password()

    # Create auth user with email already confirmed so they can log in immediately
    create_res = supabase.auth.admin.create_user({
        "email": email,
        "password": temp_password,
        "email_confirm": True,
        "app_metadata": {"must_change_password": True},
    })
    auth_user_id = create_res.user.id

    payload: dict = {
        "club_id": club_id,
        "auth_user_id": auth_user_id,
        "name": name,
        "email": email,
        "phone": phone,
        "is_guest": False,
        "app_role": "member",
        "club_role": "member",
    }
    if birthday:
        payload["birthday"] = birthday
        payload["birthday_collected"] = True

    result = supabase.table("members").insert(payload).execute()

    # Member creation must succeed regardless of email deliverability — send
    # after the response goes out instead of blocking the request on it.
    background_tasks.add_task(send_temp_password_email, email, name, temp_password)

    return result.data[0]


async def get_member_by_id(member_id: str) -> dict | None:
    result = (
        supabase.table("members")
        .select("*")
        .eq("id", member_id)
        .limit(1)
        .execute()
    )
    member = result.data[0] if result.data else None
    if not member:
        return None

    auth_user_id = member.get("auth_user_id")
    if auth_user_id:
        try:
            auth_user = supabase.auth.admin.get_user_by_id(auth_user_id)
            member["is_confirmed"] = _is_confirmed(auth_user.user)
        except Exception:
            member["is_confirmed"] = False
    else:
        member["is_confirmed"] = False
    return member


async def resend_invite(member_id: str, background_tasks: BackgroundTasks) -> None:
    # Look up email + auth_user_id from DB
    result = (
        supabase.table("members")
        .select("email, name, auth_user_id")
        .eq("id", member_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        return

    member = result.data[0]
    auth_user_id = member.get("auth_user_id")
    email = member["email"]
    name = member.get("name", "")

    # Generate a fresh temp password and reset it in Supabase Auth
    new_temp = generate_temp_password()
    if auth_user_id:
        supabase.auth.admin.update_user_by_id(
            auth_user_id,
            {"password": new_temp, "app_metadata": {"must_change_password": True}},
        )

    background_tasks.add_task(send_temp_password_email, email, name, new_temp)


async def fetch_all_non_guest_members(club_id: str) -> list[dict]:
    result = (
        supabase.table("members")
        .select("*")
        .eq("club_id", club_id)
        .eq("is_guest", False)
        .execute()
    )
    members = result.data
    if not members:
        return members

    auth_users = supabase.auth.admin.list_users()
    confirmed_map = {
        u.id: _is_confirmed(u) for u in auth_users
    }
    for m in members:
        uid = m.get("auth_user_id")
        m["is_confirmed"] = confirmed_map.get(uid, False) if uid else False
    return members


async def set_active(member_id: str, is_active: bool) -> dict | None:
    member_res = (
        supabase.table("members")
        .select("auth_user_id")
        .eq("id", member_id)
        .limit(1)
        .execute()
    )
    if not member_res.data:
        return None

    result = (
        supabase.table("members")
        .update({"is_active": is_active})
        .eq("id", member_id)
        .execute()
    )

    auth_user_id = member_res.data.get("auth_user_id")
    if auth_user_id:
        ban_duration = "none" if is_active else "876600h"
        supabase.auth.admin.update_user_by_id(
            auth_user_id,
            {"ban_duration": ban_duration},
        )

    return result.data[0] if result.data else None


async def update_member_club_role(member_id: str, club_role: str) -> dict | None:
    result = (
        supabase.table("members")
        .update({"club_role": club_role})
        .eq("id", member_id)
        .execute()
    )
    return result.data[0] if result.data else None


async def update_member_app_role(member_id: str, app_role: str) -> dict | None:
    result = (
        supabase.table("members")
        .update({"app_role": app_role})
        .eq("id", member_id)
        .execute()
    )
    return result.data[0] if result.data else None


async def count_super_admins(club_id: str) -> int:
    result = (
        supabase.table("members")
        .select("id", count="exact")
        .eq("club_id", club_id)
        .eq("app_role", "super_admin")
        .execute()
    )
    return result.count or 0


async def clear_must_change_password(auth_user_id: str) -> None:
    supabase.auth.admin.update_user_by_id(
        auth_user_id,
        {"app_metadata": {"must_change_password": False}},
    )
