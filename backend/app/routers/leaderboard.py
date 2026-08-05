from fastapi import APIRouter, Depends

from app.middleware.auth import CurrentUser, require_member
from app.models.common import ApiResponse
from app.models.leaderboard import LeaderboardEntry, MemberPointsOut
from app.services import leaderboard_service

router = APIRouter()


@router.get("/", response_model=ApiResponse[list[LeaderboardEntry]])
async def get_leaderboard(
    month: str | None = None,
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[list[LeaderboardEntry]]:
    result = await leaderboard_service.get_leaderboard(user.club_id, month)
    return ApiResponse(data=result)


@router.get("/{member_id}", response_model=ApiResponse[MemberPointsOut])
async def get_member_points(
    member_id: str,
    month: str | None = None,
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[MemberPointsOut]:
    result = await leaderboard_service.get_member_points(user.club_id, member_id, month)
    return ApiResponse(data=result)
