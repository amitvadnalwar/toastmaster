from app.db.client import supabase


async def insert(
    meeting_id: str,
    speaker_id: str,
    evaluator_id: str,
    comment: str,
) -> dict:
    # TODO: implement
    raise NotImplementedError


async def get_by_meeting(meeting_id: str) -> list[dict]:
    # TODO: implement
    raise NotImplementedError


async def get_by_evaluator(meeting_id: str, evaluator_id: str) -> list[dict]:
    # TODO: implement
    raise NotImplementedError


async def update_comment(feedback_id: str, comment: str) -> dict:
    # Sets comment + updated_at = now().
    # TODO: implement
    raise NotImplementedError


async def get_email_log_status(meeting_id: str, speaker_id: str) -> str | None:
    # Returns email_logs.status for this speaker, or None if no log exists.
    # TODO: implement
    raise NotImplementedError


async def upsert_email_log(
    meeting_id: str,
    speaker_id: str,
    status: str,
    error_message: str | None = None,
) -> None:
    # TODO: implement
    raise NotImplementedError
