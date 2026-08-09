-- Tracks whether a super admin has manually reopened a completed meeting.
-- The backend auto-completes published meetings once their date has passed;
-- this flag tells that check to back off for a meeting that was just
-- reopened, so it doesn't immediately flip back to completed on the next
-- read. Cleared (false) whenever a meeting is completed, whether by the
-- auto-complete check or an admin manually completing it again.

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS reopened BOOLEAN NOT NULL DEFAULT false;
