-- =============================================================
-- Guest Feedback — Phase 1
-- Adds: best_main_role enum value, guest_speaker_feedback,
--       guest_meeting_feedback, guest_votes tables
-- =============================================================

ALTER TYPE public.vote_category ADD VALUE IF NOT EXISTS 'best_main_role';

-- Guest feedback on individual speakers
CREATE TABLE IF NOT EXISTS public.guest_speaker_feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id          UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  guest_id            UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  speaker_member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  content_rating      SMALLINT NOT NULL CHECK (content_rating BETWEEN 1 AND 5),
  structure_rating    SMALLINT NOT NULL CHECK (structure_rating BETWEEN 1 AND 5),
  interaction_rating  SMALLINT NOT NULL CHECK (interaction_rating BETWEEN 1 AND 5),
  confidence_rating   SMALLINT NOT NULL CHECK (confidence_rating BETWEEN 1 AND 5),
  overall_rating      SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  comment             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, guest_id, speaker_member_id)
);

-- Guest feedback on overall meeting quality
CREATE TABLE IF NOT EXISTS public.guest_meeting_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id        UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  guest_id          UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  punctual_rating   SMALLINT NOT NULL CHECK (punctual_rating BETWEEN 1 AND 5),
  agenda_rating     SMALLINT NOT NULL CHECK (agenda_rating BETWEEN 1 AND 5),
  inclusive_rating  SMALLINT NOT NULL CHECK (inclusive_rating BETWEEN 1 AND 5),
  experience_rating SMALLINT NOT NULL CHECK (experience_rating BETWEEN 1 AND 5),
  overall_rating    SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, guest_id)
);

-- Guest award votes
CREATE TABLE IF NOT EXISTS public.guest_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  guest_id    UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  category    public.vote_category NOT NULL,
  nominee_id  UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, guest_id, category)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_speaker_feedback_meeting ON public.guest_speaker_feedback(meeting_id);
CREATE INDEX IF NOT EXISTS idx_guest_meeting_feedback_meeting ON public.guest_meeting_feedback(meeting_id);
CREATE INDEX IF NOT EXISTS idx_guest_votes_meeting            ON public.guest_votes(meeting_id);

-- RLS (all writes go through FastAPI service role — RLS covers admin reads)
ALTER TABLE public.guest_speaker_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_meeting_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_votes            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_guest_speaker_feedback"
  ON public.guest_speaker_feedback FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'app_role' IN ('admin', 'super_admin')
    AND meeting_id IN (
      SELECT id FROM public.meetings
      WHERE club_id = (auth.jwt() ->> 'club_id')::uuid
    )
  );

CREATE POLICY "admins_read_guest_meeting_feedback"
  ON public.guest_meeting_feedback FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'app_role' IN ('admin', 'super_admin')
    AND meeting_id IN (
      SELECT id FROM public.meetings
      WHERE club_id = (auth.jwt() ->> 'club_id')::uuid
    )
  );

CREATE POLICY "admins_read_guest_votes"
  ON public.guest_votes FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'app_role' IN ('admin', 'super_admin')
    AND meeting_id IN (
      SELECT id FROM public.meetings
      WHERE club_id = (auth.jwt() ->> 'club_id')::uuid
    )
  );
