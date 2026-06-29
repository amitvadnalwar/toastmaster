# SKILLS.md — Toastmasters App

This file documents the app's core capabilities, development workflows, and key technical patterns. It is the developer onboarding reference.

---

## App Capabilities (Phase 1)

| Capability | Mobile Surface | Backend Endpoint | Supabase Table(s) |
|-----------|---------------|-----------------|-------------------|
| QR → email lookup | `app/join.tsx` | `POST /onboarding/lookup` | `members` |
| Guest registration | `app/(guest)/register.tsx` | `POST /onboarding/register` | `members` |
| Member/admin login | `app/(auth)/login.tsx` | Supabase Auth direct | `auth.users`, `members` |
| Birthday collection | Modal on member dashboard | `PUT /members/birthday` | `members` (birthday + birthday_collected) |
| View current meeting | Member/Admin dashboard | `GET /meetings/current` | `meetings`, `meeting_roles` |
| Real-time voting unlock | Member dashboard (Realtime) | `PUT /meetings/:id/voting` | `meetings.voting_status` |
| Submit vote | Voting form | `POST /votes` | `votes`, `meeting_ratings` |
| Submit speech feedback | Feedback form | `POST /feedbacks` | `feedbacks` |
| Edit feedback | Feedback form | `PUT /feedbacks/:id` | `feedbacks` |
| Create meeting | `app/(admin)/meeting/new.tsx` | `POST /meetings` | `meetings` |
| Assign roles | `app/(admin)/meeting/[id].tsx` | `POST /roles` | `meeting_roles` |
| Send feedback emails | Admin dashboard | `POST /email/dispatch/:meeting_id` | `feedbacks`, `email_logs` |
| View recent club post | Member dashboard | `GET /posts/active/:club_id` | `posts` |
| Update social links | Admin (club settings) | `PUT /club/social-links` | `clubs` |

---

## Development Setup

### Prerequisites
- Node.js 20+
- Python 3.12+
- Expo CLI (`npm install -g expo`)
- Supabase CLI (`npm install -g supabase`)
- An active Supabase project (or local Supabase via Docker)

### Mobile (Expo)
```bash
cd mobile
npm install
cp .env.example .env        # fill in Supabase URL + anon key + API base URL
npx expo start              # starts Expo dev server
npx expo start --ios        # iOS simulator
npx expo start --android    # Android emulator
```

### Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env        # fill in Supabase + email service keys
uvicorn app.main:app --reload --port 8000
```

### Local Supabase
```bash
supabase start              # starts local Supabase stack
supabase db reset           # resets DB and runs all migrations + seed.sql
supabase status             # shows local URLs and keys
```

---

## Key Development Patterns

### Adding a New API Endpoint (Backend)

1. Define Pydantic models in `backend/app/models/<domain>.py`
2. Add business logic in `backend/app/services/<domain>.py`
3. Add DB queries in `backend/app/db/<domain>.py`
4. Register the route in `backend/app/routers/<domain>.py`
5. Add the router to `backend/app/main.py`
6. Write tests in `backend/tests/test_<domain>.py`

### Adding a New Screen (Mobile)

1. Create the screen file in `mobile/app/<group>/<screen>.tsx`
2. If the screen needs data, add a React Query hook in `mobile/hooks/use<Domain>.ts`
3. Add the typed API call in `mobile/services/<domain>.ts`
4. If the screen needs client-side state, add a Zustand slice in `mobile/store/<domain>Slice.ts`
5. Add any new types to `mobile/types/`

### Adding a Database Migration

1. Create a new file in `supabase/migrations/<timestamp>_<description>.sql`
2. Include: table/column creation, RLS policies, indexes
3. Run locally: `supabase db reset`
4. Never modify existing migration files — create new ones

---

## Real-Time Voting Unlock — How It Works

1. Admin calls `PUT /meetings/:id/voting` with `{ "voting_status": "open" }`
2. FastAPI updates `meetings.voting_status = 'open'` in Supabase
3. Supabase Realtime detects the row change via CDC
4. All mobile clients subscribed to `meetings:{id}` receive a `postgres_changes` event
5. The `meetingSlice` Zustand store updates `votingStatus: 'open'`
6. The voting section React component re-renders (locked → unlocked)

Subscription is set up in the `useMeetingRealtime` hook, called from `MemberDashboard`.

---

## Feedback Email Dispatch — How It Works

1. Admin clicks "Send Feedbacks" → calls `POST /email/dispatch/:meeting_id`
2. FastAPI fetches all `feedbacks` rows for this meeting
3. Groups by `speaker_id`
4. For each speaker:
   - Checks `email_logs` — skips if `status = 'sent'`
   - Builds email body with evaluator names and comments
   - Calls Resend API (up to 3 retries on failure)
   - Writes result to `email_logs`
5. Returns `{ sent: N, failed: M, skipped: K }` to admin dashboard

Editing a feedback is **locked** once its speaker's `email_logs.status = 'sent'`.

---

## Role Enforcement — Quick Reference

Every protected FastAPI route uses the `get_current_user` dependency, which:
1. Reads `Authorization: Bearer <token>` header
2. Tries to validate against Supabase JWT secret (members/admins), then guest JWT secret
3. Extracts `sub` (user id), `app_role`, `club_id`, `meeting_id` from claims
4. Returns a `CurrentUser` Pydantic model

Role-specific guards:
- `require_admin` — raises 403 if `app_role != 'admin'`
- `require_member` — raises 403 if is_guest or app_role is None
- `require_evaluator(meeting_id)` — queries `meeting_roles` to confirm the user is an evaluator (implemented in feedback_service)
- Voting open check — `vote_service` raises 403 if `meetings.voting_status != 'open'`

---

## Supabase RLS Policy Summary

| Table | Read | Insert | Update | Delete |
|-------|------|--------|--------|--------|
| `meetings` | member/guest (own club) | admin | admin | admin |
| `meeting_roles` | member (own club) | admin | admin | admin |
| `votes` | admin | voter (own vote, voting_status=open) | — | — |
| `feedbacks` | admin, evaluator (own), speaker (own after dispatch) | evaluator only | evaluator (own, not sent), admin | — |
| `members` | own row, admin | system | own row, admin | admin |
| `email_logs` | admin | system | system | — |
| `posts` | all authenticated | admin | admin | admin |
| `clubs` | all authenticated | — | admin | — |

---

## Supabase Table Enum Types

```sql
CREATE TYPE app_role AS ENUM ('member', 'admin');
CREATE TYPE meeting_status AS ENUM ('draft', 'published', 'completed');
CREATE TYPE voting_status AS ENUM ('not_started', 'open', 'closed');
CREATE TYPE meeting_role AS ENUM (
  'speaker', 'evaluator', 'table_topics_master',
  'table_topics_speaker', 'supporting_role'
);
CREATE TYPE vote_category AS ENUM (
  'best_speaker', 'best_supporting_role', 'best_table_topics_master',
  'best_evaluator', 'best_table_topic'
);
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE post_platform AS ENUM ('instagram', 'linkedin');
```

---

## Environment Checklist (Before First Run)

- [ ] Supabase project created (or local stack running)
- [ ] `EXPO_PUBLIC_SUPABASE_URL` set in `mobile/.env`
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` set in `mobile/.env`
- [ ] `EXPO_PUBLIC_API_BASE_URL` set in `mobile/.env` (FastAPI URL)
- [ ] `SUPABASE_URL` set in `backend/.env`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in `backend/.env`
- [ ] `SUPABASE_JWT_SECRET` set in `backend/.env`
- [ ] `GUEST_JWT_SECRET` set in `backend/.env`
- [ ] `EMAIL_API_KEY` set in `backend/.env` (Resend API key)
- [ ] `EMAIL_FROM_ADDRESS` set in `backend/.env`
- [ ] Database migrations applied (`supabase db reset`)
- [ ] At least one club record seeded in `clubs` table
- [ ] At least one admin member seeded (with matching Supabase Auth user)
