# Claude Code Instructions — Toastmasters App

This file tells Claude how to work within this codebase. Read it before writing any code.

---

## Project Context

A production-grade mobile app for a Toastmasters speaking club. Phase 1 covers: QR onboarding, member/admin auth, meeting-day voting (real-time), prepared speech feedback, and feedback email dispatch.

- **Mobile:** React Native (Expo 52) + TypeScript + Zustand + React Query
- **Backend:** Python FastAPI
- **Infrastructure:** Supabase (Auth, PostgreSQL, Realtime)
- **Email:** Resend
- **Docs:** `docs/` directory has PRD, user stories, roadmap, architecture

The full requirements, data model, permissions matrix, and architecture are in `docs/`. Read them before implementing any feature.

---

## Philosophy

- **Feature-first, not framework-first.** Build only what the feature needs. No extra abstractions.
- **Business logic lives in FastAPI.** Not in the database (no triggers/stored procs), not in the mobile client.
- **No overengineering.** Three similar lines is better than a premature abstraction. No helper functions for things used once.
- **Security by default.** RLS on every Supabase table. JWT validation on every FastAPI endpoint. Never trust the client for authorization.
- **Minimal comments.** Code should be self-explanatory through naming. Only comment the non-obvious *why*, never the *what*.

---

## Tech Conventions

### TypeScript (Mobile)

- Strict mode enabled. No `any`. Use `unknown` with type guards if type is genuinely unknown.
- All API response types defined in `mobile/types/`. Use them throughout — no inline type definitions in components.
- React Query for all server state. Zustand for auth session, current meeting context, and vote submission state (UI-level idempotency). No `useState` for data fetched from the server.
- No `useEffect` for data fetching. Always use React Query hooks.
- Expo Router for navigation. Use typed routes — no string navigation.
- All Supabase calls go through `mobile/lib/supabase.ts`. Never import the Supabase client directly in components.
- API calls go through `mobile/services/`. Never call `fetch` directly in a component.

### Python (Backend)

- Python 3.12+. Use `asyncio` throughout — all route handlers and service functions are `async`.
- All request/response shapes defined as Pydantic v2 models in `backend/app/models/`.
- One router file per domain. Routers are thin — they validate input, call a service, return a response.
- Services hold business logic. DB queries go in `backend/app/db/` query helpers.
- JWT validation is a FastAPI dependency (`get_current_user`). Apply it to every protected route.
- Use `httpx` (async) for calling external APIs (Resend). Never `requests`.
- Type everything. No implicit `Any` types.

### Database

- Supabase PostgreSQL. All schema changes via SQL migration files in `supabase/migrations/`.
- RLS enabled on every table. No table is accessible without a valid JWT unless explicitly public.
- Unique constraints enforced in the schema, not just in application code.
- All IDs are UUIDs. Use `gen_random_uuid()` as default.
- All timestamps are `timestamptz` in UTC.
- Enums are PostgreSQL `enum` types defined in migrations, not text columns.

---

## Feature Implementation Checklist

When implementing any feature, check:

1. **Is the feature in Phase 1 scope?** See `docs/product-requirements.md`. Do not build Phase 2/3 features.
2. **Does the data model support it?** See the entities section in the PRD. Do not add columns without documenting the change.
3. **Is the permission correct?** See the roles matrix in the PRD. Enforce at the API layer (FastAPI) AND the DB layer (RLS).
4. **Is there an existing service function?** Check `backend/app/services/` before creating a new one.
5. **Will this break a unique constraint?** Consider duplicate submissions (votes, feedback).
6. **Is the email idempotent?** Any email dispatch must check email_logs before sending.

---

## What Not To Do

- Do not add error handling for impossible scenarios (internal calls, validated data).
- Do not add a `try/except` around every DB call. Let exceptions propagate and be caught by the global error handler.
- Do not create a helper function for logic used in one place.
- Do not add columns "just in case" we need them later. Add them when the feature requires them.
- Do not implement multi-club UI in Phase 1 (but include `club_id` in all data models).
- Do not put business logic in database triggers or stored procedures.
- Do not skip RLS. Even internal FastAPI ↔ Supabase calls should use the service role key only when absolutely necessary, with explicit justification.
- Do not log JWT tokens or user passwords.

---

## Testing Approach

- **Backend:** `pytest` with `httpx.AsyncClient`. Test each route with valid + invalid inputs. Test role enforcement explicitly (e.g., assert 403 when non-evaluator submits feedback).
- **Mobile:** Test custom hooks and store logic with Vitest. Do not unit test component render trees — test behavior.
- Integration tests over unit tests for the email dispatch flow.
- Do not mock Supabase DB in backend tests — use a test Supabase project or local Supabase via Docker.

---

## File Structure Reference

```
mobile/
  app/            # Expo Router screens
    (auth)/       # login.tsx
    (guest)/      # register.tsx, stay-connected.tsx
    (member)/     # dashboard.tsx
    (admin)/      # dashboard.tsx, meeting/new.tsx, meeting/[id].tsx
    _layout.tsx   # Root layout (QueryClient + auth listener)
    index.tsx     # Role-based redirect
    join.tsx      # QR landing — reads meeting_id param
  components/     # Pure UI components
  store/          # Zustand slices (authSlice, meetingSlice, voteSlice)
  hooks/          # React Query hooks (data fetching)
  services/       # API client functions (typed, no fetch in components)
  lib/            # supabase.ts, apiClient.ts
  types/          # All shared TypeScript types

backend/
  app/
    routers/      # Route handlers (thin — validate, call service, return)
    models/       # Pydantic request/response models
    services/     # Business logic
    db/           # Supabase client + query helpers
    middleware/   # auth.py — JWT validation dependency
    config.py     # Settings from environment variables
    main.py       # App setup, router registration
  tests/          # pytest tests

supabase/
  migrations/     # SQL migration files (one per schema change)
  seed.sql        # Development seed data
```

---

## Environment Variables

Never hard-code URLs, keys, or secrets. All config comes from environment variables.

**Mobile (.env):**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL`

**Backend (.env):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `GUEST_JWT_SECRET` — separate secret for signing guest JWTs (FastAPI-issued)
- `GUEST_TOKEN_EXPIRE_HOURS` (default: 4)
- `EMAIL_API_KEY`
- `EMAIL_FROM_ADDRESS`

---

## Key Invariants to Protect

1. A voter cannot cast more than one vote per category per meeting — enforced by DB unique constraint on `(meeting_id, voter_id, category)`.
2. A feedback email is never sent twice to the same speaker for the same meeting — check `email_logs.status = 'sent'` before each send.
3. The birthday popup never appears more than once — enforced by `members.birthday_collected = true` set atomically with the birthday save.
4. Only members with `role = 'evaluator'` in `meeting_roles` can submit feedback — enforced in `feedback_service` and RLS.
5. Votes are only accepted when `meetings.voting_status = 'open'` — enforced in `vote_service`.
6. Admin access requires `members.app_role = 'admin'` — enforced by `require_admin` dependency and RLS.
7. Feedback editing is locked once the speaker's `email_logs.status = 'sent'` — enforced in `feedback_service`.
