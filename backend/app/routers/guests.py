from fastapi import APIRouter

from app.models.common import ApiResponse
from app.models.guest import GuestRegisterIn, GuestRegisterOut

router = APIRouter()


@router.post("/register", response_model=ApiResponse[GuestRegisterOut])
async def register_guest(body: GuestRegisterIn) -> ApiResponse[GuestRegisterOut]:
    from app.services import guest_service

    data = await guest_service.register_guest(body)
    return ApiResponse(data=data)
