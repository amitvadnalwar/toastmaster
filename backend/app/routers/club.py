from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db.admin_members import get_members_by_club_role
from app.db.client import supabase
from app.middleware.auth import CurrentUser, get_current_user, require_admin
from app.models.common import ApiResponse
from app.models.member import ClubRole

router = APIRouter()

# Officer seats shown on the agenda's executive-committee sidebar, in display order.
OFFICER_ROLES: list[ClubRole] = [
    ClubRole.president,
    ClubRole.vp_education,
    ClubRole.vp_membership,
    ClubRole.vp_pr,
    ClubRole.secretary,
    ClubRole.treasurer,
    ClubRole.saa,
]


class ClubUpdateIn(BaseModel):
    instagram_url: str | None = None
    linkedin_url: str | None = None
    whatsapp_invite_url: str | None = None
    facebook_url: str | None = None
    mission_statement: str | None = None
    venue_address_url: str | None = None


class ClubOut(BaseModel):
    id: str
    name: str
    instagram_url: str | None
    linkedin_url: str | None
    whatsapp_invite_url: str | None
    facebook_url: str | None
    mission_statement: str | None
    venue_address_url: str | None


class ClubOfficerOut(BaseModel):
    club_role: ClubRole
    member_id: str | None
    name: str | None


def _club_out(row: dict) -> ClubOut:
    return ClubOut(
        id=row["id"],
        name=row["name"],
        instagram_url=row.get("instagram_url"),
        linkedin_url=row.get("linkedin_url"),
        whatsapp_invite_url=row.get("whatsapp_invite_url"),
        facebook_url=row.get("facebook_url"),
        mission_statement=row.get("mission_statement"),
        venue_address_url=row.get("venue_address_url"),
    )


@router.get("/", response_model=ApiResponse[ClubOut])
async def get_club(
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[ClubOut]:
    result = (
        supabase.table("clubs")
        .select("*")
        .eq("id", user.club_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    return ApiResponse(data=_club_out(result.data[0]))


@router.put("/", response_model=ApiResponse[ClubOut])
async def update_club(
    body: ClubUpdateIn,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[ClubOut]:
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    result = (
        supabase.table("clubs")
        .update(payload)
        .eq("id", user.club_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    return ApiResponse(data=_club_out(result.data[0]))


@router.get("/officers", response_model=ApiResponse[list[ClubOfficerOut]])
async def get_officers(
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[list[ClubOfficerOut]]:
    officers: list[ClubOfficerOut] = []
    for role in OFFICER_ROLES:
        members = await get_members_by_club_role(user.club_id, role.value)
        holder = members[0] if members else None
        officers.append(ClubOfficerOut(
            club_role=role,
            member_id=holder["id"] if holder else None,
            name=holder["name"] if holder else None,
        ))
    return ApiResponse(data=officers)
