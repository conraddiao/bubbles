import { supabase, handleDatabaseError, rpc } from './rpc'

export async function logShareLinkView(
  shareToken: string,
  meta?: { referrer?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }
) {
  try {
    const { error } = await rpc(supabase).logShareLinkView({
      group_token: shareToken,
      p_referrer: meta?.referrer || null,
      p_utm_source: meta?.utm_source || null,
      p_utm_medium: meta?.utm_medium || null,
      p_utm_campaign: meta?.utm_campaign || null,
    })
    if (error) throw error
    return { data: true, error: null }
  } catch (error) {
    // Swallow silently — view logging is best-effort and must never surface to the user
    console.warn('logShareLinkView failed (non-critical):', error)
    return { data: null, error: null }
  }
}

export async function getShareLinkAnalytics(groupId: string) {
  try {
    const { data, error } = await rpc(supabase).getShareLinkAnalytics({ group_uuid: groupId })
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}
