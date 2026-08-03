from fastapi import APIRouter, Depends

from app.middleware.auth import CurrentUser, get_current_user, require_admin
from app.models.common import ApiResponse
from app.models.vote import MyVotingStateOut, RatingIn, VoteIn, VoteSummaryItem
from app.services import vote_service

router = APIRouter()


@router.post("/", response_model=ApiResponse[None])
async def submit_vote(
    body: VoteIn,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[None]:
    await vote_service.submit_vote(body, user)
    return ApiResponse(data=None)


@router.post("/rating", response_model=ApiResponse[None])
async def submit_rating(
    body: RatingIn,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[None]:
    await vote_service.submit_rating(body, user)
    return ApiResponse(data=None)


@router.get("/me/{meeting_id}", response_model=ApiResponse[MyVotingStateOut])
async def get_my_voting_state(
    meeting_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[MyVotingStateOut]:
    data = await vote_service.get_my_voting_state(meeting_id, user)
    return ApiResponse(data=data)


@router.get("/summary/{meeting_id}", response_model=ApiResponse[list[VoteSummaryItem]])
async def get_vote_summary(
    meeting_id: str,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[list[VoteSummaryItem]]:
    # Admin-only: returns nominee counts per category, no voter attribution.
    # TODO: implement in vote_service
    raise NotImplementedError


# NOTE: this generic two-segment route must stay declared last — anything
# registered after it with a literal first segment (e.g. /votes/summary/...)
# would otherwise never be reached, since routes are matched in declaration
# order and {meeting_id}/{member_id} structurally matches any two segments.
@router.get("/{meeting_id}/{member_id}", response_model=ApiResponse[MyVotingStateOut])
async def get_member_voting_state(
    meeting_id: str,
    member_id: str,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[MyVotingStateOut]:
    data = await vote_service.get_member_voting_state(meeting_id, member_id, user)
    return ApiResponse(data=data)
