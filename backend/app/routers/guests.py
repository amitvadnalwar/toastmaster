from fastapi import APIRouter

from app.models.common import ApiResponse
from app.models.guest import (
    GuestMeetingFeedbackIn,
    GuestRegisterIn,
    GuestRegisterOut,
    GuestSpeakerFeedbackIn,
    GuestVotesIn,
    NomineeCategoryOut,
    SpeakerOut,
)

router = APIRouter()


@router.post("/register", response_model=ApiResponse[GuestRegisterOut])
async def register_guest(body: GuestRegisterIn) -> ApiResponse[GuestRegisterOut]:
    from app.services import guest_service

    data = await guest_service.register_guest(body)
    return ApiResponse(data=data)


# ── Public endpoints for the guest HTML page (no auth required) ───────────────

@router.get("/meetings/{meeting_id}/speakers", response_model=ApiResponse[list[SpeakerOut]])
async def get_speakers(meeting_id: str) -> ApiResponse[list[SpeakerOut]]:
    from app.services import guest_service

    data = await guest_service.get_meeting_speakers(meeting_id)
    return ApiResponse(data=data)


@router.get("/meetings/{meeting_id}/nominees", response_model=ApiResponse[list[NomineeCategoryOut]])
async def get_nominees(meeting_id: str) -> ApiResponse[list[NomineeCategoryOut]]:
    from app.services import guest_service

    data = await guest_service.get_meeting_nominees(meeting_id)
    return ApiResponse(data=data)


# ── Feedback & vote submission ─────────────────────────────────────────────────

@router.post("/{guest_id}/speaker-feedback", response_model=ApiResponse[None])
async def submit_speaker_feedback(
    guest_id: str, body: GuestSpeakerFeedbackIn
) -> ApiResponse[None]:
    from app.services import guest_service

    await guest_service.submit_speaker_feedback(guest_id, body)
    return ApiResponse(data=None)


@router.post("/{guest_id}/meeting-feedback", response_model=ApiResponse[None])
async def submit_meeting_feedback(
    guest_id: str, body: GuestMeetingFeedbackIn
) -> ApiResponse[None]:
    from app.services import guest_service

    await guest_service.submit_meeting_feedback(guest_id, body)
    return ApiResponse(data=None)


@router.post("/{guest_id}/votes", response_model=ApiResponse[None])
async def submit_votes(guest_id: str, body: GuestVotesIn) -> ApiResponse[None]:
    from app.services import guest_service

    await guest_service.submit_votes(guest_id, body)
    return ApiResponse(data=None)
