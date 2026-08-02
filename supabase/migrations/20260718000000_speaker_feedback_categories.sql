-- Replace the single overall speaker rating with four category ratings
-- (Content, Structure, Confidence, Interaction), each on a 3-point scale:
-- 1 = Need Improvement, 2 = Ok, 3 = Super.
--
-- The old `rating` column is kept (made nullable) rather than dropped, so
-- any existing rows are preserved; the app stops writing to it going forward.

ALTER TABLE public.speaker_feedback
  ALTER COLUMN rating DROP NOT NULL;

ALTER TABLE public.speaker_feedback
  ADD COLUMN IF NOT EXISTS content_rating     SMALLINT CHECK (content_rating BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS structure_rating   SMALLINT CHECK (structure_rating BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS confidence_rating  SMALLINT CHECK (confidence_rating BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS interaction_rating SMALLINT CHECK (interaction_rating BETWEEN 1 AND 3);

COMMENT ON COLUMN public.speaker_feedback.rating IS
  'Deprecated — superseded by content_rating/structure_rating/confidence_rating/interaction_rating. Kept for historical rows only.';
