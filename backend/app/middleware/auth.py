import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings

bearer = HTTPBearer()

# In-memory JWKS cache — fetched once on first request, valid for process lifetime.
# Supabase rotates keys rarely; restart the process if keys are rotated mid-deployment.
_jwks_cache: list[dict] | None = None


async def _get_jwks() -> list[dict]:
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(settings.supabase_jwks_url, timeout=10)
            resp.raise_for_status()
            _jwks_cache = resp.json()["keys"]
    return _jwks_cache


async def _decode_supabase_token(token: str) -> dict | None:
    """Try each key in the Supabase JWKS until one verifies the token."""
    keys = await _get_jwks()
    for key in keys:
        try:
            return jwt.decode(
                token,
                key,
                algorithms=["ES256", "RS256"],
                options={"verify_aud": False},
            )
        except JWTError:
            continue
    return None


def _decode_guest_token(token: str) -> dict | None:
    """Verify a FastAPI-issued guest JWT (HS256, short-lived)."""
    try:
        return jwt.decode(
            token,
            settings.guest_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        return None


class CurrentUser(BaseModel):
    id: str
    app_role: str | None  # 'member' | 'admin' | 'super_admin' | None (guest)
    club_id: str
    meeting_id: str | None
    is_guest: bool


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> CurrentUser:
    token = credentials.credentials

    # Try Supabase ES256 token first (members, admins, super_admins)
    payload = await _decode_supabase_token(token)
    if payload:
        return CurrentUser(
            id=payload["sub"],
            app_role=payload.get("app_role"),
            club_id=payload.get("club_id", ""),
            meeting_id=payload.get("meeting_id"),
            is_guest=False,
        )

    # Fall back to HS256 guest token (issued by FastAPI /onboarding/register)
    payload = _decode_guest_token(token)
    if payload:
        return CurrentUser(
            id=payload["sub"],
            app_role=None,
            club_id=payload.get("club_id", ""),
            meeting_id=payload.get("meeting_id"),
            is_guest=payload.get("role") == "guest",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.app_role not in ("admin", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_super_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.app_role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return user


def require_member(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.is_guest or user.app_role is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Member access required")
    return user
