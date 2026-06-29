
# Product Requirements Document — Toastmasters App (Phase 1)

**Version:** 1.0  
**Date:** 2026-06-23  
**Status:** Draft  

---

## 1. Product Overview

A mobile-first companion app for a Toastmasters club that streamlines the meeting-day experience: guest discovery via QR code, member authentication, real-time voting, structured speech feedback, and automated feedback email delivery.

**Core problem it solves:**  
Meeting-day administration (paper ballots, manual feedback collection, email aggregation) is manual, error-prone, and slow. This app automates the entire meeting-day loop from check-in to post-meeting feedback dispatch.

---

## 2. Goals (Phase 1)

| Goal | Metric |
|------|--------|
| Enable frictionless guest discovery | Guest can complete QR → stay-connected flow in < 2 minutes |
| Streamline real-time voting | All members see voting unlock within 3 seconds of admin toggle |
| Collect structured speech feedback | Evaluators submit feedback without paper or email |
| Automate feedback email dispatch | Feedback reaches all speakers in one admin click |
| Drive club social engagement | Members can like/share recent club post from within the app |

---

## 3. Non-Goals (Phase 1)

- AI speech analysis or transcription
- In-app audio/video recording
- Multi-club support (data model will accommodate it, UI will not expose it)
- Push notifications
- In-app messaging between members
- Payment or membership fee processing
- Public profile pages
- Meeting history / analytics dashboard
- Offline mode

---

## 4. User Personas

### Guest
A first-time visitor attending a Toastmasters meeting. Arrives without an account, discovers the club via a QR code at the venue. Participates in voting if present during that segment. Exits via the stay-connected screen (WhatsApp/Instagram/LinkedIn). May convert to a paying member later.

**Key needs:** Zero-friction entry, no forced account creation, clear next step after the meeting.

### Member
A registered Toastmasters club member who attends meetings regularly. May hold a meeting role (Speaker, Evaluator, Table Topics Master, Supporting Role). Votes each meeting, submits feedback when designated as an evaluator, and engages with club social media.

**Key needs:** Fast login, clear meeting-day UI, role-aware access to feedback form, one-tap voting.

### Admin
A club officer (VP Education, President, SAA, or any member granted admin access by the Super Admin) who manages the meeting lifecycle. Sets up meeting rosters, controls the voting window, and dispatches feedback emails after the meeting.

**Key needs:** Reliable meeting setup, real-time control over voting, one-click feedback dispatch with confidence that all speakers received their feedback.

### Super Admin
The highest-privilege user in the app. Has all Admin capabilities plus the ability to manage every member's **club role** (organizational title) and **app role** (app access level). Typically the club President or the person who sets up the app. Created via direct database seed on first deployment; subsequent super admins are promoted by an existing super admin.

**Key needs:** Ability to assign officer titles to members, grant or revoke admin access, and maintain accurate club membership records.

---

## 5. Functional Requirements

### F1 — QR Onboarding

- When admin creates a meeting, the system generates a unique QR code embedding the `meeting_id` in the URL (e.g. `https://<host>/join?meeting_id=<uuid>`).
- The QR code is displayed on the Admin Dashboard and is specific to that meeting.
- Guests scan the QR code at the venue; scanning opens the onboarding flow in the mobile browser or native app.
- The `meeting_id` is carried through the entire onboarding session so that all downstream actions (guest record, votes, session token) are bound to the correct meeting.
- The landing page is a **Welcome Screen** identifying the Toastmasters club.
- User is prompted to enter their **email address or phone number**.
- System performs a **database lookup** to determine identity:
  - **Known identity** → directed to Login/Signup
  - **Unknown identity** → directed to Registration

**Decision (2026-06-23):** QR code is per-meeting (not per-club). The `meeting_id` is embedded in the QR URL. Admin generates the QR as part of meeting creation in F6a.

---

### F2 — Guest Registration

- Displayed when the email/phone is not found in the database.
- Form collects:
  - Full name
  - Phone number (if email was entry point, and vice versa) — collected but not verified in Phase 1
  - Source ("How did you hear about us?") — hardcoded dropdown: `Friend | Social Media | Website | Walk-in | Other`
- On submit: write a record to the **members table** with `is_guest = true` and `app_role = null` (no Supabase Auth account created).
- Guest is given a short-lived JWT (4 hours) issued by FastAPI, scoped to the current meeting via `meeting_id` claim. Stored in memory only — not persisted to SecureStore.

**Note:** There is no separate `guests` table. Guests are rows in `members` distinguished by `is_guest = true`.

---

### F3 — Authentication & Role-Based Routing

- All users (members and admins) authenticate through the **same login screen**.
- Auth via Supabase Auth (email+password or magic link — to be decided).
- On successful login, the system reads `members.app_role` for the authenticated user:
  - `app_role = 'admin'` → routed to **Admin Dashboard**
  - `app_role = 'member'` → routed to **Member Dashboard**
- There is no separate admin entry point or club-wide password. Admin identity is determined by the role stored in the database.

---

### F4 — Birthday Collection (First-Login Gate)

- On first load of the Member Dashboard, check `members.birthday_collected` for the current member.
- If `false`: show Birthday Popup modal.
  - Form: month (MM) and day (DD) only — no birth year collected.
  - On save: in a single UPDATE, set `members.birthday = 'MM-DD'` and `members.birthday_collected = true`.
- If `true`: skip modal, proceed to Member Dashboard Main View.

**Birthday Greeting:** On every Member Dashboard load, compare today's date (MM-DD) against `members.birthday`. If they match, display a birthday greeting banner/message at the top of the dashboard.

**Constraint:** Birthday year is intentionally not collected — privacy-by-design.

---

### F5 — Member Dashboard

The primary surface for logged-in members. Contains three sections:

#### 5a — Meeting Info
- Display current meeting title, date, and roles roster.

#### 5b — PR Support Section
- Display the most recent club social media post (URL + thumbnail).
- **Like Button**: deep-links to the post on the platform.
- **Share Button**: triggers the native OS share sheet with the post URL.

#### 5c — Voting Section
- Locked by default. Shows a locked state UI until admin opens voting.
- See F7 for unlock behavior.

#### 5d — Prepared Speech Feedback Section
- Only renders for members designated as a Prepared Speech Evaluator in the current meeting.
- See F8 for details.

---

### F6 — Admin Panel

- Accessible only to users with `members.app_role = 'admin'`.
- Admin logs in via the standard login screen (F3); role-based routing redirects them here automatically.
- All admin routes are protected server-side: any request to an admin endpoint from a non-admin session returns 403.
- The admin session lifetime follows the standard Supabase Auth session (JWT expiry).

#### 6a — Meeting Setup
- Admin creates a meeting with: title, date, schedule (agenda).
- **Find Speakers**: search or select from members list to assign prepared speakers.
- **Assign Roles**: assign each member a role from the enum:
  - `speaker` (prepared speech)
  - `evaluator` (evaluates a prepared speaker)
  - `table_topics_master`
  - `table_topics_speaker`
  - `supporting_role` (Grammarian, Timer, Ah-Counter, etc.)
- **Set Schedule**: order of the agenda.
- Save → writes to **meetings table** and **meeting_roles table**.

#### 6b — Admin Dashboard
- Overview of the current meeting: speakers, roles, vote status.
- **Open Voting Toggle**: see F7.
- **Send Feedbacks Button**: see F9.

---

### F7 — Real-Time Voting

#### Voting State
`meetings.voting_status` (enum: `not_started | open | closed`, default `not_started`). This replaces a simple boolean because `false` cannot distinguish "not yet opened" from "closed after voting ended."

#### Unlock
1. Admin clicks **Open Voting** on Admin Dashboard.
2. System sets `meetings.voting_status = 'open'`.
3. Supabase Realtime broadcasts the change to **all active sessions** subscribed to the meeting channel.
4. Member and guest dashboards transition from locked → unlocked state in real time.

#### Close Voting
1. Admin clicks **Close Voting** on Admin Dashboard (same toggle, now showing "close").
2. System sets `meetings.voting_status = 'closed'`.
3. Supabase Realtime broadcasts; member and guest dashboards transition to a "voting closed" state — distinct from the pre-open "locked" state.
4. No new votes are accepted once `voting_status = 'closed'`.

#### Voting Form
Members and guests vote across five categories:

| Category | Votes For |
|----------|-----------|
| Best Speaker | Prepared speech speaker |
| Best Supporting Role | Member in a supporting role |
| Best Table Topics Master | Member who ran table topics |
| Best Evaluator | Prepared speech evaluator |
| Best Table Topic | Individual who delivered the best table topic |

- Plus an **Overall Meeting Rating** (1–5 stars).
- Each voter may cast exactly one vote per category per meeting.
- Duplicate vote prevention: unique constraint on `(meeting_id, voter_id, category)`.

#### Vote Recording
- Votes write to **votes table**: `(meeting_id, voter_id, category, nominee_id, created_at)`.
- Meeting rating writes to **meeting_ratings table**.

#### Post-Vote Flow
- **Guest**: directed to Stay Connected Screen (F10).
- **Member**: remains logged in; directed back to Member Dashboard.

#### Vote Anonymity
- Voting is anonymous. `voter_id` is stored solely to enforce the duplicate-vote unique constraint.
- Vote results (tallies, winners) are never displayed with voter attribution to any user including admin.

---

### F8 — Prepared Speech Feedback

- Only accessible to members whose `meeting_roles.role = 'evaluator'` for the current meeting.
- Non-evaluators who attempt access see an **Access Denied** message.

**Feedback Form fields:**
- Speaker Select (dropdown of prepared speakers in this meeting)
- Language/Content Comment (free text)
- Submit button

On submit: write to **feedbacks table** with `(meeting_id, speaker_id, evaluator_id, comment, created_at, updated_at)`.

**Editing:** Both the evaluator who submitted the feedback and any admin can edit a feedback record before the admin triggers email dispatch (F9). Once the corresponding `email_logs` record for that speaker reaches `status = 'sent'`, editing for that feedback is locked. Evaluators can only edit their own submission; admins can edit any.

**Ambiguity to resolve:** The flowchart labels this section "Only Prepared Speech Speakers" but the form logic (speaker select + evaluator submitting) suggests this is for evaluators. Confirm with stakeholders: is the intent that evaluators submit feedback, or that speakers view their own feedback?

---

### F9 — Admin Feedback Email Dispatch

1. Admin clicks **Send Feedbacks** on the Admin Dashboard.
2. System reads all records from **feedbacks table** for the current meeting.
3. Groups feedback by `speaker_id`.
4. For each speaker:
   - Aggregates evaluator comments.
   - Formats email body: speaker name, evaluator name(s), comments, timestamp.
   - Sends via **Email Service API**.
   - Writes result to **email_logs table** (`status: sent | failed`).
5. Admin dashboard reflects send status for each speaker.

**Constraint:** Feedback emails must be idempotent — re-triggering the send should not create duplicate emails for speakers who already received theirs.

---

### F10 — Guest Stay Connected

- Shown after a guest completes voting.
- Displays three action links:
  - Instagram profile
  - LinkedIn page
  - WhatsApp group invite link
- WhatsApp link is fetched from the club configuration (stored in the clubs table).
- After user taps any link, they are considered "flow complete."

---

### F11 — Social Engagement (PR Support)

- The most recent club post URL is stored in the **posts table** (manually entered by admin or fetched from a social platform).
- Member dashboard renders a preview card for this post.
- **Like**: opens the post URL in an external browser.
- **Share**: invokes the native share sheet with the URL.

---

### F12 — Super Admin Role Management

Accessible only to users with `members.app_role = 'super_admin'`. Exposed as a **Members** section within the Admin Dashboard.

#### 12a — View All Members
- Super admin sees a list of all members in the club (not guests).
- List shows: name, email, `club_role`, `app_role`.

#### 12b — Assign Club Role
- Super admin selects a member and sets their `club_role` from the defined enum.
- Default for all newly registered members is `club_role = 'member'`.
- Guests always have `club_role = 'guest'` and cannot be reassigned.
- Club roles are organizational titles only — they do not change what the member can do in the app.

#### 12c — Assign App Role (Access Level)
- Super admin can set `app_role` to `member`, `admin`, or `super_admin` for any member.
  - `member` → accesses Member Dashboard only
  - `admin` → accesses Admin Dashboard (meetings, voting, feedback)
  - `super_admin` → Admin Dashboard + Member management section
- A super admin cannot downgrade their own `app_role` (prevents accidental self-lockout).
- At least one `super_admin` must exist at all times (enforced in the service layer).

**First super admin:** Created via `supabase/seed.sql` on initial deployment. All subsequent super admins are promoted by an existing super admin through the app.

---

## 6. Roles and Permissions Matrix

| Action | Guest | Member | Evaluator | Admin | Super Admin |
|--------|:-----:|:------:|:---------:|:-----:|:-----------:|
| QR scan → enter email | ✓ | ✓ | ✓ | ✓ | ✓ |
| Guest registration | ✓ | — | — | — | — |
| Login (shared screen) | — | ✓ | ✓ | ✓ | ✓ |
| Routed to Member Dashboard post-login | — | ✓ | ✓ | — | — |
| Routed to Admin Dashboard post-login | — | — | — | ✓ | ✓ |
| View meeting roster | — | ✓ | ✓ | ✓ | ✓ |
| Vote (when voting_status = 'open') | ✓ | ✓ | ✓ | — | — |
| Submit prepared speech feedback | — | — | ✓ | — | — |
| Edit own submitted feedback (before dispatch) | — | — | ✓ | — | — |
| Edit any feedback (before dispatch) | — | — | — | ✓ | ✓ |
| View own submitted feedback | — | — | ✓ | — | — |
| View all feedback submissions | — | — | — | ✓ | ✓ |
| View vote tallies (counts, not voters) | — | — | — | ✓ | ✓ |
| Like / share club post | — | ✓ | ✓ | — | — |
| See stay-connected screen | ✓ | — | — | — | — |
| Access admin panel | — | — | — | ✓ | ✓ |
| Create / edit meetings | — | — | — | ✓ | ✓ |
| Publish meeting (draft → published) | — | — | — | ✓ | ✓ |
| Mark meeting complete | — | — | — | ✓ | ✓ |
| Assign meeting roles | — | — | — | ✓ | ✓ |
| Open / close voting | — | — | — | ✓ | ✓ |
| Send feedback emails | — | — | — | ✓ | ✓ |
| Add / update club post URL | — | — | — | ✓ | ✓ |
| Update club social links | — | — | — | ✓ | ✓ |
| View all club members | — | — | — | — | ✓ |
| Assign club role (organizational title) | — | — | — | — | ✓ |
| Grant / revoke admin access (`app_role`) | — | — | — | — | ✓ |
| Promote member to super admin | — | — | — | — | ✓ |

*Evaluator is a Member with the `evaluator` meeting-role assigned in the current meeting.*  
*Admin is a Member with `app_role = 'admin'` — has full meeting management but cannot manage member roles.*  
*Super Admin is a Member with `app_role = 'super_admin'` — inherits all Admin permissions and can manage member club roles and app access.*  
*Admins and Super Admins cannot vote — their role is operational, not participatory.*

---

## 7. Data Entities and Relationships

### Core Entities

> **Note on `users` table:** A custom `users` table is NOT defined here. Supabase Auth manages user identity in its own `auth.users` table (not directly accessible). The `members` table's `auth_user_id` field is a FK to `auth.users.id`. Guests have no `auth.users` record and thus `auth_user_id = null`.

**members** — single table for all human participants (members, admins, guests)
- `id` (uuid, PK)
- `auth_user_id` (uuid, FK → auth.users, nullable) — null for guests; populated for members and admins
- `club_id` (uuid, FK → clubs)
- `email` (text, unique, not null)
- `phone` (text, nullable)
- `name` (text, not null)
- `birthday` (text, MM-DD format, nullable)
- `birthday_collected` (boolean, default false)
- `source` (text, nullable) — acquisition channel; only meaningful for guests
- `is_guest` (boolean, default false)
- `app_role` (enum: `member | admin | super_admin`, nullable) — null for guests; determines post-login routing and access level
- `club_role` (enum: `member | guest | president | vp_education | vp_membership | vp_pr | secretary | treasurer | saa`, default `member`) — organizational title within the club; informational only, does not affect app permissions. Guests always have `club_role = 'guest'`.
- `created_at` (timestamptz)

**`app_role` vs `club_role` — key distinction:**
- `app_role` controls what screens and actions a person can access in the app. Set by super admin.
- `club_role` is the member's official Toastmasters officer title (President, SAA, etc.). It is a display label and does not grant any additional app permissions on its own.
- A member can be `club_role = 'president'` and `app_role = 'member'` (display only, no extra access), or `app_role = 'super_admin'` (full access). These are independent.

> **Overengineering flag — `notifications` table:** The original design used a separate `notifications` table with a `birthday_collected` row per member. This is replaced by `members.birthday_collected` (boolean) — simpler to query, updated atomically in the same UPDATE as the birthday save. The `notifications` table should only be introduced in Phase 2 when push notification infrastructure is added.

**clubs**
- `id` (uuid, PK)
- `name` (text)
- `instagram_url` (text, nullable)
- `linkedin_url` (text, nullable)
- `whatsapp_invite_url` (text, nullable)

> `admin_password_hash` removed — admin authentication is now handled by Supabase Auth (email+password). No club-level password exists.

**meetings**
- `id` (uuid, PK)
- `club_id` (uuid, FK → clubs)
- `title` (text)
- `scheduled_at` (timestamptz)
- `voting_status` (enum: `not_started | open | closed`, default `not_started`) — replaces `voting_open` boolean; distinguishes pre-vote from post-vote closed state
- `status` (enum: `draft | published | completed`, default `draft`)
- `created_by` (uuid, FK → members) — the admin who created this meeting
- `created_at` (timestamptz)

**Meeting status transitions:**
- `draft → published`: Admin explicitly publishes the meeting; it becomes visible on member dashboards.
- `published → completed`: Admin marks meeting complete after all post-meeting tasks (voting closed, emails sent) are done.
- No backward transitions. `completed` is a terminal state.

**meeting_roles**
- `id` (uuid, PK)
- `meeting_id` (uuid, FK → meetings)
- `member_id` (uuid, FK → members)
- `role` (enum: `speaker | evaluator | table_topics_master | table_topics_speaker | supporting_role`)
- `evaluates_member_id` (uuid, FK → members, nullable) — only populated when `role = 'evaluator'`; identifies which speaker this evaluator is assigned to evaluate. Prevents mis-assignment and drives the Speaker Select dropdown in F8.

**votes**
- `id` (uuid, PK)
- `meeting_id` (uuid, FK → meetings)
- `voter_id` (uuid, FK → members)
- `category` (enum: `best_speaker | best_supporting_role | best_table_topics_master | best_evaluator | best_table_topic`)
- `nominee_id` (uuid, FK → members)
- `created_at` (timestamptz)
- **Unique constraint:** `(meeting_id, voter_id, category)`

**meeting_ratings**
- `id` (uuid, PK)
- `meeting_id` (uuid, FK → meetings)
- `voter_id` (uuid, FK → members)
- `rating` (int, 1–5)
- `created_at` (timestamptz)
- **Unique constraint:** `(meeting_id, voter_id)`

**feedbacks**
- `id` (uuid, PK)
- `meeting_id` (uuid, FK → meetings)
- `speaker_id` (uuid, FK → members)
- `evaluator_id` (uuid, FK → members)
- `comment` (text, max 5000 chars)
- `created_at` (timestamptz)
- `updated_at` (timestamptz) — set on every edit; used to surface "last edited" to admin

**email_logs**
- `id` (uuid, PK)
- `meeting_id` (uuid, FK → meetings)
- `speaker_id` (uuid, FK → members)
- `sent_at` (timestamptz, nullable)
- `status` (enum: `pending | sent | failed`)
- `error_message` (text, nullable)

**posts** — for PR support
- `id` (uuid, PK)
- `club_id` (uuid, FK → clubs)
- `platform` (enum: `instagram | linkedin`)
- `url` (text)
- `thumbnail_url` (text, nullable) — preview image displayed in the member dashboard card
- `is_active` (boolean, default true) — only the single active post is shown; admin deactivates old posts when adding new ones
- `created_at` (timestamptz)

> **`notifications` table removed:** Replaced by `members.birthday_collected` boolean. Reintroduce in Phase 2 for push notification history.

### Key Relationships
- One club → many meetings
- One club → many members
- One club → many posts (at most one `is_active = true` at a time)
- One meeting → many meeting_roles (roster)
- One meeting → many votes
- One meeting → many feedbacks
- One meeting → many email_logs (one per speaker)
- One member → many meeting_roles (across meetings)
- One meeting_role (evaluator) → one `evaluates_member_id` (the speaker being evaluated)

### Removed Entities
- `users` table — superseded by Supabase `auth.users` (managed internally) + `members.auth_user_id` FK
- `notifications` table — replaced by `members.birthday_collected` boolean for Phase 1

---

## 8. Missing Requirements (Open Questions)

| # | Question | Impact | Recommendation |
|---|----------|--------|---------------|
| 1 | ~~How does admin authenticate?~~ **Resolved:** Admin uses the same login screen as members. `members.app_role = 'admin'` determines routing and access. Supabase Auth JWT handles session. | High | — |
| 2 | ~~Can admin close voting after opening?~~ **Resolved:** Yes. `voting_status` enum (`not_started → open → closed`). Admin can open and close. Closed state is distinct from not-yet-opened. No votes accepted once closed. | High | — |
| 3 | ~~Is QR code per-meeting or per-club?~~ **Resolved:** Per-meeting. QR generated at meeting creation; `meeting_id` embedded in URL. | High | — |
| 4 | ~~How is phone verified during guest registration?~~ **Resolved:** No phone verification in Phase 1 — phone is collected but not verified. | Medium | — |
| 5 | ~~What is the "Source" field's option set?~~ **Resolved:** Hardcoded dropdown: Friend, Social Media, Website, Walk-in, Other. | Medium | — |
| 6 | ~~Can a member stay logged in after voting?~~ **Resolved:** Yes — member remains logged in after voting. Post-vote flow returns to Member Dashboard, not sign-out. | Medium | — |
| 7 | ~~Who can edit/delete a feedback before it's sent?~~ **Resolved:** Both the evaluator who submitted it and any admin can edit feedback before dispatch. | Medium | — |
| 8 | ~~What email service provider will be used?~~ **Resolved:** **Resend** — recommended for Phase 1 (generous free tier, simple API, first-class FastAPI integration). | Medium | — |
| 9 | Where do "recent posts" come from for PR section? | Low | **Open** — not decided yet. Options: admin manually enters URL, or fetched from social platform API. |
| 10 | ~~Is there a forgot-password flow?~~ **Resolved:** Skip for Phase 1. Supabase Auth supports it natively when needed in Phase 2. | Medium | — |
| 11 | ~~Can multiple admins exist?~~ **Resolved:** Yes — multiple admins are supported. Each admin is a member record with `app_role = 'admin'`. No limit enforced. | Low | — |
| 12 | ~~What happens if feedback email fails to send?~~ **Resolved:** Retry up to 3 times; surface per-speaker failure status in admin dashboard. | Medium | — |
| 13 | ~~Is voting anonymous?~~ **Resolved:** Yes — voting is anonymous. `voter_id` is stored only for duplicate-vote prevention; vote results (winner tallies) are never displayed with voter attribution. | Medium | — |
| 14 | ~~Birthday: is it displayed on the member's meeting day?~~ **Resolved:** Yes — if today matches a member's `birthday` (MM-DD), display a birthday greeting on their Member Dashboard. Phase 1 feature. | Low | — |

---

## 9. Risks and Edge Cases

| Risk | Severity | Mitigation |
|------|----------|------------|
| Admin account compromised — club loses control | High | Admin role stored in DB; revoke by flipping `app_role`; Supabase Auth handles session expiry and password reset |
| Duplicate votes submitted before DB constraint fires | High | Unique constraint + optimistic UI disabling after first submit |
| Real-time channel drops mid-meeting (connectivity) | High | Supabase Realtime reconnect logic + polling fallback every 30s |
| Feedback email sent twice (admin double-clicks) | High | Idempotency check: query email_logs before sending; skip already-sent |
| Guest registers with another person's email | Medium | Email verification link before session is granted |
| QR code shared outside meeting (remote voters) | Medium | QR is meeting-scoped; reject scans outside ±4h window of `meetings.scheduled_at` |
| Evaluator submits feedback for wrong speaker | Medium | Confirmation step before final submit; allow edit before dispatch |
| Birthday popup shows on every login (notification not written) | Low | Wrap birthday save + notification write in a single DB transaction |
| Voting open for wrong meeting (admin uses stale session) | Low | Display current meeting context prominently on admin dashboard |
| "Source" field skipped — data quality issues | Low | Make source required during guest registration |
