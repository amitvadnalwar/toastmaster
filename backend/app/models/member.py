from enum import StrEnum
from pydantic import BaseModel


class AppRole(StrEnum):
    member = "member"
    admin = "admin"
    super_admin = "super_admin"


class ClubRole(StrEnum):
    member = "member"
    guest = "guest"
    president = "president"
    vp_education = "vp_education"
    vp_membership = "vp_membership"
    vp_pr = "vp_pr"
    secretary = "secretary"
    treasurer = "treasurer"
    saa = "saa"


class RegistrationSource(StrEnum):
    friend = "Friend"
    social_media = "Social Media"
    website = "Website"
    walk_in = "Walk-in"
    other = "Other"


class MemberOut(BaseModel):
    id: str
    auth_user_id: str | None
    club_id: str
    email: str
    phone: str | None
    name: str
    birthday: str | None
    birthday_collected: bool
    source: str | None
    is_guest: bool
    app_role: AppRole | None
    club_role: ClubRole
    created_at: str
    is_active: bool = True
    is_confirmed: bool = False


class MemberCreateIn(BaseModel):
    name: str
    email: str
    phone: str
    birthday: str | None = None  # MM-DD format, optional


class BirthdayUpdateIn(BaseModel):
    birthday: str  # validated as MM-DD in service layer
