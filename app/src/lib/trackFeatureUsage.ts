import { supabase } from './supabase'

export async function trackFeatureUsage(params: {
  feature: string
  action?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('feature_usage').insert({
      user_id: user?.id ?? null,
      feature: params.feature,
      action: params.action ?? 'open',
      metadata: params.metadata ?? {},
    })
  } catch {
    // Non-fatal
  }
}
