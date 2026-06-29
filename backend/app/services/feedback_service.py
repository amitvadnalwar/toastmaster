from app.middleware.auth import CurrentUser
from app.models.feedback import FeedbackIn, FeedbackOut, FeedbackUpdateIn


async def submit_feedback(body: FeedbackIn, user: CurrentUser) -> FeedbackOut:
    # 1. Verify user is evaluator for this meeting via meeting_roles. Raise 403 if not.
    # 2. Insert into feedbacks (evaluator_id = user.id).
    raise NotImplementedError


async def get_feedbacks(meeting_id: str, user: CurrentUser) -> list[FeedbackOut]:
    # Admin: returns all feedbacks for the meeting.
    # Evaluator: returns only rows where evaluator_id = user.id.
    raise NotImplementedError


async def update_feedback(
    feedback_id: str, body: FeedbackUpdateIn, user: CurrentUser
) -> FeedbackOut:
    # 1. Load feedback to confirm ownership (evaluator) or admin role.
    # 2. Check email_logs: if speaker's status = 'sent', raise 403 (locked).
    # 3. Update comment + updated_at.
    raise NotImplementedError
