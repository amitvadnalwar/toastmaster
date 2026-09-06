-- Lets an admin fill a Speaker or Table Topics Speaker slot with a plain
-- name instead of picking a registered member — for a new/prospective
-- member who hasn't registered in the app yet, or a guest giving an
-- impromptu Table Topics speech. The row still has no member_id, so it's
-- automatically excluded from feedback, voting, and leaderboard points
-- (those already require a real member_id) — this only makes the roster
-- and agenda able to show who's speaking.

ALTER TABLE public.meeting_roles
  ALTER COLUMN member_id DROP NOT NULL;

ALTER TABLE public.meeting_roles
  ADD COLUMN IF NOT EXISTS guest_name TEXT;

ALTER TABLE public.meeting_roles
  ADD CONSTRAINT meeting_roles_member_or_guest
  CHECK (
    (member_id IS NOT NULL AND guest_name IS NULL)
    OR (member_id IS NULL AND guest_name IS NOT NULL)
  );
