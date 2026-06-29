# Product Roadmap — Toastmasters App

**Version:** 1.0  
**Date:** 2026-06-23  

---

## Philosophy

Start with the minimum that delivers real value on meeting day. Add intelligence and automation after the core loop is proven. Never build for hypothetical future users before the current users' needs are fully served.

---

## Phase 1 — Core Meeting Loop (Current Scope)

**Target users:** 0–100 (single club, single meeting type)  
**Goal:** Replace paper ballots, email chains, and manual WhatsApp coordination with a mobile-native flow.

### Deliverables

| Feature | Priority | Notes |
|---------|----------|-------|
| QR code → Welcome Screen onboarding | P0 | Per-meeting QR with `meeting_id` in URL |
| Guest registration (name, phone, source) | P0 | Record written to members table with `is_guest=true`; 4-hour guest JWT |
| Member + admin auth via Supabase Auth | P0 | Shared login screen; role-based routing via `app_role` |
| Birthday collection popup (first login only) | P0 | MM/DD only, no year; `birthday_collected` boolean on members |
| Birthday greeting on member dashboard | P0 | Banner shown on meeting day if today = member's birthday |
| Member Dashboard with role-aware sections | P0 | |
| Admin dashboard (via role routing post-login) | P0 | No separate entry point; Supabase Auth JWT session |
| Meeting setup (speakers, roles, evaluator-speaker pairing) | P0 | |
| Real-time voting unlock/close via Supabase Realtime | P0 | `voting_status` enum: not_started → open → closed |
| Voting form (5 categories + overall rating) | P0 | |
| Duplicate vote prevention | P0 | DB unique constraint + API-level check |
| Prepared speech feedback form (evaluators only) | P0 | |
| Feedback editing (evaluator edits own; admin edits any before dispatch) | P0 | Locked once email sent |
| Feedback email dispatch (aggregated, one-click) | P0 | Via Resend |
| Email delivery logging (per speaker, per meeting) | P0 | |
| Guest stay-connected screen (WhatsApp/IG/LinkedIn) | P0 | |
| PR Support: like/share recent club post | P1 | Admin sets active post URL + thumbnail |
| Admin: view vote/feedback counts on dashboard | P1 | Counts only, no voter attribution |

### Success Criteria
- A full meeting cycle (setup → voting → feedback → email dispatch) completes without manual intervention outside the app.
- No more paper ballots or post-meeting email aggregation by a human.

### Phase 1 Cutoff
Do not build: push notifications, meeting history, analytics, AI features, multi-club, in-app chat.

---

## Phase 2 — Member Experience & Club Health

**Target users:** 100–500 (single club, growing membership)  
**Goal:** Give members and admins a richer view of club activity and reduce friction in managing membership.

### Planned Features

| Feature | Rationale |
|---------|-----------|
| Member profile editor (name, phone, bio) | Members want to manage their own data |
| Meeting history & results archive | Members want to see past votes and their feedback history |
| Forgot password / account recovery flow | Skipped in Phase 1; Supabase Auth supports it natively |
| Push notifications (voting open, feedback received) | Eliminate the need for the admin to announce verbally; requires notifications table |
| Scoped admin roles (VP Ed, President, SAA) | Multiple admins exist in Phase 1; Phase 2 adds per-role access scoping (e.g., only VP Ed can dispatch emails) |
| Structured feedback templates | Replace free-text with structured prompts per Toastmasters path |
| Guest → Member conversion flow | After stay-connected, prompt guest to create a full account |
| Social post history | Admin adds posts over time; member can see archive; requires multi-post queries on posts table |
| Attendance tracking | Record who attended each meeting; `meeting_attendees` table |
| Birthday greeting push notification | Phase 1 shows greeting on dashboard; Phase 2 sends a push notification |

---

## Phase 3 — Intelligence & Growth

**Target users:** 500–1000+ (potentially multi-club)  
**Goal:** Leverage meeting data to provide personalized growth insights to speakers and administrators.

### Planned Features

| Feature | Rationale |
|---------|-----------|
| AI speech analysis | Analyze uploaded recordings for pacing, filler words, sentiment |
| Speech transcription | Auto-transcribe uploaded audio/video; tie to feedback |
| Feedback intelligence | Sentiment analysis on evaluator comments; trend detection |
| Speaker growth tracking | Track a member's speech history, vote performance, feedback themes over time |
| Recommendation system | Suggest speech paths, roles, or topics based on history |
| Multi-club support | One app serving multiple clubs with isolated data |
| Club-level analytics dashboard | Meeting health metrics: attendance, vote participation, feedback quality |
| API integrations | Toastmasters International pathways integration |

---

## Architectural Decisions That Unlock Phase 2/3

These decisions should be made in Phase 1 — they cost little now and avoid painful migrations later:

| Decision | Why it matters |
|----------|---------------|
| Include `club_id` on all tables from day one | Multi-club support requires zero schema migration |
| Store votes with `nominee_id` FK (not names) | Vote history and analytics are possible without string matching |
| Separate `meeting_roles` from `meetings`; add `evaluates_member_id` | Flexible role assignments; explicit evaluator-speaker pairing prevents mis-submission |
| Use Supabase Auth for members and admins | Password reset, magic link, OAuth are all free future upgrades; no custom bcrypt infrastructure |
| `app_role` on members (not a separate roles table) | Simple enough for Phase 1; migrate to a roles table in Phase 2 for scoped admin access |
| Email logs per speaker per meeting | Retry logic and audit trail already exist when needed |
| `voting_status` enum on meetings (`not_started/open/closed`) | Distinguishes pre-vote from post-vote state; boolean can't express this |
| `status` enum on meetings (`draft/published/completed`) | Full meeting lifecycle supports history views in Phase 2 |

---

## Risk Register (Roadmap Level)

| Risk | Phase | Mitigation |
|------|-------|------------|
| Admin account compromised | Phase 1 | Revoke by setting `members.app_role = 'member'`; Supabase Auth handles session expiry and password reset |
| Scoped admin permissions needed | Phase 2 | Add `admin_role` field or roles table; VP Ed, President, SAA get different permission sets |
| Supabase Realtime free tier limit (~1000 concurrent) | Phase 1 | Phase 1 club size (< 100) is within free tier; upgrade to Pro before Phase 2 launch |
| Supabase Realtime limits at higher scale | Phase 3 | Evaluate dedicated WebSocket layer or Supabase Pro tier |
| Email deliverability (spam, bounce) | Phase 2 | Configure SPF/DKIM; monitor bounce rates; Resend handles this well by default |
| Guest data privacy (GDPR) | Phase 2 | Add data retention policy; offer guest data deletion endpoint |
| Feedback email dispatch timeout (many speakers) | Phase 2 | Move to async background task (FastAPI BackgroundTasks or Celery) |
| AI cost unpredictability | Phase 3 | Gate AI features behind per-use cost controls; start with cached analysis |
