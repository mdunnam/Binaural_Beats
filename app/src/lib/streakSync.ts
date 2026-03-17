import { supabase } from './supabase'

export interface StreakData {
  streakDays: number
  lastDate: string | null
}

const LS_KEY_DAYS = 'liminal-streak-days'
const LS_KEY_DATE = 'liminal-streak-date'

export function loadStreakLocal(): StreakData {
  return {
    streakDays: parseInt(localStorage.getItem(LS_KEY_DAYS) ?? '0', 10) || 0,
    lastDate: localStorage.getItem(LS_KEY_DATE),
  }
}

export function saveStreakLocal(data: StreakData) {
  localStorage.setItem(LS_KEY_DAYS, String(data.streakDays))
  if (data.lastDate) localStorage.setItem(LS_KEY_DATE, data.lastDate)
}

export async function loadStreakRemote(userId: string): Promise<StreakData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('streak_days, streak_last_date')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return {
    streakDays: (data as any).streak_days ?? 0,
    lastDate: (data as any).streak_last_date ?? null,
  }
}

export async function saveStreakRemote(userId: string, data: StreakData) {
  await supabase
    .from('profiles')
    .update({ streak_days: data.streakDays, streak_last_date: data.lastDate } as any)
    .eq('id', userId)
}

export async function recordSessionComplete(userId: string | null): Promise<StreakData> {
  const today = new Date().toISOString().slice(0, 10)
  const local = loadStreakLocal()

  let current = local
  if (userId) {
    const remote = await loadStreakRemote(userId)
    if (remote) current = remote
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  let newDays: number
  if (current.lastDate === today) {
    newDays = current.streakDays
  } else if (current.lastDate === yesterday) {
    newDays = current.streakDays + 1
  } else {
    newDays = 1
  }

  const updated: StreakData = { streakDays: newDays, lastDate: today }
  saveStreakLocal(updated)
  if (userId) await saveStreakRemote(userId, updated)
  return updated
}
