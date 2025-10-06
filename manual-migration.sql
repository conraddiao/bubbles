-- Manual migration script to run in Supabase SQL Editor
-- Run this in your Supabase dashboard > SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  sms_notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact Groups table
CREATE TABLE IF NOT EXISTS contact_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group Memberships table
CREATE TABLE IF NOT EXISTS group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES contact_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notifications_enabled BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id),
  UNIQUE(group_id, email)
);

-- Notification Events table
CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES contact_groups(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('member_joined', 'member_left', 'group_closed')),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Notifications table
CREATE TABLE IF NOT EXISTS sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('group_closed', 'member_notification', '2fa_code')),
  twilio_sid TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  group_id UUID REFERENCES contact_groups(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_contact_groups_owner_id ON contact_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_contact_groups_share_token ON contact_groups(share_token);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_email ON group_memberships(email);
CREATE INDEX IF NOT EXISTS idx_notification_events_group_id ON notification_events(group_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON notification_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_group_id ON sms_notifications(group_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Contact Groups policies
CREATE POLICY "Users can view their groups" ON contact_groups
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create groups" ON contact_groups
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update groups" ON contact_groups
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete groups" ON contact_groups
  FOR DELETE USING (owner_id = auth.uid());

-- Group Memberships policies
CREATE POLICY "Users can view group memberships" ON group_memberships
  FOR SELECT USING (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid()) OR
    group_id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can join groups" ON group_memberships
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update memberships" ON group_memberships
  FOR UPDATE USING (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can leave groups" ON group_memberships
  FOR DELETE USING (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
  );

-- Notification Events policies
CREATE POLICY "Users can view notification events" ON notification_events
  FOR SELECT USING (
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid()) OR
    group_id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can create notification events" ON notification_events
  FOR INSERT WITH CHECK (
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
  );

-- SMS Notifications policies
CREATE POLICY "Users can view own SMS notifications" ON sms_notifications
  FOR SELECT USING (
    recipient_phone IN (SELECT phone FROM profiles WHERE id = auth.uid()) OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
  );

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone, phone_verified, two_factor_enabled, sms_notifications_enabled)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    FALSE,
    FALSE,
    TRUE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();