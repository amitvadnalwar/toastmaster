from fastapi import HTTPException, status

from app.models.guest import GuestRegisterIn, GuestRegisterOut


async def register_guest(body: GuestRegisterIn) -> GuestRegisterOut:
    from app.db import guests as db

    club_id = await db.get_meeting_club_id(str(body.meeting_id))
    if not club_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    phone = body.phone.strip() if body.phone else None
    row = await db.insert_guest(
        club_id=club_id,
        meeting_id=str(body.meeting_id),
        name=body.name.strip(),
        phone=phone or None,
        source=body.source,
    )
    return GuestRegisterOut(id=row["id"], name=row["name"])
