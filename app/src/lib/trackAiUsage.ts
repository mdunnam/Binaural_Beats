import { supabase } from './supabase'

export async function trackAiUsage(params: {
  userId: string | null
  feature: string
  model: string
  inputTokens?: number
  outputTokens?: number
  ttsChars?: number
  estimatedCostUsd?: number
}) {
  try {
    await supabase.from('ai_usage').insert({
      user_id: params.userId,
      feature: params.feature,
      model: params.model,
      input_tokens: params.inputTokens ?? 0,
      output_tokens: params.outputTokens ?? 0,
      tts_chars: params.ttsChars ?? 0,
      estimated_cost_usd: params.estimatedCostUsd ?? 0,
    })
  } catch {
    // Non-fatal — never block the user experience
  }
}
