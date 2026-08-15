-- Align guest speaker feedback with the member speaker feedback flow: four
-- category ratings on a 1-3 scale (Content, Structure, Confidence,
-- Interaction), no separate overall rating.
--
-- content_rating/structure_rating/interaction_rating/confidence_rating keep
-- their existing 1-5 CHECK constraints (tightening to 1-3 would reject the
-- five rows already recorded on the old scale); the app now only writes 1-3
-- going forward. overall_rating is dropped from the form, so it's made
-- nullable rather than removed, preserving historical rows — same pattern
-- used for public.speaker_feedback.rating in 20260718000000.

ALTER TABLE public.guest_speaker_feedback
  ALTER COLUMN overall_rating DROP NOT NULL;

COMMENT ON COLUMN public.guest_speaker_feedback.overall_rating IS
  'Deprecated — no longer collected. Kept for historical rows only.';
