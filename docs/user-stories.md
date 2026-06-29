# User Stories — Toastmasters App (Phase 1)

**Version:** 1.0  
**Date:** 2026-06-23  

Stories are organized by persona. Priority: **P0** = must-have for launch, **P1** = important, **P2** = nice-to-have.

---

## Guest Stories

### G-01 — QR Code Entry (P0)
**As a** guest visiting a Toastmasters meeting for the first time,  
**I want to** scan a QR code at the venue and be guided through a simple onboarding flow,  
**so that** I can participate in the meeting without needing to pre-register.

**Acceptance Criteria:**
- Scanning the QR code opens the Welcome Screen (club name + logo visible)
- Screen prompts for email or phone number
- Input is validated before proceeding
- Experience works on both iOS and Android via Expo

---

### G-02 — New Guest Registration (P0)
**As a** first-time visitor whose email is not in the system,  
**I want to** complete a short registration form,  
**so that** my attendance is recorded and I can vote at the meeting.

**Acceptance Criteria:**
- Form collects: name, phone (if email used for lookup), source
- "Source" is a dropdown with defined options (Friend, Social Media, Walk-in, etc.)
- All fields required
- On submit, a guest record is written and a session is created
- No email verification required in Phase 1

---

### G-03 — Guest Voting (P0)
**As a** guest who is present during the voting segment,  
**I want to** vote for my favorite speaker and other categories,  
**so that** my opinion counts even as a first-time visitor.

**Acceptance Criteria:**
- Voting section shows "locked" state with an explanation until admin opens it
- When admin opens voting, my screen updates in real time without a page refresh
- I can vote once per category; the form prevents double-voting
- After submitting, I see a confirmation and cannot change my votes

---

### G-04 — Stay Connected (P0)
**As a** guest who has completed voting,  
**I want to** see the club's social media and WhatsApp group links,  
**so that** I can stay in touch and consider joining the club.

**Acceptance Criteria:**
- Stay Connected screen shows Instagram, LinkedIn, and WhatsApp group icons
- Each link opens the respective platform
- WhatsApp link uses the club's current invite URL (fetched from club config)
- Screen is shown automatically after vote submission

---

## Member Stories

### M-01 — Member Login (P0)
**As a** registered club member,  
**I want to** log in with my email and password,  
**so that** I can access the member dashboard with my role context.

**Acceptance Criteria:**
- Login form accepts email + password
- Incorrect credentials show a clear error message
- Successful login redirects to Member Dashboard (Landing)
- Session persists across app restarts (Supabase session token)

---

### M-02 — Birthday Collection (P0)
**As a** member who has never provided my birthday,  
**I want to** be prompted once to enter my birthday (month and day),  
**so that** the club can recognize me on my birthday.

**Acceptance Criteria:**
- Popup modal appears on first login after registration
- Form accepts MM and DD only (no year)
- After saving, the popup never appears again for this member
- If I dismiss without saving, I am re-prompted on next login
- Birthday is saved to the members table; a `birthday_collected` notification is written

---

### M-03 — Member Dashboard View (P0)
**As a** member,  
**I want to** see today's meeting information and my role on a single screen,  
**so that** I know what to expect and what responsibilities I have.

**Acceptance Criteria:**
- Dashboard shows current meeting title and date
- Meeting roster is visible (speakers, evaluators, roles)
- My assigned role is highlighted
- Voting section is visible but locked if not yet opened
- Feedback section is visible only if I am an evaluator for this meeting

---

### M-04 — PR Support — Engage With Club Post (P1)
**As a** member,  
**I want to** like or share the club's latest social media post from within the app,  
**so that** I can help promote the club without leaving the app to search for the post.

**Acceptance Criteria:**
- Dashboard displays a card with the most recent club post (platform icon + preview)
- "Like" button opens the post URL in an external browser
- "Share" button invokes the native OS share sheet with the post URL
- If no recent post is configured, the section is hidden

---

### M-05 — Real-Time Voting Unlock (P0)
**As a** member on the dashboard during the voting segment,  
**I want** my voting section to unlock automatically when the admin opens voting,  
**so that** I don't need to refresh the app.

**Acceptance Criteria:**
- Supabase Realtime subscription is active from the moment I open the dashboard
- Voting section transitions from locked to unlocked state within 3 seconds of admin action
- If my connection drops and reconnects, the correct state is loaded on reconnect

---

### M-06 — Vote Submission (P0)
**As a** member participating in the voting segment,  
**I want to** cast my votes for each category and rate the overall meeting,  
**so that** club members are recognized for their contributions.

**Acceptance Criteria:**
- All five voting categories are presented (Best Speaker, Best Supporting Role, Best Table Topics Master, Best Evaluator, Best Table Topic)
- Each category shows only eligible nominees for that role
- Overall meeting rating is a 1–5 star selector
- I can review my selections before final submission
- After submitting, the form becomes read-only with my selections shown
- Attempting to re-submit returns an error (idempotent)

---

### M-07 — Prepared Speech Feedback Submission (P0)
**As a** member who has been assigned as a Prepared Speech Evaluator for this meeting,  
**I want to** submit structured feedback for the speaker I evaluated,  
**so that** the speaker receives written feedback after the meeting.

**Acceptance Criteria:**
- Feedback section only appears for members with `role = evaluator` in this meeting
- Speaker selector lists only the prepared speakers I am evaluating
- Comment field is required
- Submission writes to feedbacks table with my evaluator_id
- Confirmation message is shown after successful submit
- Non-evaluators who attempt to access the URL see an Access Denied screen

---

### M-08 — Post-Vote State (P1)
**As a** member who has completed voting,  
**I want to** return to my dashboard,  
**so that** I can continue using the app (view feedback section, club post, etc.) after voting.

**Acceptance Criteria:**
- After vote submission, a confirmation message is shown briefly
- Member is returned to the Member Dashboard (not signed out)
- Voting section shows a read-only summary of submitted votes
- A manual sign-out option remains available in the app (e.g., in a profile/menu)
- Signing out clears the local session and returns to the Welcome screen

---

## Admin Stories

### A-01 — Authentication & Role-Based Routing (P0)
**As a** user (member, admin, or super admin),  
**I want to** log in through the same screen,  
**so that** I am automatically routed to the correct experience based on my app role.

**Acceptance Criteria:**
- All users use the standard Login screen
- After successful Supabase Auth login, the app reads `members.app_role`
- `app_role = 'super_admin'` → Admin Dashboard (with Members management section visible)
- `app_role = 'admin'` → Admin Dashboard (Members section hidden)
- `app_role = 'member'` → Member Dashboard
- Incorrect credentials show a clear error message
- Admin/super_admin routes return 403 if the JWT's `app_role` claim does not match

---

### A-02 — Meeting Setup (P0)
**As an** admin,  
**I want to** create a meeting with speakers and role assignments before the meeting day,  
**so that** the member dashboard reflects the correct roster when members log in.

**Acceptance Criteria:**
- I can create a meeting with: title, date, schedule/agenda description
- I can search for and select members to assign as speakers
- I can assign roles from the defined enum (speaker, evaluator, table_topics_master, table_topics_speaker, supporting_role)
- Multiple roles can be assigned to different members for the same meeting
- Meeting is saved in draft status and published when ready
- Published meeting is visible on all member dashboards

---

### A-03 — Open Voting (P0)
**As an** admin running the meeting,  
**I want to** open voting with a single toggle,  
**so that** all attendees can vote simultaneously without coordination overhead.

**Acceptance Criteria:**
- Admin Dashboard shows the current `voting_status` (not_started / open / closed)
- Opening voting sets `meetings.voting_status = 'open'` and broadcasts via Realtime
- Closing voting sets `meetings.voting_status = 'closed'` and broadcasts; members see a distinct "voting closed" state (not the pre-open "locked" state)
- I can see a count of votes received in real time (by category, no voter names)
- No new votes are accepted once voting_status is `closed`

---

### A-04 — Send Feedback Emails (P0)
**As an** admin at the end of the meeting,  
**I want to** dispatch all collected feedback to speakers in one click,  
**so that** speakers receive their written evaluation without any manual copy-paste.

**Acceptance Criteria:**
- "Send Feedbacks" button is disabled if no feedback records exist for the meeting
- Clicking triggers the aggregation and email dispatch flow
- Each speaker receives one email with all evaluator comments combined
- Email log table is updated with sent/failed status per speaker
- Admin can see which emails sent successfully and which failed
- Re-clicking does not resend to speakers who already received feedback (idempotency)

---

### A-05 — View Meeting Dashboard (P1)
**As an** admin,  
**I want to** see a live overview of the current meeting (roles filled, votes in, feedback submitted),  
**so that** I can manage the meeting flow with full situational awareness.

**Acceptance Criteria:**
- Admin Dashboard shows: meeting title, date, roster, voting state
- Vote count per category (not individual votes, to preserve some fairness)
- Feedback count per speaker (how many evaluators have submitted)
- Email send status per speaker

---

### A-06 — Assign Club Role (P0)
**As a** super admin,  
**I want to** assign a club officer title (e.g. President, VP Education) to any member,  
**so that** the app reflects the club's organizational structure.

**Acceptance Criteria:**
- Members section in Admin Dashboard is visible only to `app_role = 'super_admin'`
- List shows all non-guest members with their current `club_role` and `app_role`
- Super admin selects a member and picks a `club_role` from the defined list
- Available club roles: President, VP Education, VP Membership, VP PR, Secretary, Treasurer, SAA, Member
- Change is saved immediately; list updates to reflect the new role
- Guests are excluded from this list and cannot be assigned officer roles
- `club_role` change does not affect what the member can do in the app

---

### A-07 — Grant / Revoke App Access (P0)
**As a** super admin,  
**I want to** promote a member to admin or super admin, or demote them back to member,  
**so that** I can control who has access to the admin dashboard.

**Acceptance Criteria:**
- Super admin can set `app_role` to `member`, `admin`, or `super_admin` for any other member
- A super admin cannot change their own `app_role` (self-lockout prevention)
- The system enforces that at least one `super_admin` exists at all times
- On next login after a role change, the affected member is routed to their new dashboard
- Active sessions are not force-logged-out on role change (change takes effect on next login)

---

## System / Automated Stories

### S-01 — Real-Time Vote Unlock Broadcast (P0)
**As the** system,  
**when** admin sets `voting_status = 'open'` on a meeting,  
**I should** broadcast the state change via Supabase Realtime to all active sessions subscribed to that meeting's channel.

**Acceptance Criteria:**
- All active sessions receive the event within 3 seconds
- Sessions that reconnect after a disconnect receive the current state on reconnect
- The broadcast is scoped to the correct meeting (no cross-meeting leakage)

---

### S-02 — Duplicate Vote Prevention (P0)
**As the** system,  
**when** a user submits a vote,  
**I should** enforce that only one vote per category per meeting exists for that voter.

**Acceptance Criteria:**
- Database has unique constraint on `(meeting_id, voter_id, category)`
- API returns a 409 Conflict if a duplicate vote is attempted
- Mobile client handles the 409 gracefully (does not crash; shows informative message)

---

### S-03 — Email Idempotency (P0)
**As the** system,  
**when** the feedback email dispatch is triggered,  
**I should** skip sending to speakers who already have a `status = sent` record in email_logs for this meeting.

**Acceptance Criteria:**
- Before sending each email, check email_logs for an existing `sent` record
- Only send if status is `pending` or `failed`
- Update email_log record on each attempt

---

### S-04 — Birthday Collection Guard (P0)
**As the** system,  
**when** a member saves their birthday,  
**I should** atomically update both `members.birthday` and `members.birthday_collected = true` in a single statement,  
**so that** the birthday popup never appears again for that member even if they log in from a different device.

**Acceptance Criteria:**
- Birthday and `birthday_collected` flag are updated in a single SQL UPDATE (atomic by definition)
- If the UPDATE fails, both fields remain unchanged
- On next login, system checks `members.birthday_collected` before rendering popup
