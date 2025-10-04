-- Row Level Security (RLS) policies for data access control
-- This migration sets up comprehensive security policies for all tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can only view and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Contact Groups policies
-- Users can view groups they own or are members of
CREATE POLICY "Users can view their groups" ON contact_groups
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid())
  );

-- Only group owners can create, update, and delete groups
CREATE POLICY "Users can create groups" ON contact_groups
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update groups" ON contact_groups
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete groups" ON contact_groups
  FOR DELETE USING (owner_id = auth.uid());

-- Public access for groups via share_token (for anonymous form submissions)
-- This will be handled in application logic with service role key

-- Group Memberships policies
-- Users can view memberships for groups they own or are members of
CREATE POLICY "Users can view group memberships" ON group_memberships
  FOR SELECT USING (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid()) OR
    group_id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid())
  );

-- Users can insert their own memberships or group owners can manage memberships
CREATE POLICY "Users can join groups" ON group_memberships
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
  );

-- Users can update their own memberships or group owners can manage memberships
CREATE POLICY "Users can update memberships" ON group_memberships
  FOR UPDATE USING (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
  );

-- Users can delete their own memberships or group owners can remove members
CREATE POLICY "Users can leave groups" ON group_memberships
  FOR DELETE USING (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
  );

-- Notification Events policies
-- Users can view events for groups they own or are members of
CREATE POLICY "Users can view notification events" ON notification_events
  FOR SELECT USING (
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid()) OR
    group_id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid())
  );

-- Only group owners can create notification events (typically done via functions)
CREATE POLICY "Owners can create notification events" ON notification_events
  FOR INSERT WITH CHECK (
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
  );

-- SMS Notifications policies
-- Users can view their own SMS notifications
CREATE POLICY "Users can view own SMS notifications" ON sms_notifications
  FOR SELECT USING (
    -- User can see notifications sent to their phone
    recipient_phone IN (SELECT phone FROM profiles WHERE id = auth.uid()) OR
    -- Group owners can see notifications for their groups
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
  );

-- SMS notifications are typically created by Edge Functions with service role
-- So we'll allow service role to insert/update these records
CREATE POLICY "Service role can manage SMS notifications" ON sms_notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create a function to check if user is group owner
CREATE OR REPLACE FUNCTION is_group_owner(group_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM contact_groups 
    WHERE id = group_uuid AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is group member
CREATE OR REPLACE FUNCTION is_group_member(group_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = group_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;