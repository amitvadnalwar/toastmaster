-- Admins can disqualify a specific role assignment for a meeting (e.g. a
-- speaker caught rule-breaking). Disqualified assignments are excluded from
-- the member and guest feedback-target/voting-nominee lists, but the role
-- assignment row itself is kept (so history/roster still show it).

ALTER TABLE public.meeting_roles
  ADD COLUMN IF NOT EXISTS disqualified BOOLEAN NOT NULL DEFAULT false;
