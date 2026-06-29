from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db.client import supabase
from app.middleware.auth import CurrentUser, get_current_user, require_admin
from app.models.common import ApiResponse

router = APIRouter()


class SocialLinksIn(BaseModel):
    instagram_url: str | None = None
    linkedin_url: str | None = None
    whatsapp_invite_url: str | None = None


class ClubOut(BaseModel):
    id: str
    name: str
    instagram_url: str | None
    linkedin_url: str | None
    whatsapp_invite_url: str | None


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
    row = result.data[0]
    return ApiResponse(data=ClubOut(
        id=row["id"],
        name=row["name"],
        instagram_url=row.get("instagram_url"),
        linkedin_url=row.get("linkedin_url"),
        whatsapp_invite_url=row.get("whatsapp_invite_url"),
    ))


@router.put("/social-links", response_model=ApiResponse[ClubOut])
async def update_social_links(
    body: SocialLinksIn,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[ClubOut]:
    # TODO: implement db update for clubs table
    raise NotImplementedError
