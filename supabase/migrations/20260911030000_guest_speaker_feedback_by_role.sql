-- Same fix as 20260911020000_speaker_feedback_by_role.sql, for the separate
-- guest feedback tables: lets a guest give feedback to a speaker who has no
-- app account, and lets a guest add a speaker the admin missed straight from
-- the guest feedback page. Keyed by speaker_role_id (the speaker's own
-- meeting_roles row) instead of speaker_member_id, which always exists
-- regardless of whether the speaker has a member account.

ALTER TABLE public.guest_speaker_feedback
  ADD COLUMN IF NOT EXISTS speaker_role_id UUID REFERENCES public.meeting_roles(id) ON DELETE CASCADE;

-- Backfill existing rows from the member-based link.
UPDATE public.guest_speaker_feedback gsf
SET speaker_role_id = mr.id
FROM public.meeting_roles mr
WHERE gsf.speaker_role_id IS NULL
  AND mr.role = 'speaker'
  AND mr.meeting_id = gsf.meeting_id
  AND mr.member_id = gsf.speaker_member_id;

ALTER TABLE public.guest_speaker_feedback
  ALTER COLUMN speaker_member_id DROP NOT NULL;

-- New uniqueness keyed on the speaker's role row (speaker_member_id is NULL
-- for every no-account speaker, and Postgres treats NULLs as distinct — the
-- old constraint doesn't dedupe those at all).
ALTER TABLE public.guest_speaker_feedback
  ADD CONSTRAINT guest_speaker_feedback_unique_per_role UNIQUE (meeting_id, guest_id, speaker_role_id);
