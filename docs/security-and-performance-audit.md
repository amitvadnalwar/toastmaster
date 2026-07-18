# Security & Performance Audit

_Last reviewed: 2026-07-17 · Reviewer: engineering · Context: small single-club
production app (web PWA + FastAPI on Render free tier + Supabase)._

This is a living checklist. When you touch an area below, update its status.
Percentages are **risk/severity in this app's real context** (small club, low
traffic, single club today but multi-club-ready schema), not generic CVSS.

## Overall production-readiness

| Area | Score | One-line |
|---|---|---|
| **Security** | ~65% | Solid auth model; a few accidental prod-unsafe defaults + guest-vote integrity gaps |
| **Performance** | ~75% | Fine at current scale; cold starts + bundle size are the main watch items |
| **Operational readiness** | ~55% | No monitoring, shared dev/prod data, no confirmed backup story |
| **Overall** | **~68%** | Safe to run for a club; close the High items before wider exposure |

Scoring key: 🔴 High (fix before real reliance) · 🟠 Medium (fix soon) ·
🟡 Low (track, fix opportunistically).

---

## Security issues

### ✅ S1 — TLS verification disabled in production (`verify=False`) — FIXED 2026-07-17
**Where:** `backend/app/db/client.py`, `backend/app/middleware/auth.py`,
`backend/app/utils/email.py` (SendGrid call).
**What was wrong:** Every outbound call — Supabase (service-role key!), JWKS key
fetch, SendGrid — skipped SSL certificate validation. Started as a workaround
for a local cert issue, but shipped to Render (Linux, no such issue), so it was
live in production — a network-positioned attacker could have MITM'd these
connections, including the one carrying the service-role key.
**Root cause of the original workaround (confirmed):** the local dev machine
runs **Avast antivirus with HTTPS/SSL scanning**, which intercepts TLS and
presents its own `Avast Web/Mail Shield Root` cert that Python doesn't trust.
Purely a local artifact — Render sees the real, publicly-trusted certs.
**Fix applied:** Added `settings.ssl_verify` (defaults **True**). All three call
sites now use `verify=settings.ssl_verify`. Local `.env` sets `SSL_VERIFY=false`
so dev survives Avast interception; Render sets nothing, so it verifies certs.
Verified: local `.env` → False, Render-style env → True; and the real Supabase/
SendGrid certs are valid (local failure is only the Avast MITM cert).

### 🟠 S2 — Guest vote/feedback endpoints have no ownership or integrity checks · risk 60%
**Where:** `backend/app/routers/guests.py` + `services/guest_service.py`
(`submit_votes`, `submit_speaker_feedback`, `submit_meeting_feedback`).
**What:** These are intentionally public (no login) and take `guest_id` in the
URL. But they do **not** verify: (a) the `guest_id` exists, (b) it belongs to
the `meeting_id` in the body, (c) `nominee_id` is actually a nominee for that
meeting, or (d) `voting_status = 'open'`. Combined with **no rate limiting**
and unauthenticated guest registration, someone could script many fake guest
registrations and stuff the "best speaker" ballot, or submit votes before/after
voting is open. Low real-world stakes (club awards) but it undermines the one
feature whose whole point is a fair tally.
**Fix:** In the service layer, validate guest_id→meeting_id linkage, reject
votes unless the meeting's `voting_status = 'open'`, validate nominee is a real
nominee, and add basic rate limiting on the public guest routes (see S5).
**Effort:** Medium.

### 🟠 S3 — CORS allows all origins · risk 40%
**Where:** `backend/app/main.py:10` (`allow_origins=["*"]`, with a "tighten in
production" comment already present).
**What:** Any website can call the API from a browser. Mitigated by the fact
that auth is Bearer-token (not cookies), so `allow_credentials` doesn't expose
much — but it's still hygiene to restrict to your known origins.
**Fix:** Replace `["*"]` with the explicit list: the PWA origin
(`https://amitvadnalwar.github.io`) and localhost for dev.
**Effort:** Low.

### 🟠 S4 — Cross-club data exposure on single-meeting GET · risk 35%
**Where:** `backend/app/services/meeting_service.py:54` (`get_meeting_by_id`),
served by `GET /meetings/{meeting_id}`.
**What:** Returns full meeting details to any authenticated user regardless of
their `club_id`. The sibling `/roster` endpoint correctly checks club ownership
and 403s — this one doesn't. Harmless while single-club, but the schema is
explicitly "multi-club ready," so this becomes a real cross-tenant leak the day
a second club exists.
**Fix:** Add the same `meeting.club_id != user.club_id → 403` check used in
`get_meeting_with_roster`.
**Effort:** Low.

### 🟠 S5 — No rate limiting anywhere · risk 40%
**Where:** whole API; most exposed on the public guest endpoints and `/login`.
**What:** No throttling on guest registration, guest votes, or auth. Enables
ballot stuffing (see S2) and brute-force/credential-stuffing on login.
**Fix:** Add `slowapi` (or Render/Cloudflare-level limits) — start with the
public guest routes and auth.
**Effort:** Medium.

### 🟡 S6 — JWT tokens stored in localStorage · risk 30%
**Where:** `web/src/lib/supabase.ts` (`storage: window.localStorage`).
**What:** Standard Supabase SPA default. Means any XSS can read the access
token. Inherent tradeoff for a static-hosted SPA; the real defense is keeping
XSS out (dependency hygiene) and a CSP — but GitHub Pages can't set response
headers, so CSP isn't available on this host.
**Fix:** Accept as a known tradeoff for now; revisit if the app moves to a host
that can set security headers, or if it starts handling sensitive data.
**Effort:** N/A (documented tradeoff).

### 🟡 S7 — Unescaped user input in invite email HTML · risk 20%
**Where:** `backend/app/utils/email.py` (member `name`/`email` interpolated into
an HTML f-string).
**What:** A member name like `<b>x` renders as HTML in the email. Low risk:
names are set by trusted admins and the email goes only to that member — but
it's a stored-injection pattern worth closing if the input source ever widens.
**Fix:** HTML-escape interpolated values (`html.escape(...)`).
**Effort:** Low.

### ✅ Verified OK (checked, no action needed)
- **No secrets committed to git** — only `.env.example` templates are tracked;
  real `.env` files are gitignored. Service-role key is not in history.
- **Role guards are correct** — admin/super-admin/member dependency guards are
  applied consistently across routers; `require_super_admin` gates all member
  management.
- **`withdraw_from_role`** looked suspicious (generic auth dependency) but is
  correctly scoped in the service layer (members can only remove their own
  assignment; admins can remove any).
- **Supabase anon key in the web bundle** is expected/safe — it's the public
  publishable key, protected by RLS; not a secret.

---

## Performance issues

### 🟠 P1 — Render free-tier cold starts (30–60s) · impact 50%
**What:** The API sleeps after ~15 min idle; first request after that hangs
30–60s. Mitigated in UX by shimmer skeletons, but the underlying wait remains —
painful on meeting night when the first person opens the app.
**Fix:** A scheduled health-check ping (UptimeRobot / cron hitting `/health`
every ~10 min, at least during club hours) keeps it warm. Or upgrade the Render
plan.
**Effort:** Low.

### 🟡 P2 — Web bundle ~895 kB (single chunk) · impact 30%
**Where:** Vite build warns (>500 kB). No code-splitting.
**What:** Whole app ships in one JS file. Fine on good connections; slower first
paint on poor mobile networks.
**Fix:** Route-based lazy loading (`React.lazy` + dynamic import) and/or
`manualChunks`. Revisit as the app grows.
**Effort:** Medium.

### 🟡 P3 — `list_users()` on every Members page load · impact 25%
**Where:** `backend/app/db/admin_members.py` (`fetch_all_non_guest_members`)
calls `supabase.auth.admin.list_users()` to compute each member's confirmed
status.
**What:** Unbounded full auth-user fetch per page load, joined in memory. Fine
at a club's scale; degrades linearly as membership grows.
**Fix:** Cache confirmed-status, or store it denormalized on the members row and
update it in the confirm-password flow.
**Effort:** Medium.

---

## Operational gaps (not in code, but production-critical)

### 🟠 O1 — No error monitoring — CODE DONE, needs Sentry account 2026-07-17
**What was wrong:** Everything surfaced only as `print()` to Render logs. The
email-delivery bug this project hit was only caught by manual observation. A
silent failure notified no one.
**Fix applied:** Added `sentry-sdk[fastapi]` to the backend and `@sentry/react`
to the web app. Both initialize only if a DSN env var is set (`SENTRY_DSN`
backend, `VITE_SENTRY_DSN` frontend) — completely safe no-op otherwise, verified
by building and running the app with no DSN configured (zero console errors,
identical behavior). Backend auto-captures unhandled exceptions across all
FastAPI routes; frontend wraps the app in `Sentry.ErrorBoundary` with a real
fallback screen (was a blank white page on any React crash before). Also added
an explicit `sentry_sdk.capture_message(...)` at the swallowed
`[EMAIL FAILED]` point in `utils/email.py` — installing the SDK alone would
**not** have caught that specific failure, since it's an intentionally-caught
exception, not an unhandled one. Deliberately excludes the temp password from
the Sentry report (only sends `to_email` + error) — no need to send a live
credential to a third party.
**Still needed to go live (not code, requires your login):**
1. Sign up at sentry.io, create two projects (Python/FastAPI, React).
2. Add `SENTRY_DSN` + `SENTRY_ENVIRONMENT=production` to Render env vars.
3. Add `VITE_SENTRY_DSN` as a GitHub Actions secret (same place as
   `VITE_SUPABASE_URL` etc.) so the deploy workflow picks it up.
Until those are added, the app runs exactly as before — this is purely
additive and inert without a DSN.

### 🟠 O2 — Shared dev/prod Supabase project · risk 45%
Testing (account creation/deletion) runs against the same Supabase project as
real data. One bad test can touch real records.
**Fix:** Spin up a second free-tier Supabase project for dev/staging.

### 🟠 O3 — No confirmed backup / recovery story · risk 45%
Supabase free tier has limited point-in-time recovery. A bad migration or
accidental delete may be unrecoverable.
**Fix:** Confirm the recovery story; schedule periodic `pg_dump` exports if PITR
isn't available.

### 🟡 O4 — Thin test coverage on bug-prone flows · risk 30%
The admin member-management flows (where the `resend_invite` id/email bug lived
unnoticed) have little coverage.
**Fix:** Add focused tests for create-member, resend-invite, and the
change-password flag-clearing flow.

---

## Suggested order of attack

1. **S1** (remove `verify=False`) — highest risk, lowest effort.
2. **S3 + S4** (CORS list, cross-club check) — quick hygiene wins.
3. **O1** (error monitoring) — so the next silent failure isn't invisible.
4. **S2 + S5** (guest-vote integrity + rate limiting) — protects the awards
   feature's whole purpose.
5. **P1** (keep-warm ping) — biggest felt UX win on meeting night.
6. Everything else opportunistically.

## How to use this doc
- Reference it in code review: does this change touch S1–S7, P1–P3, O1–O4?
- When you fix an item, change its emoji to ✅ and note the commit.
- Re-review the whole list before any change that widens exposure (new public
  endpoint, second club, custom domain, handling more sensitive data).
