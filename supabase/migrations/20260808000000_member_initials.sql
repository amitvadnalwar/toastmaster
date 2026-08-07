-- Toastmaster designation shown alongside a member's name (e.g. "TM Jane
-- Doe", "DTM John Smith"). Defaults to 'TM' for all existing members.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS initials TEXT NOT NULL DEFAULT 'TM'
  CHECK (initials IN ('TM', 'DTM'));
