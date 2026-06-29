from fastapi import APIRouter, Depends

from app.middleware.auth import CurrentUser, get_current_user, require_admin
from app.models.common import ApiResponse
from app.models.meeting import MeetingRoleAssignmentOut, RoleAssignIn

router = APIRouter()


@router.get("/{meeting_id}", response_model=ApiResponse[list[MeetingRoleAssignmentOut]])
async def get_roles(
    meeting_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[list[MeetingRoleAssignmentOut]]:
    # TODO: implement in meeting_service
    raise NotImplementedError


@router.post("/", response_model=ApiResponse[MeetingRoleAssignmentOut])
async def assign_role(
    body: RoleAssignIn,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[MeetingRoleAssignmentOut]:
    # TODO: implement in meeting_service
    raise NotImplementedError


@router.delete("/{role_id}", response_model=ApiResponse[None])
async def delete_role(
    role_id: str,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[None]:
    # TODO: implement in meeting_service
    raise NotImplementedError
