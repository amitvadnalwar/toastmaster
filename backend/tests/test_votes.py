import pytest
from httpx import AsyncClient


async def test_vote_rejected_when_voting_not_open(client: AsyncClient, guest_token: str):
    # voting_status = 'not_started' → expect 403
    pass


async def test_vote_accepted_when_voting_open(client: AsyncClient, guest_token: str):
    # voting_status = 'open' → expect 201
    pass


async def test_duplicate_vote_returns_conflict(client: AsyncClient, guest_token: str):
    # Second vote in same category → expect 409
    pass


async def test_vote_summary_requires_admin(client: AsyncClient, member_token: str):
    # Non-admin requesting summary → expect 403
    pass
