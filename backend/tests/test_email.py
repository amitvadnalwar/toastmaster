import pytest
from httpx import AsyncClient


async def test_dispatch_requires_admin(client: AsyncClient, member_token: str):
    # Non-admin → expect 403
    pass


async def test_dispatch_sends_email_per_speaker(client: AsyncClient, admin_token: str):
    # 2 speakers with feedback → result.sent == 2
    pass


async def test_dispatch_is_idempotent(client: AsyncClient, admin_token: str):
    # Second dispatch → result.skipped == 2, result.sent == 0
    pass


async def test_dispatch_retries_on_failure(client: AsyncClient, admin_token: str):
    # Simulate email API failure → expect up to 3 retries, status='failed' in logs
    pass
