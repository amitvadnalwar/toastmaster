import httpx

from app.config import settings
from app.models.feedback import EmailDispatchResult

MAX_RETRIES = 3


async def dispatch_feedback_emails(meeting_id: str) -> EmailDispatchResult:
    # 1. Fetch all feedbacks for meeting, grouped by speaker_id.
    # 2. For each speaker:
    #    a. Check email_logs: skip if status = 'sent'.
    #    b. Fetch speaker email from members table.
    #    c. Build email body (evaluator name, comment, timestamp).
    #    d. Send via Resend with up to MAX_RETRIES attempts.
    #    e. Write/update email_logs record.
    # 3. Return { sent, failed, skipped } counts.
    raise NotImplementedError


async def _send_email(to: str, subject: str, body: str) -> None:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.email_api_key}"},
            json={
                "from": settings.email_from_address,
                "to": to,
                "subject": subject,
                "text": body,
            },
        )
        response.raise_for_status()
