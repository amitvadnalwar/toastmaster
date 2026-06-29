from fastapi import APIRouter, Depends

from app.middleware.auth import CurrentUser, get_current_user, require_admin, require_member
from app.models.common import ApiResponse
from app.models.meeting import (
    AdminAssignRoleIn,
    CheckinIn,
    CheckinOut,
    EnrollEvaluatorIn,
    EnrollRoleIn,
    EnrollSpeakerIn,
    MeetingCreateIn,
    MeetingFeedbackIn,
    MeetingOut,
    MeetingRoleAssignmentOut,
    MeetingStatusUpdateIn,
    SpeakerFeedbackOut,
    VotingStatusUpdateIn,
)
from app.services import meeting_service

router = APIRouter()


# ── Meeting CRUD ──────────────────────────────────────────────────────────

@router.get("/", response_model=ApiResponse[list[MeetingOut]])
async def list_meetings(
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[list[MeetingOut]]:
    meetings = await meeting_service.get_all_meetings(user.club_id)
    return ApiResponse(data=meetings)


@router.get("/current", response_model=ApiResponse[dict])
async def get_current_meeting(
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[dict]:
    result = await meeting_service.get_current_meeting(user.club_id)
    return ApiResponse(data=result)


@router.post("/", response_model=ApiResponse[MeetingOut])
async def create_meeting(
    body: MeetingCreateIn,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[MeetingOut]:
    meeting = await meeting_service.create_meeting(body, user)
    return ApiResponse(data=meeting)


@router.get("/{meeting_id}", response_model=ApiResponse[MeetingOut])
async def get_meeting(
    meeting_id: str,
    _user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[MeetingOut]:
    meeting = await meeting_service.get_meeting_by_id(meeting_id)
    return ApiResponse(data=meeting)


@router.put("/{meeting_id}", response_model=ApiResponse[MeetingOut])
async def update_meeting(
    meeting_id: str,
    body: MeetingCreateIn,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[MeetingOut]:
    meeting = await meeting_service.update_meeting_details(meeting_id, body, user)
    return ApiResponse(data=meeting)


@router.put("/{meeting_id}/status", response_model=ApiResponse[MeetingOut])
async def update_meeting_status(
    meeting_id: str,
    body: MeetingStatusUpdateIn,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[MeetingOut]:
    meeting = await meeting_service.update_meeting_status(meeting_id, body.status, user)
    return ApiResponse(data=meeting)


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(
    meeting_id: str,
    user: CurrentUser = Depends(require_admin),
) -> None:
    await meeting_service.delete_meeting(meeting_id, user)


@router.put("/{meeting_id}/voting", response_model=ApiResponse[MeetingOut])
async def update_voting_status(
    meeting_id: str,
    body: VotingStatusUpdateIn,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[MeetingOut]:
    meeting = await meeting_service.update_voting_status(meeting_id, body.voting_status, user)
    return ApiResponse(data=meeting)


# ── Roster ────────────────────────────────────────────────────────────────

@router.get("/{meeting_id}/roster", response_model=ApiResponse[dict])
async def get_meeting_roster(
    meeting_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[dict]:
    result = await meeting_service.get_meeting_with_roster(meeting_id, user.club_id)
    return ApiResponse(data=result)


# ── Admin role assignment ─────────────────────────────────────────────────

@router.post("/{meeting_id}/roles/assign", response_model=ApiResponse[MeetingRoleAssignmentOut])
async def admin_assign_role(
    meeting_id: str,
    body: AdminAssignRoleIn,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[MeetingRoleAssignmentOut]:
    result = await meeting_service.admin_assign_role(meeting_id, body, user)
    return ApiResponse(data=result)


@router.delete("/{meeting_id}/roles/{role_id}", status_code=204)
async def withdraw_role(
    meeting_id: str,
    role_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> None:
    await meeting_service.withdraw_from_role(meeting_id, role_id, user)


# ── Member self-enrollment ────────────────────────────────────────────────

@router.post("/{meeting_id}/enroll/role", response_model=ApiResponse[MeetingRoleAssignmentOut])
async def enroll_role(
    meeting_id: str,
    body: EnrollRoleIn,
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[MeetingRoleAssignmentOut]:
    result = await meeting_service.enroll_role(meeting_id, body.role, body.theme, user)
    return ApiResponse(data=result)


@router.post("/{meeting_id}/enroll/speaker", response_model=ApiResponse[MeetingRoleAssignmentOut])
async def enroll_speaker(
    meeting_id: str,
    body: EnrollSpeakerIn,
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[MeetingRoleAssignmentOut]:
    result = await meeting_service.enroll_speaker(meeting_id, body.speech_duration, user)
    return ApiResponse(data=result)


@router.post("/{meeting_id}/enroll/evaluator", response_model=ApiResponse[MeetingRoleAssignmentOut])
async def enroll_evaluator(
    meeting_id: str,
    body: EnrollEvaluatorIn,
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[MeetingRoleAssignmentOut]:
    result = await meeting_service.enroll_evaluator(meeting_id, body.evaluates_member_id, user)
    return ApiResponse(data=result)


# ── QR check-in ───────────────────────────────────────────────────────────

@router.post("/checkin", response_model=ApiResponse[CheckinOut])
async def checkin(
    body: CheckinIn,
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[CheckinOut]:
    result = await meeting_service.checkin(body.qr_token, user)
    return ApiResponse(data=result)


# ── Speaker feedback ──────────────────────────────────────────────────────

@router.get("/{meeting_id}/feedback/me", response_model=ApiResponse[list[SpeakerFeedbackOut]])
async def get_my_feedback(
    meeting_id: str,
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[list[SpeakerFeedbackOut]]:
    result = await meeting_service.get_my_feedback(meeting_id, user)
    return ApiResponse(data=result)


@router.post("/{meeting_id}/feedback", response_model=ApiResponse[list[SpeakerFeedbackOut]])
async def submit_feedback(
    meeting_id: str,
    body: MeetingFeedbackIn,
    user: CurrentUser = Depends(require_member),
) -> ApiResponse[list[SpeakerFeedbackOut]]:
    result = await meeting_service.submit_feedback(meeting_id, body, user)
    return ApiResponse(data=result)
