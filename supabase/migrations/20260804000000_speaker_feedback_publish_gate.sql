-- Speaker feedback is now hidden from admins entirely and from the speaker
-- themselves until an admin explicitly publishes it. Published feedback is
-- shown to the speaker anonymously (no reviewer identity in any query).

ALTER TABLE public.speaker_feedback
  ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false;
