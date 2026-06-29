CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id),
  name TEXT NOT NULL,
  phone TEXT,
  source TEXT NOT NULL CHECK (source IN ('Google', 'Word of mouth', 'LinkedIn', 'Instagram', 'Other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Admins and super_admins can read guests registered for their club
CREATE POLICY "guests_admin_read"
  ON public.guests
  FOR SELECT
  TO authenticated
  USING (
    club_id IN (
      SELECT club_id FROM public.members
      WHERE auth_user_id = auth.uid()
      AND app_role IN ('admin', 'super_admin')
    )
  );

-- FastAPI uses the service role key, which bypasses RLS for INSERT
