import pytest
from httpx import AsyncClient


async def test_lookup_unknown_identity_returns_not_found(client: AsyncClient):
    # TODO: seed no member with this email, assert status='not_found'
    pass


async def test_lookup_known_member_returns_found(client: AsyncClient):
    # TODO: seed a member, assert status='found' with correct metadata
    pass


async def test_register_guest_creates_member_record(client: AsyncClient):
    # TODO: call /onboarding/register, assert member row written with is_guest=True
    pass


async def test_register_guest_returns_jwt(client: AsyncClient):
    # TODO: assert returned token is a valid JWT with role='guest'
    pass
