-- Admins can add ad-hoc role players (e.g. "Guest Lecture", "Photographer")
-- beyond the fixed role list. These use role = 'supporting_role' with a
-- free-text title so the roster can display a meaningful name instead of a
-- generic "Supporting Role" label for every entry.

ALTER TABLE public.meeting_roles
  ADD COLUMN IF NOT EXISTS role_title TEXT;
