import type { GeneratedMeditation } from './meditationComposer'

export type SavedSession = {
  id: string
  savedAt: number
  prompt: string
  theme: string
  durationMinutes: number
  voice: string
  intensity: string
  soundscape: string
  carrier: number
  beat: number
  noiseType: string
  noiseVolume: number
  padEnabled: boolean
  script: string
  audioDataUrl: string
}

const STORAGE_KEY = 'binaural-ai-sessions-v1'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function saveSession(
  prompt: string,
  options: { voice: string; intensity: string; soundscape: string; durationMinutes: number },
  result: GeneratedMeditation,
): Promise<SavedSession> {
  const audioDataUrl = await blobToDataUrl(result.audioBlob)

  const session: SavedSession = {
    id: crypto.randomUUID(),
    savedAt: Date.now(),
    prompt,
    theme: result.config.theme,
    durationMinutes: options.durationMinutes,
    voice: options.voice,
    intensity: options.intensity,
    soundscape: options.soundscape,
    carrier: result.config.carrier,
    beat: result.config.beat,
    noiseType: result.config.noiseType,
    noiseVolume: result.config.noiseVolume,
    padEnabled: result.config.padEnabled,
    script: result.script,
    audioDataUrl,
  }

  const existing = listSessions()
  existing.push(session)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  return session
}

export function listSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedSession[]
  } catch {
    return []
  }
}

export function deleteSession(id: string): void {
  const sessions = listSessions().filter((s) => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export async function sessionBlobFromDataUrl(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}
