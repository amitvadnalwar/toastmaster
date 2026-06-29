from fastapi import APIRouter, Depends

from app.middleware.auth import CurrentUser, get_current_user, require_admin
from app.models.common import ApiResponse
from app.models.feedback import FeedbackIn, FeedbackOut, FeedbackUpdateIn

router = APIRouter()


@router.post("/", response_model=ApiResponse[FeedbackOut])
async def submit_feedback(
    body: FeedbackIn,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[FeedbackOut]:
    # Requires caller to be evaluator for this meeting. Returns 403 otherwise.
    # TODO: implement in feedback_service
    raise NotImplementedError


@router.get("/{meeting_id}", response_model=ApiResponse[list[FeedbackOut]])
async def get_feedbacks(
    meeting_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[list[FeedbackOut]]:
    # Evaluators see only their own submissions. Admins see all.
    # TODO: implement in feedback_service
    raise NotImplementedError


@router.put("/{feedback_id}", response_model=ApiResponse[FeedbackOut])
async def update_feedback(
    feedback_id: str,
    body: FeedbackUpdateIn,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[FeedbackOut]:
    # Evaluator can edit own feedback; admin can edit any.
    # Rejected if speaker's email_log.status = 'sent'.
    # TODO: implement in feedback_service
    raise NotImplementedError
