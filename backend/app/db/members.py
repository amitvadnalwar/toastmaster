from app.db.client import supabase


async def get_by_auth_user_id(auth_user_id: str) -> dict | None:
    result = (
        supabase.table("members")
        .select("*")
        .eq("auth_user_id", auth_user_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def get_by_identity(identity: str, club_id: str) -> dict | None:
    result = (
        supabase.table("members")
        .select("*")
        .eq("club_id", club_id)
        .or_(f"email.eq.{identity},phone.eq.{identity}")
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def insert_guest(
    club_id: str,
    name: str,
    email: str,
    phone: str | None,
    source: str,
) -> dict:
    result = (
        supabase.table("members")
        .insert(
            {
                "club_id": club_id,
                "name": name,
                "email": email,
                "phone": phone,
                "source": source,
                "is_guest": True,
            }
        )
        .execute()
    )
    return result.data[0]


async def get_club_members(club_id: str) -> list[dict]:
    result = (
        supabase.table("members")
        .select("id, name, club_role, app_role, is_active, is_guest")
        .eq("club_id", club_id)
        .eq("is_guest", False)
        .order("name")
        .execute()
    )
    return result.data


async def get_stats_by_auth_user_id(auth_user_id: str) -> dict:
    member = await get_by_auth_user_id(auth_user_id)
    if not member:
        return {"speeches": 0, "feedbacks": 0}
    member_id = member["id"]
    speeches = (
        supabase.table("meeting_roles")
        .select("id", count="exact")
        .eq("member_id", member_id)
        .eq("role", "speaker")
        .execute()
    )
    feedbacks = (
        supabase.table("meeting_roles")
        .select("id", count="exact")
        .eq("member_id", member_id)
        .eq("role", "evaluator")
        .execute()
    )
    return {"speeches": speeches.count or 0, "feedbacks": feedbacks.count or 0}


async def update_birthday(member_id: str, birthday: str) -> dict:
    result = (
        supabase.table("members")
        .update({"birthday": birthday, "birthday_collected": True})
        .eq("id", member_id)
        .execute()
    )
    return result.data[0]