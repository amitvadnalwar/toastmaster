from datetime import datetime, timezone

from app.db import leaderboard as db_leaderboard
from app.db import members as db_members
from app.models.leaderboard import LeaderboardEntry, MemberPointsOut, PointsBreakdownItem

_ROLE_POINTS: dict[str, tuple[str, int]] = {
    "tmod": ("TMOD", 20),
    "general_evaluator": ("General Evaluator", 20),
    "speaker": ("Speeches", 15),
    "evaluator": ("Evaluators", 15),
}
_OTHER_ROLE_LABEL, _OTHER_ROLE_POINTS = "Other Meeting Roles", 10
_ATTENDANCE_LABEL, _ATTENDANCE_POINTS = "Attendance", 10
_WINNER_LABEL, _WINNER_POINTS = "Winners", 10


def _month_range(month: str) -> tuple[str, str]:
    year, mon = int(month[:4]), int(month[5:7])
    start = datetime(year, mon, 1, tzinfo=timezone.utc)
    end = datetime(year + 1, 1, 1, tzinfo=timezone.utc) if mon == 12 else datetime(year, mon + 1, 1, tzinfo=timezone.utc)
    return start.isoformat(), end.isoformat()


def _current_month() -> str:
    now = datetime.now(timezone.utc)
    return f"{now.year:04d}-{now.month:02d}"


async def _compute_points(club_id: str, month: str) -> dict[str, dict]:
    start_iso, end_iso = _month_range(month)
    now_iso = datetime.now(timezone.utc).isoformat()
    effective_end = min(end_iso, now_iso)

    meetings = await db_leaderboard.get_meetings_in_range(club_id, start_iso, effective_end)
    meeting_ids = [m["id"] for m in meetings]

    points: dict[str, dict] = {}

    def add(member_id: str | None, member_name: str | None, label: str, pts: int) -> None:
        if not member_id:
            return
        entry = points.setdefault(member_id, {"name": member_name or "—", "total": 0, "breakdown": {}})
        if member_name:
            entry["name"] = member_name
        bucket = entry["breakdown"].setdefault(label, {"count": 0, "points_each": pts, "total": 0})
        bucket["count"] += 1
        bucket["total"] += pts
        entry["total"] += pts

    roles = await db_leaderboard.get_roles_for_meetings(meeting_ids)
    for r in roles:
        label, pts = _ROLE_POINTS.get(r["role"], (_OTHER_ROLE_LABEL, _OTHER_ROLE_POINTS))
        add(r["member_id"], r.get("member_name"), label, pts)

    attendance = await db_leaderboard.get_attendance_for_meetings(meeting_ids)
    for a in attendance:
        add(a["member_id"], a.get("member_name"), _ATTENDANCE_LABEL, _ATTENDANCE_POINTS)

    votes = await db_leaderboard.get_votes_for_meetings(meeting_ids)
    tally: dict[tuple[str, str], dict[str, dict]] = {}
    for v in votes:
        key = (v["meeting_id"], v["category"])
        bucket = tally.setdefault(key, {})
        nominee = bucket.setdefault(v["nominee_id"], {"count": 0, "name": v.get("member_name")})
        nominee["count"] += 1
    for nominees in tally.values():
        if not nominees:
            continue
        max_count = max(n["count"] for n in nominees.values())
        if max_count == 0:
            continue
        for nominee_id, info in nominees.items():
            if info["count"] == max_count:
                add(nominee_id, info["name"], _WINNER_LABEL, _WINNER_POINTS)

    return points


async def _get_initials_map(club_id: str) -> dict[str, str | None]:
    members = await db_members.get_club_members(club_id)
    return {m["id"]: m.get("initials") for m in members}


async def get_leaderboard(club_id: str, month: str | None) -> list[LeaderboardEntry]:
    resolved_month = month or _current_month()
    points = await _compute_points(club_id, resolved_month)
    initials_map = await _get_initials_map(club_id)
    ranked = sorted(points.items(), key=lambda kv: kv[1]["total"], reverse=True)

    result: list[LeaderboardEntry] = []
    rank = 0
    prev_total: int | None = None
    for i, (member_id, data) in enumerate(ranked):
        if data["total"] != prev_total:
            rank = i + 1
            prev_total = data["total"]
        result.append(LeaderboardEntry(
            member_id=member_id,
            member_name=data["name"],
            member_initials=initials_map.get(member_id),
            points=data["total"],
            rank=rank,
        ))
    return result


async def get_member_points(club_id: str, member_id: str, month: str | None) -> MemberPointsOut:
    resolved_month = month or _current_month()
    points = await _compute_points(club_id, resolved_month)
    data = points.get(member_id)

    if data is None:
        member = await db_members.get_by_id(member_id)
        name = member["name"] if member else "—"
        initials = member.get("initials") if member else None
        return MemberPointsOut(member_id=member_id, member_name=name, member_initials=initials, total_points=0, breakdown=[])

    member = await db_members.get_by_id(member_id)
    initials = member.get("initials") if member else None
    breakdown = [
        PointsBreakdownItem(label=label, count=b["count"], points_each=b["points_each"], total=b["total"])
        for label, b in data["breakdown"].items()
    ]
    return MemberPointsOut(
        member_id=member_id,
        member_name=data["name"],
        member_initials=initials,
        total_points=data["total"],
        breakdown=breakdown,
    )
