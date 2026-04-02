-- Seed data for local development and integration testing
-- Run automatically by `supabase start` and `supabase db reset`

-- ============================================================
-- Test users
-- Profiles are created automatically by the handle_new_user trigger
-- ============================================================

-- Test user: Alice (group owner)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'alice@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"first_name": "Alice", "last_name": "Tester"}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Test user: Bob (group member)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'bob@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"first_name": "Bob", "last_name": "Member"}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Update profiles with phone numbers (trigger creates them but without phone)
-- ============================================================

UPDATE public.profiles
SET phone = '+15550001111'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE public.profiles
SET phone = '+15550002222'
WHERE id = '00000000-0000-0000-0000-000000000002';

-- ============================================================
-- Contact groups (owned by Alice)
-- ============================================================

INSERT INTO public.contact_groups (id, name, description, owner_id, is_closed, share_token, access_type)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Book Club',
  'Monthly book club group',
  '00000000-0000-0000-0000-000000000001',
  FALSE,
  'bookclub-test-token-001',
  'open'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contact_groups (id, name, description, owner_id, is_closed, share_token, access_type)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  'Hiking Crew',
  'Weekend hiking group — closed',
  '00000000-0000-0000-0000-000000000001',
  TRUE,
  'hiking-test-token-002',
  'open'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Group memberships
-- ============================================================

-- Alice in Book Club (as owner/member)
INSERT INTO public.group_memberships (id, group_id, user_id, first_name, last_name, email, phone, notifications_enabled)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Alice',
  'Tester',
  'alice@example.com',
  '+15550001111',
  TRUE
) ON CONFLICT DO NOTHING;

-- Bob in Book Club
INSERT INTO public.group_memberships (id, group_id, user_id, first_name, last_name, email, phone, notifications_enabled)
VALUES (
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'Bob',
  'Member',
  'bob@example.com',
  '+15550002222',
  TRUE
) ON CONFLICT DO NOTHING;

-- Anonymous member in Book Club
INSERT INTO public.group_memberships (id, group_id, user_id, first_name, last_name, email, phone, notifications_enabled)
VALUES (
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  NULL,
  'Carol',
  'Anonymous',
  'carol@example.com',
  NULL,
  FALSE
) ON CONFLICT DO NOTHING;

-- Alice in Hiking Crew
INSERT INTO public.group_memberships (id, group_id, user_id, first_name, last_name, email, phone, notifications_enabled)
VALUES (
  '20000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Alice',
  'Tester',
  'alice@example.com',
  '+15550001111',
  FALSE
) ON CONFLICT DO NOTHING;

SELECT 'Seed data loaded successfully' as status;
