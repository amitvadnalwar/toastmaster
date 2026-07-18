import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin_members, club, email, feedbacks, guests, meetings, members, onboarding, posts, roles, votes

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        traces_sample_rate=1.0,
    )

app = FastAPI(title="Toastmasters API", version="1.0.0", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
app.include_router(meetings.router, prefix="/meetings", tags=["meetings"])
app.include_router(roles.router, prefix="/roles", tags=["roles"])
app.include_router(votes.router, prefix="/votes", tags=["votes"])
app.include_router(feedbacks.router, prefix="/feedbacks", tags=["feedbacks"])
app.include_router(email.router, prefix="/email", tags=["email"])
app.include_router(posts.router, prefix="/posts", tags=["posts"])
app.include_router(members.router, prefix="/members", tags=["members"])
app.include_router(club.router, prefix="/club", tags=["club"])
app.include_router(admin_members.router, prefix="/admin/members", tags=["admin-members"])
app.include_router(guests.router, prefix="/guests", tags=["guests"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
