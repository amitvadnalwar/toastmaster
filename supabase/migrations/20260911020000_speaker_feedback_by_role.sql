-- Lets a member give feedback to a speaker who has no app account (added by
-- name only — see 20260906000000_meeting_role_guest_name.sql), and lets any
-- member add a speaker the admin missed straight from the feedback page.
--
-- Feedback used to be keyed on speaker_member_id, which can't represent a
-- no-account speaker. Add speaker_role_id (the speaker's own meeting_roles
-- row), which always exists regardless of whether the speaker has a member
-- account — mirroring evaluates_role_id for evaluators
-- (20260906000000_meeting_role_evaluator_multi.sql).

ALTER TABLE public.speaker_feedback
  ADD COLUMN IF NOT EXISTS speaker_role_id UUID REFERENCES public.meeting_roles(id) ON DELETE CASCADE;

-- Backfill existing rows from the member-based link.
UPDATE public.speaker_feedback sf
SET speaker_role_id = mr.id
FROM public.meeting_roles mr
WHERE sf.speaker_role_id IS NULL
  AND mr.role = 'speaker'
  AND mr.meeting_id = sf.meeting_id
  AND mr.member_id = sf.speaker_member_id;

ALTER TABLE public.speaker_feedback
  ALTER COLUMN speaker_member_id DROP NOT NULL;

-- New uniqueness keyed on the speaker's role row, so a reviewer can't submit
-- duplicate feedback for a no-account speaker either (speaker_member_id is
-- NULL for all of them, and Postgres treats NULLs as distinct — the old
-- constraint doesn't dedupe those at all).
ALTER TABLE public.speaker_feedback
  ADD CONSTRAINT speaker_feedback_unique_per_role UNIQUE (meeting_id, from_member_id, speaker_role_id);
