from fastapi import APIRouter, Depends

from app.middleware.auth import CurrentUser, get_current_user, require_admin
from app.models.common import ApiResponse
from app.models.vote import RatingIn, VoteIn, VoteSummaryItem

router = APIRouter()


@router.post("/", response_model=ApiResponse[None])
async def submit_vote(
    body: VoteIn,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[None]:
    # Rejects if voting_status != 'open'. Unique constraint handles duplicates (409).
    # TODO: implement in vote_service
    raise NotImplementedError


@router.post("/rating", response_model=ApiResponse[None])
async def submit_rating(
    body: RatingIn,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[None]:
    # TODO: implement in vote_service
    raise NotImplementedError


@router.get("/summary/{meeting_id}", response_model=ApiResponse[list[VoteSummaryItem]])
async def get_vote_summary(
    meeting_id: str,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[list[VoteSummaryItem]]:
    # Admin-only: returns nominee counts per category, no voter attribution.
    # TODO: implement in vote_service
    raise NotImplementedError
