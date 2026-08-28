-- Replaces QR-scan check-in for members with a 6-digit code the admin
-- generates and displays on screen; members type it in instead of scanning.
-- Nullable — a meeting has no code until an admin generates one, and admins
-- can regenerate at any time (overwriting the previous code).

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS checkin_code TEXT;

-- Looked up by (club_id, checkin_code) on every member check-in attempt.
CREATE INDEX IF NOT EXISTS idx_meetings_checkin_code
  ON public.meetings(club_id, checkin_code)
  WHERE checkin_code IS NOT NULL;
