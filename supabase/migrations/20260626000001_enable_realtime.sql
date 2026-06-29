-- Enable Supabase Realtime for tables that need live updates in the mobile app.
-- meeting_roles: drives real-time role assignment updates on the meeting detail page.
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_roles;

-- REPLICA IDENTITY FULL is required so that DELETE events (role withdrawals)
-- include the old row's column values. Without this, Supabase Realtime cannot
-- apply column filters (e.g. meeting_id=eq.X) on DELETE events and withdrawals
-- would not reach subscribers.
ALTER TABLE public.meeting_roles REPLICA IDENTITY FULL;
