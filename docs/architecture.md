# Architecture — Toastmasters App (Phase 1)

**Version:** 1.0  
**Date:** 2026-06-23  

---

## 1. System Overview

```
┌────────────────────────────────────────────────────────┐
│                   React Native (Expo)                  │
│           TypeScript · Zustand · React Query           │
│                                                        │
│  Guest Flow  │  Member Dashboard  │  Admin Panel      │
└──────┬───────┴────────┬───────────┴──────┬────────────┘
       │                │                  │
       │         HTTPS / REST              │
       │                │                  │
       ▼                ▼                  ▼
┌──────────────────────────────────────────────────────┐
│                Python FastAPI (Backend)               │
│                                                      │
│  Auth middleware  │  Business logic  │  Aggregation  │
│  Role enforcement │  Email dispatch  │  Validation   │
└──────────────────────────┬───────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────────┐
       │ Supabase │  │ Supabase │  │   Supabase   │
       │   Auth   │  │PostgreSQL│  │   Realtime   │
       └──────────┘  └──────────┘  └──────────────┘
                                          │
                           ┌──────────────┘
                           │  (direct subscription)
                           ▼
                   React Native client
                   (voting unlock event)

                   ┌──────────────┐
                   │ Email Service│
                   │(Resend/SG)   │
                   └──────────────┘
                         ▲
                         │ called by FastAPI
                         │ during feedback dispatch
```

---

## 2. Component Responsibilities

### 2a — React Native (Expo) Frontend

**Role:** All user-facing UI; state management; API calls; Realtime subscriptions.

| Concern | Tool | Notes |
|---------|------|-------|
| Navigation | Expo Router | File-based routing; typed routes |
| Server state | React Query (TanStack) | Fetch, cache, and sync API data |
| Client state | Zustand | Auth session, current meeting context, voting state |
| Auth | Supabase Auth JS client | Token storage in SecureStore |
| Realtime | Supabase JS Realtime | Subscribed to `meetings` channel for voting unlock |
| Forms | React Hook Form + Zod | Validation at the edge |
| Styling | NativeWind (Tailwind for RN) | Or StyleSheet — decide in Phase 1 |

**Key Screens:**
- `Welcome` — QR landing, email/phone input
- `Register` — guest registration form
- `Login` — shared login screen for members and admins; role-based routing on success
- `MemberDashboard` — main member surface (voting, feedback, PR support)
- `AdminDashboard` — meeting overview, voting toggle, send feedbacks (reached via role routing from Login)
- `MeetingSetup` — form to create/edit meeting + role assignment
- `StayConnected` — guest post-vote screen
- `AccessDenied` — shown for unauthorized feedback access

**State Slices (Zustand):**
- `authSlice` — user, session, appRole (`member | admin | null`), isGuest
- `meetingSlice` — currentMeeting, votingStatus (`not_started | open | closed`), myRole
- `voteSlice` — submitted categories (to prevent re-submission on UI level)

---

### 2b — Python FastAPI (Backend)

**Role:** Business logic, authorization enforcement, data orchestration, email dispatch. Does not own auth token issuance (delegated to Supabase Auth) but validates JWTs on every protected route.

**Middleware:**
- JWT validation (Supabase public key)
- Role extraction from JWT custom claims
- Meeting context injection (resolve `meeting_id` from request)

**Routers:**

| Router | Endpoints | Notes |
|--------|-----------|-------|
| `/onboarding` | `POST /lookup`, `POST /register` | Guest entry point; lookup resolves member or guest |
| `/meetings` | `GET /current`, `POST /`, `PUT /:id`, `PUT /:id/status`, `PUT /:id/voting` | Meeting lifecycle; `/voting` sets voting_status |
| `/roles` | `GET /:meeting_id`, `POST /`, `DELETE /:id` | Role assignments |
| `/votes` | `POST /`, `GET /summary/:meeting_id` | Vote submission + count summary (no voter attribution) |
| `/feedbacks` | `POST /`, `GET /:meeting_id`, `PUT /:id` | Feedback submission, listing, editing |
| `/email` | `POST /dispatch/:meeting_id` | Trigger feedback email batch |
| `/posts` | `GET /active/:club_id`, `POST /`, `PUT /:id` | Active post for PR support; admin creates/deactivates |
| `/members` | `GET /me`, `PUT /birthday` | Profile reads and birthday update |
| `/club` | `PUT /social-links` | Admin updates instagram/linkedin/whatsapp URLs |

> **`POST /auth/admin/login` removed.** Admin auth now flows through Supabase Auth (same as members). FastAPI validates the Supabase JWT on every request and reads `app_role` from the JWT custom claim to enforce admin-only routes.

**Business Logic Responsibilities:**
- Enforce evaluator-only access to feedback submission
- Aggregate feedback by speaker before email dispatch
- Idempotency check on email dispatch (read email_logs before sending)
- Validate voting is open before accepting votes
- Enforce one vote per category per user per meeting (beyond the DB constraint)

---

### 2c — Supabase (Infrastructure)

#### Auth
- Member registration and login via Supabase Auth (email + password)
- JWT issued by Supabase; validated by FastAPI middleware
- Guest users are **not** Supabase Auth users — they receive a short-lived custom JWT from FastAPI
- Admin users receive a custom JWT with `role: admin` claim after password verification

#### PostgreSQL
- Primary data store for all entities (see data model in PRD)
- Row-Level Security (RLS) enabled on all tables
- RLS policies align with the permissions matrix in the PRD
- Direct client access from FastAPI via `supabase-py` or `asyncpg`

**Key RLS Policies:**
- `votes`: insert allowed if `voter_id = auth.uid()` and `voting_status = 'open'` on the meeting
- `feedbacks`: insert/update allowed if caller has `evaluator` role in meeting_roles for this meeting AND the speaker's email_log is not `sent`; admin can insert/update any feedback with same lock condition
- `meetings`: update allowed only for members with `app_role = 'admin'`
- `members`: select own record; admin selects all in same club

#### Realtime
- FastAPI sets `voting_open = true` via a database update
- Supabase Realtime broadcasts the change to all subscribed clients on the `meetings:{meeting_id}` channel
- Mobile clients subscribe on dashboard mount; unsubscribe on unmount
- No custom WebSocket server needed in Phase 1

#### Storage
- Not used in Phase 1
- Reserved for Phase 3 speech recording uploads

---

### 2d — Email Service

- Recommended: **Resend** (simple API, great deliverability, generous free tier) or SendGrid
- Called exclusively from the FastAPI `/email/dispatch/:meeting_id` endpoint
- Template: plain-text email per speaker with aggregated evaluator comments
- Email logs updated in Supabase after each send attempt

---

## 3. Authentication Architecture

```
Member / Admin Flow (shared):
  App → Login screen → Supabase Auth (email + password)
      → Supabase issues JWT with custom claim { app_role: 'member' | 'admin' }
      → FastAPI validates JWT on every request; reads app_role for route enforcement
      → App reads app_role from JWT → routes to MemberDashboard or AdminDashboard

Guest Flow:
  App → FastAPI /onboarding/lookup → not found → /register
      → FastAPI issues short-lived guest JWT (4 hours) with { sub: guest_id, role: 'guest', meeting_id }
      → App stores guest JWT in memory only (not SecureStore; guests have no persistent session)
      → Guest JWT expires at the end of the meeting window; guest cannot resume session after app close
```

**JWT Claims Structure:**

*Supabase Auth JWT (members and admins):*
```json
{
  "sub": "<auth_user_id>",
  "app_role": "member | admin",
  "club_id": "<uuid>",
  "exp": "<unix timestamp>"
}
```

*FastAPI guest JWT:*
```json
{
  "sub": "<member_id>",
  "role": "guest",
  "club_id": "<uuid>",
  "meeting_id": "<uuid>",
  "exp": "<unix timestamp — 4 hours from issue>"
}
```

> `sub` for admin is now `auth_user_id` (not `club_id`). Admin is a member in the database, not a club-level entity.

---

## 4. Real-Time Architecture

### Voting Unlock Sequence

```
Admin App                FastAPI               Supabase DB          Realtime
   │                        │                      │                    │
   │── PUT /meetings/:id ──▶│                      │                    │
   │   { voting_open: true }│                      │                    │
   │                        │── UPDATE meetings ──▶│                    │
   │                        │   SET voting_open=true│                    │
   │                        │                      │── CDC event ──────▶│
   │                        │                      │                    │── broadcast ──▶ all
   │                        │                      │                    │                 subscribed
   │                        │                      │                    │                 clients
   │◀── 200 OK ─────────────│                      │                    │
```

### Client Subscription (React Native)
```typescript
// On MemberDashboard mount
const channel = supabase
  .channel(`meetings:${meetingId}`)   // channel name must match server-side convention
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'meetings',
    filter: `id=eq.${meetingId}`,
  }, (payload) => {
    setVotingStatus(payload.new.voting_status); // 'not_started' | 'open' | 'closed'
  })
  .subscribe();
```

---

## 5. Data Flow — Feedback Email Dispatch

```
Admin clicks "Send Feedbacks"
         │
         ▼
POST /email/dispatch/:meeting_id
         │
         ▼
1. Query feedbacks WHERE meeting_id = :id
2. Group by speaker_id
3. For each speaker:
   a. Check email_logs: status = 'sent' → skip
   b. Fetch speaker.email FROM users
   c. Build email body (speaker name, evaluator name, comment, timestamp)
   d. POST to Email Service API
   e. UPDATE email_logs SET status = 'sent' | 'failed'
4. Return summary: { sent: N, failed: M, skipped: K }
```

---

## 6. API Design Principles

- **REST** over HTTP/JSON for all mobile ↔ backend communication
- All responses follow a consistent envelope: `{ data, error, meta }`
- HTTP status codes used semantically (200, 201, 400, 401, 403, 404, 409, 500)
- `409 Conflict` for duplicate vote attempts
- `403 Forbidden` for role-based access violations (non-evaluator submitting feedback)
- Pagination on list endpoints: `?limit=&offset=` or cursor-based
- All timestamps in ISO 8601 UTC
- No business logic in the database (triggers, stored procedures) — logic lives in FastAPI

---

## 7. Directory Structure (Planned)

```
toastmasters-app/
├── mobile/                    # Expo React Native app
│   ├── app/                   # Expo Router screens
│   │   ├── (auth)/            # Login, Register
│   │   ├── (guest)/           # QR welcome, registration, stay-connected
│   │   ├── (member)/          # Dashboard, voting, feedback
│   │   └── (admin)/           # Admin panel, meeting setup, dashboard
│   ├── components/            # Shared UI components
│   ├── store/                 # Zustand slices
│   ├── hooks/                 # Custom React Query hooks
│   ├── services/              # API client functions (typed)
│   ├── lib/                   # Supabase client, config
│   └── types/                 # Shared TypeScript types
│
├── backend/                   # Python FastAPI app
│   ├── app/
│   │   ├── routers/           # One file per domain (auth, meetings, votes…)
│   │   ├── models/            # Pydantic request/response models
│   │   ├── services/          # Business logic (email, aggregation)
│   │   ├── db/                # Supabase client, query helpers
│   │   ├── middleware/         # JWT validation, role enforcement
│   │   └── main.py            # App factory, router registration
│   ├── tests/                 # pytest tests (unit + integration)
│   └── pyproject.toml
│
├── docs/                      # This documentation
├── .claude/                   # Claude Code configuration
└── SKILLS.md
```

---

## 8. Non-Functional Requirements

| Concern | Requirement | Approach |
|---------|-------------|---------|
| Latency | Voting unlock < 3s for all clients | Supabase Realtime; test at 50 concurrent sessions |
| Availability | Meeting-day uptime 99.9% | Supabase managed infra; no self-hosted dependencies |
| Security | JWT on every API call | FastAPI dependency injection; no unauthenticated endpoints except `/onboarding/lookup` |
| Data integrity | No duplicate votes | Unique DB constraint + API-level check |
| Email reliability | No missed feedback emails | Idempotency key; retry on failure; status surfaced to admin |
| Scalability | Support 1000 concurrent meeting sessions | Supabase Realtime supports this at Pro tier |
| Observability | API errors logged | FastAPI structured logging; Supabase logs; Sentry recommended |

---

## 9. Security Considerations

- **Admin authentication:** Handled entirely by Supabase Auth (email + password). No club-level password exists. Admin identity is the `app_role = 'admin'` claim in the JWT, set server-side when the member record is created. Revoking admin: flip `members.app_role` to `member`; existing JWT expires on Supabase's schedule.
- **JWT secret:** Supabase-managed (asymmetric RS256). FastAPI validates with the Supabase public key.
- **Guest JWT:** FastAPI-issued, short-lived (4 hours); signed with a separate HMAC secret. Contains only `sub`, `role: guest`, `club_id`, `meeting_id`.
- **RLS:** All Supabase tables have RLS enabled. No table is publicly readable without a valid JWT.
- **Feedback access control:** Enforced at both API level (FastAPI checks `app_role` and `meeting_roles.role`) and DB level (RLS policy).
- **Vote tampering:** Votes written server-side after JWT validation; client cannot manipulate `voter_id`.
- **Email enumeration:** The `/onboarding/lookup` endpoint returns the same response shape regardless of whether the email exists (to prevent user enumeration by guests).
- **Feedback edit lock:** Server enforces — edit requests are rejected if the speaker's `email_logs.status = 'sent'`.

---

## 10. Phase 2 / Phase 3 Architectural Considerations

| Future need | Phase 1 design decision that enables it |
|-------------|----------------------------------------|
| Multi-club | `club_id` on all tables from day one |
| Push notifications | Supabase Auth device tokens; add in Phase 2 without schema change |
| AI speech analysis | Supabase Storage already provisioned; upload endpoint added in Phase 3 |
| Feedback analytics | `feedbacks` table structure supports aggregation queries |
| Role-based admin | Admin JWT custom claim `role: admin` is already structured for RBAC |
| Meeting history | `meetings.status` enum already supports `completed` state |
