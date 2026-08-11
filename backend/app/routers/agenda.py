from fastapi import APIRouter, Depends

from app.middleware.auth import CurrentUser, get_current_user, require_admin
from app.models.agenda import AgendaOut, AgendaSaveIn
from app.models.common import ApiResponse
from app.services import agenda_service

router = APIRouter()


@router.get("/{meeting_id}/agenda", response_model=ApiResponse[AgendaOut])
async def get_agenda(
    meeting_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[AgendaOut]:
    agenda = await agenda_service.get_agenda(meeting_id, user)
    return ApiResponse(data=agenda)


@router.put("/{meeting_id}/agenda", response_model=ApiResponse[AgendaOut])
async def save_agenda(
    meeting_id: str,
    body: AgendaSaveIn,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[AgendaOut]:
    agenda = await agenda_service.save_agenda(meeting_id, body, user)
    return ApiResponse(data=agenda)


@router.post("/{meeting_id}/agenda/clone-previous", response_model=ApiResponse[AgendaOut])
async def clone_previous_agenda(
    meeting_id: str,
    user: CurrentUser = Depends(require_admin),
) -> ApiResponse[AgendaOut]:
    agenda = await agenda_service.clone_previous_agenda(meeting_id, user)
    return ApiResponse(data=agenda)
