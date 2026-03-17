import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  email: string | null
  is_pro: boolean
  is_admin: boolean
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  streak_days?: number
  streak_last_date?: string
}
