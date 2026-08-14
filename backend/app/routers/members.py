from fastapi import APIRouter, BackgroundTasks, Depends

from app.middleware.auth import CurrentUser, require_member
from app.models.common import ApiResponse
from app.models.member import BirthdayUpdateIn, MemberCreateIn, MemberOut
from app.services import member_service

router = APIRouter()


# Public — no auth. Self-registration from the login screen's "Register as
# Member" link. Declared first since it's a literal segment, not that it
# matters here (no {id}-style catch-all on this router), but keeps public
# vs member-only endpoints visually grouped.
@router.post("/register", response_model=ApiResponse[MemberOut], status_code=201)
async def register_member(
    body: MemberCreateIn,
    background_tasks: BackgroundTasks,
) -> ApiResponse[MemberOut]:
    member = await member_service.register(body, background_tasks)
    return ApiResponse(data=member)


@router.get("/me", response_model=ApiResponse[MemberOut])
async def get_me(
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[MemberOut]:
    member = await member_service.get_me(user)
    return ApiResponse(data=member)


@router.post("/me/confirm-password", status_code=204)
async def confirm_password_changed(
    user: CurrentUser = Depends(require_member),
) -> None:
    await member_service.confirm_password_changed(user)


@router.get("/me/stats", response_model=ApiResponse[dict])
async def get_my_stats(
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[dict]:
    stats = await member_service.get_my_stats(user)
    return ApiResponse(data=stats)


@router.get("/club", response_model=ApiResponse[list])
async def get_club_members(
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[list]:
    members = await member_service.get_club_members(user)
    return ApiResponse(data=members)


@router.put("/birthday", response_model=ApiResponse[MemberOut])
async def update_birthday(
    body: BirthdayUpdateIn,
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[MemberOut]:
    # Atomically sets birthday + birthday_collected = true.
    # Validates MM-DD format in service layer.
    # TODO: implement in member_service
    raise NotImplementedError
