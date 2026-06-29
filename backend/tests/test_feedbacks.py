import pytest
from httpx import AsyncClient


async def test_non_evaluator_cannot_submit_feedback(client: AsyncClient, member_token: str):
    # Member without evaluator role → expect 403
    pass


async def test_evaluator_can_submit_feedback(client: AsyncClient, member_token: str):
    # Member with evaluator role → expect 201
    pass


async def test_evaluator_can_edit_own_feedback(client: AsyncClient, member_token: str):
    # Before email dispatch → expect 200
    pass


async def test_edit_locked_after_email_sent(client: AsyncClient, member_token: str):
    # email_logs.status = 'sent' → expect 403
    pass


async def test_admin_can_edit_any_feedback(client: AsyncClient, admin_token: str):
    # Admin editing another evaluator's feedback before dispatch → expect 200
    pass
