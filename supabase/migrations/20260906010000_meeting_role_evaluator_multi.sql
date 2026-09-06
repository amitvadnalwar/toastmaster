-- Lets a speaker have more than one evaluator, and lets an evaluator be
-- assigned to a speaker who has no member account (added by name only —
-- see 20260906000000_meeting_role_guest_name.sql).
--
-- The old link (evaluates_member_id -> members.id) can't represent a guest
-- speaker, since there's no member row to point to, and the app enforced
-- "one evaluator per speaker" in code (not the DB) via a lookup on that
-- column. Replacing the link with evaluates_role_id -> meeting_roles.id
-- (the speaker's own role-assignment row) fixes both: it always exists
-- regardless of member/guest, and nothing here caps how many evaluator
-- rows can point at the same speaker row.
--
-- evaluates_member_id is kept (nullable, unenforced) purely for any
-- historical row/reporting that still reads it — the app stops relying on
-- it for matching.

ALTER TABLE public.meeting_roles
  ADD COLUMN IF NOT EXISTS evaluates_role_id UUID REFERENCES public.meeting_roles(id) ON DELETE SET NULL;

-- Backfill existing evaluator rows from the member-based link.
UPDATE public.meeting_roles er
SET evaluates_role_id = sr.id
FROM public.meeting_roles sr
WHERE er.role = 'evaluator'
  AND er.evaluates_role_id IS NULL
  AND er.evaluates_member_id IS NOT NULL
  AND sr.role = 'speaker'
  AND sr.meeting_id = er.meeting_id
  AND sr.member_id = er.evaluates_member_id;
