"""Tests for super-admin member role management endpoints."""
import pytest
from unittest.mock import AsyncMock, patch

from app.models.member import AppRole, ClubRole
from app.services import admin_member_service as svc
from fastapi import HTTPException


CLUB_ID = "club-001"
SUPER_ADMIN_ID = "sa-001"
TARGET_ID = "member-002"

MEMBER_ROW = {
    "id": TARGET_ID,
    "auth_user_id": "auth-002",
    "club_id": CLUB_ID,
    "email": "member@example.com",
    "phone": None,
    "name": "Alice",
    "birthday": None,
    "birthday_collected": False,
    "source": None,
    "is_guest": False,
    "app_role": "member",
    "club_role": "member",
    "created_at": "2024-01-01T00:00:00Z",
}


@pytest.mark.asyncio
async def test_update_club_role_success():
    updated = {**MEMBER_ROW, "club_role": "vp_education"}
    with patch("app.db.admin_members.update_member_club_role", new_callable=AsyncMock) as mock:
        mock.return_value = updated
        result = await svc.update_club_role(SUPER_ADMIN_ID, TARGET_ID, CLUB_ID, ClubRole.vp_education)
    assert result.club_role == ClubRole.vp_education


@pytest.mark.asyncio
async def test_update_club_role_blocks_guest():
    with pytest.raises(HTTPException) as exc:
        await svc.update_club_role(SUPER_ADMIN_ID, TARGET_ID, CLUB_ID, ClubRole.guest)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_update_app_role_blocks_self():
    with pytest.raises(HTTPException) as exc:
        await svc.update_app_role(SUPER_ADMIN_ID, SUPER_ADMIN_ID, CLUB_ID, AppRole.member)
    assert exc.value.status_code == 400
    assert "own app role" in exc.value.detail


@pytest.mark.asyncio
async def test_update_app_role_blocks_last_super_admin():
    target_sa_row = {**MEMBER_ROW, "id": TARGET_ID, "app_role": "super_admin"}
    with (
        patch("app.db.admin_members.count_super_admins", new_callable=AsyncMock) as count_mock,
        patch("app.db.admin_members.fetch_all_non_guest_members", new_callable=AsyncMock) as list_mock,
    ):
        count_mock.return_value = 1
        list_mock.return_value = [target_sa_row]
        with pytest.raises(HTTPException) as exc:
            await svc.update_app_role(SUPER_ADMIN_ID, TARGET_ID, CLUB_ID, AppRole.member)
    assert exc.value.status_code == 400
    assert "last super admin" in exc.value.detail


@pytest.mark.asyncio
async def test_update_app_role_allows_when_multiple_super_admins():
    updated = {**MEMBER_ROW, "app_role": "admin"}
    with (
        patch("app.db.admin_members.count_super_admins", new_callable=AsyncMock) as count_mock,
        patch("app.db.admin_members.update_member_app_role", new_callable=AsyncMock) as update_mock,
    ):
        count_mock.return_value = 2  # still one remaining after change
        update_mock.return_value = updated
        result = await svc.update_app_role(SUPER_ADMIN_ID, TARGET_ID, CLUB_ID, AppRole.admin)
    assert result.app_role == AppRole.admin


@pytest.mark.asyncio
async def test_update_club_role_member_not_found():
    with patch("app.db.admin_members.update_member_club_role", new_callable=AsyncMock) as mock:
        mock.return_value = None
        with pytest.raises(HTTPException) as exc:
            await svc.update_club_role(SUPER_ADMIN_ID, "nonexistent", CLUB_ID, ClubRole.saa)
    assert exc.value.status_code == 404
