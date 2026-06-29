import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture
def member_token() -> str:
    # Returns a valid member JWT for test requests.
    # TODO: generate using test Supabase project credentials
    return "test-member-token"


@pytest.fixture
def admin_token() -> str:
    # Returns a valid admin JWT for test requests.
    # TODO: generate using test Supabase project credentials
    return "test-admin-token"


@pytest.fixture
def guest_token() -> str:
    # Returns a valid guest JWT for test requests.
    # TODO: generate via _issue_guest_jwt with test secrets
    return "test-guest-token"
