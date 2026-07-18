from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel

from app.middleware.auth import CurrentUser, require_super_admin
from app.models.common import ApiResponse
from app.models.member import AppRole, ClubRole, MemberCreateIn, MemberOut
from app.services import admin_member_service as svc

router = APIRouter()


class ClubRoleIn(BaseModel):
    club_role: ClubRole


class AppRoleIn(BaseModel):
    app_role: AppRole


@router.get("/{member_id}", response_model=ApiResponse[MemberOut])
async def get_member(
    member_id: str,
    _user: CurrentUser = Depends(require_super_admin),
) -> ApiResponse[MemberOut]:
    member = await svc.get_member_by_id(member_id)
    return ApiResponse(data=member)


@router.post("/{member_id}/resend-invite", status_code=204)
async def resend_invite(
    member_id: str,
    background_tasks: BackgroundTasks,
    _user: CurrentUser = Depends(require_super_admin),
) -> None:
    await svc.resend_invite(member_id, background_tasks)


@router.get("", response_model=ApiResponse[list[MemberOut]])
async def list_members(user: CurrentUser = Depends(require_super_admin)) -> ApiResponse[list[MemberOut]]:
    members = await svc.get_all_members(user.club_id)
    return ApiResponse(data=members)


@router.post("", response_model=ApiResponse[MemberOut], status_code=201)
async def create_member(
    body: MemberCreateIn,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(require_super_admin),
) -> ApiResponse[MemberOut]:
    member = await svc.create_member(user.club_id, body, background_tasks)
    return ApiResponse(data=member)


class MemberActiveIn(BaseModel):
    is_active: bool


@router.put("/{member_id}/active", response_model=ApiResponse[MemberOut])
async def set_member_active(
    member_id: str,
    body: MemberActiveIn,
    _user: CurrentUser = Depends(require_super_admin),
) -> ApiResponse[MemberOut]:
    member = await svc.set_member_active(member_id, body.is_active)
    return ApiResponse(data=member)


@router.put("/{member_id}/club-role", response_model=ApiResponse[MemberOut])
async def set_club_role(
    member_id: str,
    body: ClubRoleIn,
    user: CurrentUser = Depends(require_super_admin),
) -> ApiResponse[MemberOut]:
    member = await svc.update_club_role(user.id, member_id, user.club_id, body.club_role)
    return ApiResponse(data=member)


@router.put("/{member_id}/app-role", response_model=ApiResponse[MemberOut])
async def set_app_role(
    member_id: str,
    body: AppRoleIn,
    user: CurrentUser = Depends(require_super_admin),
) -> ApiResponse[MemberOut]:
    member = await svc.update_app_role(user.id, member_id, user.club_id, body.app_role)
    return ApiResponse(data=member)