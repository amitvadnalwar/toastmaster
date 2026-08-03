-- Member voting: add the "Best MRP" (Main Role Player / TMOD) category and a
-- comment field for the overall meeting rating. Additive only — existing
-- vote_category values and rows are untouched.

ALTER TYPE public.vote_category ADD VALUE IF NOT EXISTS 'best_mrp';

ALTER TABLE public.meeting_ratings
  ADD COLUMN IF NOT EXISTS comment TEXT;
