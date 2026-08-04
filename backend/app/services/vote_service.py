from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from app.db import meetings as db_meetings
from app.db import members as db_members
from app.db import votes as db_votes
from app.middleware.auth import CurrentUser
from app.models.meeting import VotingStatus
from app.models.vote import (
    MeetingRatingOut,
    MyRatingOut,
    MyVoteOut,
    MyVotingStateOut,
    RatingIn,
    VoteIn,
    VoteSummaryItem,
)

UNIQUE_VIOLATION = "23505"

_CATEGORY_ROLES = {
    "best_speaker": ["speaker"],
    "best_evaluator": ["evaluator"],
    "best_mrp": ["tmod", "general_evaluator", "table_topics_master"],
    "best_arp": ["timer", "ah_counter", "grammarian"],
}


async def _require_meeting(meeting_id: str) -> dict:
    row = await db_meetings.get_by_id(meeting_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return row


async def _require_member(user: CurrentUser) -> dict:
    member = await db_members.get_by_auth_user_id(user.id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member record not found")
    return member


async def submit_vote(body: VoteIn, user: CurrentUser) -> None:
    meeting_row = await _require_meeting(body.meeting_id)
    if meeting_row["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    if meeting_row["voting_status"] != VotingStatus.open:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Voting is not open")

    expected_roles = _CATEGORY_ROLES.get(body.category.value, [])
    roster = await db_meetings.get_roster(body.meeting_id)
    nominee = next(
        (r for r in roster if r["member_id"] == body.nominee_id and r["role"] in expected_roles),
        None,
    )
    if not nominee or nominee.get("disqualified"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nominee is not eligible")

    member = await _require_member(user)
    try:
        await db_votes.insert_vote(body.meeting_id, member["id"], body.category.value, body.nominee_id)
    except APIError as e:
        if e.code == UNIQUE_VIOLATION:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already voted in this category",
            )
        raise


async def submit_rating(body: RatingIn, user: CurrentUser) -> None:
    meeting_row = await _require_meeting(body.meeting_id)
    if meeting_row["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")

    member = await _require_member(user)
    try:
        await db_votes.insert_rating(body.meeting_id, member["id"], body.rating, body.comment)
    except APIError as e:
        if e.code == UNIQUE_VIOLATION:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already submitted a rating for this meeting",
            )
        raise


async def get_my_voting_state(meeting_id: str, user: CurrentUser) -> MyVotingStateOut:
    await _require_meeting(meeting_id)
    member = await _require_member(user)

    votes = await db_votes.get_my_votes(meeting_id, member["id"])
    rating_row = await db_votes.get_my_rating(meeting_id, member["id"])

    return MyVotingStateOut(
        votes=[MyVoteOut(category=v["category"], nominee_id=v["nominee_id"]) for v in votes],
        rating=MyRatingOut(**rating_row) if rating_row else None,
    )


async def get_member_voting_state(meeting_id: str, member_id: str, user: CurrentUser) -> MyVotingStateOut:
    meeting_row = await _require_meeting(meeting_id)
    if meeting_row["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")

    votes = await db_votes.get_my_votes(meeting_id, member_id)
    rating_row = await db_votes.get_my_rating(meeting_id, member_id)

    return MyVotingStateOut(
        votes=[MyVoteOut(category=v["category"], nominee_id=v["nominee_id"]) for v in votes],
        rating=MyRatingOut(**rating_row) if rating_row else None,
    )


async def get_all_ratings(meeting_id: str, user: CurrentUser) -> list[MeetingRatingOut]:
    meeting_row = await _require_meeting(meeting_id)
    if meeting_row["club_id"] != user.club_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your club")
    rows = await db_votes.get_all_ratings(meeting_id)
    return [MeetingRatingOut(**r) for r in rows]


async def get_vote_summary(meeting_id: str) -> list[VoteSummaryItem]:
    # Returns counts per category per nominee. No voter attribution.
    # TODO: GROUP BY category, nominee_id; join members for nominee_name
    raise NotImplementedError
