from pydantic import BaseModel
from app.models.member import MemberOut, RegistrationSource


class LookupIn(BaseModel):
    identity: str  # email or phone
    meeting_id: str


class LookupResult(BaseModel):
    status: str  # 'found' | 'not_found'
    member_id: str | None = None
    is_guest: bool | None = None
    app_role: str | None = None


class GuestRegisterIn(BaseModel):
    name: str
    email: str
    phone: str | None = None
    source: RegistrationSource
    meeting_id: str


class GuestRegisterOut(BaseModel):
    member: MemberOut
    token: str
