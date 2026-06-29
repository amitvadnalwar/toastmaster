-- =============================================================
-- Meeting Management Spec — Phase 1
-- Adds: new meeting_role enum values, venue/theme/president_id/saa_id/max_speakers
--       to meetings; speech_duration to meeting_roles; singleton role constraint
-- =============================================================

-- New role player values (Supabase uses PG15, IF NOT EXISTS supported)
ALTER TYPE public.meeting_role ADD VALUE IF NOT EXISTS 'tmod';
ALTER TYPE public.meeting_role ADD VALUE IF NOT EXISTS 'general_evaluator';
ALTER TYPE public.meeting_role ADD VALUE IF NOT EXISTS 'ah_counter';
ALTER TYPE public.meeting_role ADD VALUE IF NOT EXISTS 'timer';
ALTER TYPE public.meeting_role ADD VALUE IF NOT EXISTS 'grammarian';

-- Extend meetings table
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS venue        TEXT,
  ADD COLUMN IF NOT EXISTS theme        TEXT,
  ADD COLUMN IF NOT EXISTS president_id UUID REFERENCES public.members(id),
  ADD COLUMN IF NOT EXISTS saa_id       UUID REFERENCES public.members(id),
  ADD COLUMN IF NOT EXISTS max_speakers INTEGER NOT NULL DEFAULT 3;

-- Extend meeting_roles table: speech duration for speaker slots
ALTER TABLE public.meeting_roles
  ADD COLUMN IF NOT EXISTS speech_duration TEXT;

-- Enforce that singleton role-player roles are unique per meeting.
-- Speaker, evaluator, table_topics_speaker, and supporting_role are excluded
-- because multiple instances are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS meeting_roles_singleton_role
  ON public.meeting_roles (meeting_id, role)
  WHERE role NOT IN ('speaker', 'evaluator', 'table_topics_speaker', 'supporting_role');
