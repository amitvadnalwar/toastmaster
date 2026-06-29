from fastapi import APIRouter

from app.models.common import ApiResponse
from app.models.onboarding import GuestRegisterIn, GuestRegisterOut, LookupIn, LookupResult

router = APIRouter()


@router.post("/lookup", response_model=ApiResponse[LookupResult])
async def lookup_identity(body: LookupIn) -> ApiResponse[LookupResult]:
    # TODO: implement in onboarding_service
    raise NotImplementedError


@router.post("/register", response_model=ApiResponse[GuestRegisterOut])
async def register_guest(body: GuestRegisterIn) -> ApiResponse[GuestRegisterOut]:
    # TODO: implement in onboarding_service
    raise NotImplementedError
