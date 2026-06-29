from datetime import datetime, timedelta, timezone

from jose import jwt

from app.config import settings
from app.models.onboarding import GuestRegisterIn, GuestRegisterOut, LookupIn, LookupResult


async def lookup_identity(body: LookupIn) -> LookupResult:
    # TODO: query members table by email or phone + club_id
    # Returns status='found' with member metadata, or status='not_found'
    raise NotImplementedError


async def register_guest(body: GuestRegisterIn) -> GuestRegisterOut:
    # TODO: insert member row (is_guest=True, app_role=None)
    # Issue a short-lived guest JWT signed with GUEST_JWT_SECRET
    raise NotImplementedError


def _issue_guest_jwt(member_id: str, club_id: str, meeting_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.guest_token_expire_hours)
    payload = {
        "sub": member_id,
        "role": "guest",
        "club_id": club_id,
        "meeting_id": meeting_id,
        "exp": expire,
    }
    return jwt.encode(payload, settings.guest_jwt_secret, algorithm="HS256")
