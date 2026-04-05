-- Switch share_token generation to lowercase a-z only alphabet
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  alphabet TEXT := 'abcdefghijklmnopqrstuvwxyz';
  token TEXT := '';
BEGIN
  FOR i IN 1..32 LOOP
    token := token || substr(alphabet, floor(random() * 26 + 1)::int, 1);
  END LOOP;
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Update the column default to use the new function
ALTER TABLE public.contact_groups
  ALTER COLUMN share_token SET DEFAULT generate_share_token();

-- Add referrer and UTM tracking columns to share_link_views
ALTER TABLE public.share_link_views
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Composite index for time-series queries by group
CREATE INDEX IF NOT EXISTS idx_share_link_views_group_viewed
  ON public.share_link_views(group_id, viewed_at DESC);

-- Update log_share_link_view to accept referrer/UTM params
CREATE OR REPLACE FUNCTION public.log_share_link_view(
  group_token TEXT,
  p_referrer TEXT DEFAULT NULL,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  resolved_group_id UUID;
BEGIN
  SELECT id INTO resolved_group_id
  FROM public.contact_groups
  WHERE share_token = group_token
    AND archived_at IS NULL;

  IF resolved_group_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.share_link_views (group_id, viewer_id, referrer, utm_source, utm_medium, utm_campaign)
  VALUES (
    resolved_group_id,
    auth.uid(),
    p_referrer,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Analytics query for group owners
CREATE OR REPLACE FUNCTION public.get_share_link_analytics(group_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Only allow group owners
  IF NOT EXISTS (
    SELECT 1 FROM public.contact_groups
    WHERE id = group_uuid AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'total_views', (
      SELECT COUNT(*) FROM public.share_link_views WHERE group_id = group_uuid
    ),
    'unique_views', (
      SELECT COUNT(DISTINCT viewer_id) FROM public.share_link_views
      WHERE group_id = group_uuid AND viewer_id IS NOT NULL
    ),
    'anonymous_views', (
      SELECT COUNT(*) FROM public.share_link_views
      WHERE group_id = group_uuid AND viewer_id IS NULL
    ),
    'views_last_7_days', (
      SELECT COUNT(*) FROM public.share_link_views
      WHERE group_id = group_uuid AND viewed_at > NOW() - INTERVAL '7 days'
    ),
    'views_last_30_days', (
      SELECT COUNT(*) FROM public.share_link_views
      WHERE group_id = group_uuid AND viewed_at > NOW() - INTERVAL '30 days'
    ),
    'daily_views', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.date), '[]'::json)
      FROM (
        SELECT viewed_at::date AS date, COUNT(*) AS views
        FROM public.share_link_views
        WHERE group_id = group_uuid AND viewed_at > NOW() - INTERVAL '30 days'
        GROUP BY viewed_at::date
      ) d
    ),
    'top_referrers', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (
        SELECT COALESCE(referrer, 'direct') AS source, COUNT(*) AS views
        FROM public.share_link_views
        WHERE group_id = group_uuid
        GROUP BY referrer
        ORDER BY views DESC
        LIMIT 5
      ) r
    ),
    'total_members', (
      SELECT COUNT(*) FROM public.group_memberships
      WHERE group_id = group_uuid AND departed_at IS NULL
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_share_link_analytics(UUID) TO authenticated;
