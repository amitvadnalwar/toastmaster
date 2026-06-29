from fastapi import APIRouter, Depends

from app.middleware.auth import CurrentUser, require_admin
from app.models.common import ApiResponse
from app.models.feedback import EmailDispatchResult

router = APIRouter()


@router.post("/dispatch/{meeting_id}", response_model=ApiResponse[EmailDispatchResult])
async def dispatch_feedback_emails(
    meeting_id: str,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[EmailDispatchResult]:
    # Idempotent: skips speakers with email_log.status = 'sent'.
    # Retries up to 3 times on failure per speaker.
    # TODO: implement in email_service
    raise NotImplementedError
