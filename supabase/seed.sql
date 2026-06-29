-- Development seed data
-- Run after: supabase db reset
--
-- IMPORTANT: After running this seed, you must:
-- 1. Create auth users in Supabase Dashboard → Authentication → Users
--    (or via: supabase auth create-user --email superadmin@example.com --password <pass>)
-- 2. Copy the generated auth.users.id UUIDs and UPDATE the members rows:
--    UPDATE members SET auth_user_id = '<uuid>' WHERE email = 'superadmin@example.com';
--    UPDATE members SET auth_user_id = '<uuid>' WHERE email = 'member@example.com';
-- 3. Register the custom JWT hook in Supabase Dashboard:
--    Authentication → Hooks → Custom Access Token Hook → custom_access_token_hook

-- Seed club
INSERT INTO public.clubs (id, name, instagram_url, linkedin_url, whatsapp_invite_url)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Sunrise Toastmasters',
  'https://instagram.com/sunrise_toastmasters',
  'https://linkedin.com/company/sunrise-toastmasters',
  'https://chat.whatsapp.com/example'
);

-- Seed super admin
-- The first super_admin is always created via seed on initial deployment.
-- Subsequent super_admins are promoted through the app by this user.
INSERT INTO public.members (id, auth_user_id, club_id, email, name, is_guest, app_role, club_role, birthday_collected)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  NULL, -- set after creating auth user (see instructions above)
  'aaaaaaaa-0000-0000-0000-000000000001',
  'superadmin@example.com',
  'Super Admin',
  false,
  'super_admin',
  'president',
  true
);

-- Seed a regular member
INSERT INTO public.members (id, auth_user_id, club_id, email, name, is_guest, app_role, club_role, birthday_collected)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000002',
  NULL, -- set after creating auth user
  'aaaaaaaa-0000-0000-0000-000000000001',
  'member@example.com',
  'Jane Member',
  false,
  'member',
  'member',
  false
);
