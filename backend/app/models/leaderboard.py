from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    member_id: str
    member_name: str
    member_initials: str | None = None
    points: int
    rank: int


class PointsBreakdownItem(BaseModel):
    label: str
    count: int
    points_each: int
    total: int


class MemberPointsOut(BaseModel):
    member_id: str
    member_name: str
    member_initials: str | None = None
    total_points: int
    breakdown: list[PointsBreakdownItem]
