from app.middleware.auth import CurrentUser
from app.models.vote import RatingIn, VoteIn, VoteSummaryItem


async def submit_vote(body: VoteIn, user: CurrentUser) -> None:
    # 1. Verify meeting.voting_status == 'open'. Raise 403 if not.
    # 2. Insert vote. DB unique constraint on (meeting_id, voter_id, category) raises 409 on duplicate.
    # voter_id is always user.id — never trust the client for this.
    raise NotImplementedError


async def submit_rating(body: RatingIn, user: CurrentUser) -> None:
    # Insert into meeting_ratings. Unique constraint on (meeting_id, voter_id).
    raise NotImplementedError


async def get_vote_summary(meeting_id: str) -> list[VoteSummaryItem]:
    # Returns counts per category per nominee. No voter attribution.
    # TODO: GROUP BY category, nominee_id; join members for nominee_name
    raise NotImplementedError
