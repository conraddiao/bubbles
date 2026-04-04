-- Migration: Add share_link_views table to track visits to /join/[token] pages.
-- Supports both authenticated and anonymous visitors.
-- All inserts go through the log_share_link_view() SECURITY DEFINER function
-- so anonymous users never need direct INSERT permission on the table.

CREATE TABLE IF NOT EXISTS public.share_link_views (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID        NOT NULL REFERENCES public.contact_groups(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewer_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL -- NULL = anonymous
);

CREATE INDEX IF NOT EXISTS idx_share_link_views_group_id ON public.share_link_views(group_id);
CREATE INDEX IF NOT EXISTS idx_share_link_views_viewed_at ON public.share_link_views(viewed_at);

ALTER TABLE public.share_link_views ENABLE ROW LEVEL SECURITY;

-- Group owners can read views for groups they own
CREATE POLICY "Owners can view share link views" ON public.share_link_views
  FOR SELECT USING (
    group_id IN (
      SELECT id FROM public.contact_groups WHERE owner_id = auth.uid()
    )
  );

-- No direct INSERT policy — all inserts go through log_share_link_view()

CREATE OR REPLACE FUNCTION public.log_share_link_view(group_token TEXT)
RETURNS VOID AS $$
DECLARE
  resolved_group_id UUID;
BEGIN
  -- Resolve the group_id from the share token.
  -- Do nothing if the token does not map to a real, non-archived group.
  SELECT id INTO resolved_group_id
  FROM public.contact_groups
  WHERE share_token = group_token
    AND archived_at IS NULL;

  -- Silently return if token is invalid/archived (fire-and-forget, don't error the client)
  IF resolved_group_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.share_link_views (group_id, viewer_id)
  VALUES (
    resolved_group_id,
    auth.uid()  -- NULL for anon visitors, UUID for authenticated users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security hardening: pin the search path
ALTER FUNCTION public.log_share_link_view(TEXT) SET search_path = public;

-- Grant execute to both anon (unauthenticated visitors) and authenticated users
GRANT EXECUTE ON FUNCTION public.log_share_link_view(TEXT) TO anon, authenticated;
