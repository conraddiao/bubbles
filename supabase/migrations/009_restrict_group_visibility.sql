-- Restrict group visibility to members/owners and provide token lookup via RPC

-- Remove overly broad public policies
DROP POLICY IF EXISTS "Public can view groups by share token" ON contact_groups;
DROP POLICY IF EXISTS "Public can view memberships for accessible groups" ON group_memberships;

-- Provide a controlled way to fetch a group by its share token
CREATE OR REPLACE FUNCTION public.get_group_by_share_token(group_token TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  is_closed BOOLEAN,
  access_type TEXT,
  join_password_hash TEXT,
  owner_id UUID,
  share_token TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  owner_first_name TEXT,
  owner_last_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cg.id,
    cg.name,
    cg.description,
    cg.is_closed,
    cg.access_type,
    cg.join_password_hash,
    cg.owner_id,
    cg.share_token,
    cg.created_at,
    cg.updated_at,
    p.first_name,
    p.last_name
  FROM public.contact_groups cg
  LEFT JOIN public.profiles p ON p.id = cg.owner_id
  WHERE cg.share_token = group_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

ALTER FUNCTION public.get_group_by_share_token(TEXT) SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_group_by_share_token(TEXT) TO anon, authenticated;
