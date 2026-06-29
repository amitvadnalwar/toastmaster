-- =============================================================
-- Toastmasters App — Phase 1 Initial Schema
-- =============================================================
-- Run order: enums → tables → triggers → indexes → JWT hook → RLS
-- All writes in production go through FastAPI (service role key),
-- which bypasses RLS. RLS here secures direct client reads and
-- Realtime subscriptions only.
-- =============================================================


-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE public.app_role          AS ENUM ('member', 'admin', 'super_admin');
CREATE TYPE public.club_role         AS ENUM ('member', 'guest', 'president', 'vp_education', 'vp_membership', 'vp_pr', 'secretary', 'treasurer', 'saa');
CREATE TYPE public.voting_status     AS ENUM ('not_started', 'open', 'closed');
CREATE TYPE public.meeting_status    AS ENUM ('draft', 'published', 'completed');
CREATE TYPE public.meeting_role      AS ENUM ('speaker', 'evaluator', 'table_topics_master', 'table_topics_speaker', 'supporting_role');
CREATE TYPE public.vote_category     AS ENUM ('best_speaker', 'best_supporting_role', 'best_table_topics_master', 'best_evaluator', 'best_table_topic');
CREATE TYPE public.email_log_status  AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE public.post_platform     AS ENUM ('instagram', 'linkedin');
CREATE TYPE public.registration_source AS ENUM ('friend', 'social_media', 'website', 'walk_in', 'other');


-- =============================================================
-- TABLES
-- =============================================================

CREATE TABLE public.clubs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  instagram_url       TEXT,
  linkedin_url        TEXT,
  whatsapp_invite_url TEXT
);
COMMENT ON TABLE public.clubs IS 'One row per Toastmasters club. Multi-club support is data-model-ready but UI is single-club in Phase 1.';


CREATE TABLE public.members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  club_id             UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  phone               TEXT,
  name                TEXT NOT NULL,
  -- MM-DD only — birth year intentionally not collected (privacy-by-design)
  birthday            TEXT CHECK (birthday ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  birthday_collected  BOOLEAN NOT NULL DEFAULT FALSE,
  source              public.registration_source,
  is_guest            BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  -- NULL for guests; determines post-login routing and access level in the app
  app_role            public.app_role,
  -- Organizational title only — does NOT grant extra app permissions
  club_role           public.club_role NOT NULL DEFAULT 'member',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email)
);
COMMENT ON COLUMN public.members.auth_user_id IS 'NULL for guests who have no Supabase Auth account.';
COMMENT ON COLUMN public.members.app_role     IS 'Controls screen routing and API access. Independent of club_role.';
COMMENT ON COLUMN public.members.club_role    IS 'Display-only officer title. Does not affect app permissions.';


CREATE TABLE public.meetings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id        UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  scheduled_at   TIMESTAMPTZ NOT NULL,
  -- Replaces a simple boolean: false cannot distinguish pre-open from post-close
  voting_status  public.voting_status NOT NULL DEFAULT 'not_started',
  -- Transitions: draft → published → completed (no backward transitions)
  status         public.meeting_status NOT NULL DEFAULT 'draft',
  created_by     UUID NOT NULL REFERENCES public.members(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE public.meeting_roles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id          UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  member_id           UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role                public.meeting_role NOT NULL,
  -- Only set when role = 'evaluator'. Prevents feedback mis-assignment.
  evaluates_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  UNIQUE(meeting_id, member_id, role)
);


CREATE TABLE public.votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  category    public.vote_category NOT NULL,
  nominee_id  UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- voter_id stored only to enforce this constraint; never exposed in results
  UNIQUE(meeting_id, voter_id, category)
);


CREATE TABLE public.meeting_ratings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, voter_id)
);


CREATE TABLE public.feedbacks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  speaker_id    UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  evaluator_id  UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  comment       TEXT NOT NULL CHECK (char_length(comment) <= 5000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE public.email_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  speaker_id    UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status        public.email_log_status NOT NULL DEFAULT 'pending',
  sent_at       TIMESTAMPTZ,
  error_message TEXT,
  -- One log per speaker per meeting; upserted on each dispatch attempt for idempotency
  UNIQUE(meeting_id, speaker_id)
);


CREATE TABLE public.posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  platform      public.post_platform NOT NULL,
  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforces at most one active post per club at the DB level
CREATE UNIQUE INDEX posts_one_active_per_club
  ON public.posts (club_id)
  WHERE (is_active = TRUE);


-- =============================================================
-- TRIGGERS
-- =============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedbacks_updated_at
  BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_members_auth_user_id       ON public.members(auth_user_id);
CREATE INDEX idx_members_club_id            ON public.members(club_id);
CREATE INDEX idx_meetings_club_id           ON public.meetings(club_id);
CREATE INDEX idx_meetings_scheduled_at      ON public.meetings(scheduled_at);
CREATE INDEX idx_meeting_roles_meeting_id   ON public.meeting_roles(meeting_id);
CREATE INDEX idx_meeting_roles_member_id    ON public.meeting_roles(member_id);
CREATE INDEX idx_votes_meeting_id           ON public.votes(meeting_id);
CREATE INDEX idx_votes_voter_id             ON public.votes(voter_id);
CREATE INDEX idx_feedbacks_meeting_id       ON public.feedbacks(meeting_id);
CREATE INDEX idx_feedbacks_speaker_id       ON public.feedbacks(speaker_id);
CREATE INDEX idx_feedbacks_evaluator_id     ON public.feedbacks(evaluator_id);
CREATE INDEX idx_email_logs_meeting_id      ON public.email_logs(meeting_id);
CREATE INDEX idx_posts_club_id              ON public.posts(club_id);


-- =============================================================
-- CUSTOM JWT HOOK
-- Injects app_role and club_id into Supabase Auth JWTs so that
-- FastAPI middleware and RLS policies can read them from the token.
--
-- After running this migration, register the hook in the dashboard:
--   Supabase Dashboard → Authentication → Hooks
--   → Custom Access Token Hook → select function: custom_access_token_hook
-- =============================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims     JSONB;
  v_app_role TEXT;
  v_club_id  TEXT;
BEGIN
  claims := event -> 'claims';

  SELECT app_role::text, club_id::text
  INTO   v_app_role, v_club_id
  FROM   public.members
  WHERE  auth_user_id = (event ->> 'user_id')::uuid
  LIMIT  1;

  -- Member record may not exist yet on very first signup callback.
  -- Leave claims unchanged in that case; role is set on next login.
  IF v_app_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_role}', to_jsonb(v_app_role));
    claims := jsonb_set(claims, '{club_id}',  to_jsonb(v_club_id));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT  EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;


-- =============================================================
-- ROW LEVEL SECURITY
-- All writes go through FastAPI with service_role (bypasses RLS).
-- Policies here cover direct client reads and Realtime subscriptions.
-- =============================================================

ALTER TABLE public.clubs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_roles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts          ENABLE ROW LEVEL SECURITY;


-- clubs --------------------------------------------------------
-- Members read their own club record (needed for social links on Stay Connected screen)
CREATE POLICY "members read own club"
  ON public.clubs FOR SELECT TO authenticated
  USING (id = (auth.jwt() ->> 'club_id')::uuid);


-- members ------------------------------------------------------
-- Each member can always read their own record
CREATE POLICY "members read own record"
  ON public.members FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Admins and super_admins can read all members in their club
CREATE POLICY "admins read club members"
  ON public.members FOR SELECT TO authenticated
  USING (
    club_id = (auth.jwt() ->> 'club_id')::uuid
    AND auth.jwt() ->> 'app_role' IN ('admin', 'super_admin')
  );


-- meetings -----------------------------------------------------
-- All authenticated members see published/completed meetings in their club.
-- Admins also see drafts (needed for meeting setup workflow).
-- This policy also covers Realtime CDC events on the meetings table.
CREATE POLICY "members read published meetings"
  ON public.meetings FOR SELECT TO authenticated
  USING (
    club_id = (auth.jwt() ->> 'club_id')::uuid
    AND (
      status IN ('published', 'completed')
      OR auth.jwt() ->> 'app_role' IN ('admin', 'super_admin')
    )
  );


-- meeting_roles ------------------------------------------------
-- Authenticated members in the club can read the roster
CREATE POLICY "members read meeting roles"
  ON public.meeting_roles FOR SELECT TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE  club_id = (auth.jwt() ->> 'club_id')::uuid
    )
  );


-- votes --------------------------------------------------------
-- No direct SELECT from client — vote tallies are returned by FastAPI
-- (service role) only to admins. Individual voter records are never exposed.


-- meeting_ratings ----------------------------------------------
-- No direct SELECT from client (same reasoning as votes).


-- feedbacks ---------------------------------------------------
-- Evaluators can read feedback they submitted
CREATE POLICY "evaluators read own feedback"
  ON public.feedbacks FOR SELECT TO authenticated
  USING (
    evaluator_id IN (
      SELECT id FROM public.members WHERE auth_user_id = auth.uid()
    )
  );

-- Admins can read all feedback for meetings in their club
CREATE POLICY "admins read club feedback"
  ON public.feedbacks FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'app_role' IN ('admin', 'super_admin')
    AND meeting_id IN (
      SELECT id FROM public.meetings
      WHERE  club_id = (auth.jwt() ->> 'club_id')::uuid
    )
  );


-- email_logs --------------------------------------------------
-- Only admins need to see dispatch status; members never see this table
CREATE POLICY "admins read email logs"
  ON public.email_logs FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'app_role' IN ('admin', 'super_admin')
    AND meeting_id IN (
      SELECT id FROM public.meetings
      WHERE  club_id = (auth.jwt() ->> 'club_id')::uuid
    )
  );


-- posts -------------------------------------------------------
-- All members can see the active post (for PR support card on Member Dashboard)
CREATE POLICY "members read active posts"
  ON public.posts FOR SELECT TO authenticated
  USING (
    club_id  = (auth.jwt() ->> 'club_id')::uuid
    AND is_active = TRUE
  );

-- Admins can see all posts (active and historical) for deactivation workflow
CREATE POLICY "admins read all posts"
  ON public.posts FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'app_role' IN ('admin', 'super_admin')
    AND club_id = (auth.jwt() ->> 'club_id')::uuid
  );
