from fastapi import APIRouter, Depends

from app.middleware.auth import CurrentUser, get_current_user, require_admin
from app.models.common import ApiResponse
from app.models.post import PostIn, PostOut

router = APIRouter()


@router.get("/active/{club_id}", response_model=ApiResponse[PostOut | None])
async def get_active_post(
    club_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[PostOut | None]:
    # Returns the single post where is_active = true for the club, or null.
    # TODO: implement in db/posts.py
    raise NotImplementedError


@router.post("/", response_model=ApiResponse[PostOut])
async def create_post(
    body: PostIn,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[PostOut]:
    # Deactivates previous active post before inserting new one.
    # TODO: implement in db/posts.py
    raise NotImplementedError
