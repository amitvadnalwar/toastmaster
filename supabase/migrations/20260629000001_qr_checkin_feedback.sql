-- QR token on meetings (auto-generated per meeting)
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS qr_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Meeting attendance (check-in via QR)
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, member_id)
);

-- Speaker feedback (rating + comment per speaker per meeting)
CREATE TABLE IF NOT EXISTS public.speaker_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id        UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  from_member_id    UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  speaker_member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  rating            INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, from_member_id, speaker_member_id)
);
