-- =============================================================
-- Meeting Agenda — Phase 1
-- Adds: meeting_agenda_items table, Word/Idiom of the Day columns
--       on meetings, and club-wide sidebar fields on clubs
-- =============================================================

CREATE TABLE public.meeting_agenda_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id            UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  position              SMALLINT NOT NULL,
  item_type             TEXT NOT NULL CHECK (item_type IN ('section', 'item', 'speech')),
  title                 TEXT NOT NULL,
  -- Only meaningful on 'section' rows — minutes added to the time cascade
  -- when this section represents e.g. a "5 Min Break".
  break_minutes         SMALLINT,
  -- NULL on 'section' rows. Equal on all three for a flat-duration row
  -- (e.g. "Gathering & Networking — 15 min", no distinct timing card).
  duration_green_sec    INTEGER,
  duration_yellow_sec   INTEGER,
  duration_red_sec      INTEGER,
  -- "HH:MM". Required on the first row (the cascade anchor); optional
  -- elsewhere as a manual override that wins over the computed cascade.
  start_time_override   TEXT,
  host_member_id        UUID REFERENCES public.members(id) ON DELETE SET NULL,
  host_name             TEXT,
  -- 'speech' rows only — the "M: <evaluator>" line
  evaluator_member_id   UUID REFERENCES public.members(id) ON DELETE SET NULL,
  evaluator_name        TEXT,
  -- 'speech' rows only — free text, e.g. path_code "PM", level_project "L1P1"
  path_code             TEXT,
  level_project         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, position)
);

CREATE INDEX idx_meeting_agenda_items_meeting_id ON public.meeting_agenda_items(meeting_id);

ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;

-- All authenticated members in the club can read the agenda (not just admins —
-- unlike the roster/feedback tables, the agenda is meant to be seen by everyone).
CREATE POLICY "members read meeting agenda"
  ON public.meeting_agenda_items FOR SELECT TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE club_id = (auth.jwt() ->> 'club_id')::uuid
    )
  );

-- FastAPI uses the service role key, which bypasses RLS for writes.


-- Word/Idiom of the Day — meeting-level metadata, like theme.
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS word_of_day          TEXT,
  ADD COLUMN IF NOT EXISTS word_of_day_meaning   TEXT,
  ADD COLUMN IF NOT EXISTS word_of_day_usage     TEXT,
  ADD COLUMN IF NOT EXISTS idiom_of_day          TEXT,
  ADD COLUMN IF NOT EXISTS idiom_of_day_meaning  TEXT,
  ADD COLUMN IF NOT EXISTS idiom_of_day_usage    TEXT;

-- Club-wide constants shown on the agenda sidebar, entered once instead of
-- being retyped into every week's flyer.
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS mission_statement  TEXT,
  ADD COLUMN IF NOT EXISTS venue_address_url  TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url       TEXT;
