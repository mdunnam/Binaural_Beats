export type MeditationTheme = {
  keywords: string[]
  carrier: number
  beat: number
  brainwaveTarget: 'delta' | 'theta' | 'alpha' | 'beta'
  noiseType: 'none' | 'white' | 'pink' | 'brown'
  noiseVolume: number
  padEnabled: boolean
  scriptTone: string
  sessionMinutes: number
}

export const MEDITATION_THEMES: MeditationTheme[] = [
  { keywords: ['abundance', 'prosperity', 'wealth', 'manifestation'], carrier: 528, beat: 7.83, brainwaveTarget: 'theta', noiseType: 'pink', noiseVolume: 0.12, padEnabled: true, scriptTone: 'warm, affirming, expansive', sessionMinutes: 15 },
  { keywords: ['anxiety', 'stress', 'worry', 'calm', 'peace', 'relief'], carrier: 396, beat: 10, brainwaveTarget: 'alpha', noiseType: 'brown', noiseVolume: 0.15, padEnabled: true, scriptTone: 'calming, grounding, reassuring', sessionMinutes: 15 },
  { keywords: ['sleep', 'rest', 'insomnia', 'tired', 'deep sleep'], carrier: 174, beat: 2, brainwaveTarget: 'delta', noiseType: 'brown', noiseVolume: 0.2, padEnabled: true, scriptTone: 'slow, hypnotic, deeply relaxing', sessionMinutes: 30 },
  { keywords: ['creativity', 'inspiration', 'ideas', 'art', 'design', 'flow'], carrier: 852, beat: 10, brainwaveTarget: 'alpha', noiseType: 'pink', noiseVolume: 0.1, padEnabled: true, scriptTone: 'inspiring, open, curious', sessionMinutes: 20 },
  { keywords: ['self-love', 'confidence', 'worth', 'heart', 'love'], carrier: 639, beat: 7, brainwaveTarget: 'theta', noiseType: 'pink', noiseVolume: 0.1, padEnabled: true, scriptTone: 'warm, nurturing, gentle', sessionMinutes: 15 },
  { keywords: ['focus', 'clarity', 'concentration', 'productivity', 'work'], carrier: 741, beat: 14, brainwaveTarget: 'alpha', noiseType: 'white', noiseVolume: 0.1, padEnabled: false, scriptTone: 'clear, direct, sharp', sessionMinutes: 20 },
  { keywords: ['healing', 'recovery', 'health', 'body', 'restore'], carrier: 285, beat: 4, brainwaveTarget: 'theta', noiseType: 'pink', noiseVolume: 0.12, padEnabled: true, scriptTone: 'gentle, restorative, compassionate', sessionMinutes: 20 },
  { keywords: ['spiritual', 'divine', 'consciousness', 'awakening', 'connection', 'universe'], carrier: 963, beat: 7, brainwaveTarget: 'theta', noiseType: 'none', noiseVolume: 0, padEnabled: true, scriptTone: 'mystical, reverent, expansive', sessionMinutes: 20 },
  { keywords: ['lucid', 'dream', 'astral', 'hypnagogic'], carrier: 432, beat: 4, brainwaveTarget: 'theta', noiseType: 'none', noiseVolume: 0, padEnabled: true, scriptTone: 'dreamlike, hypnotic, floating', sessionMinutes: 30 },
  { keywords: ['energy', 'activate', 'morning', 'motivation', 'power'], carrier: 417, beat: 18, brainwaveTarget: 'beta', noiseType: 'none', noiseVolume: 0, padEnabled: true, scriptTone: 'energising, purposeful, uplifting', sessionMinutes: 10 },
]

export const DEFAULT_THEME: MeditationTheme = {
  keywords: [],
  carrier: 432,
  beat: 7,
  brainwaveTarget: 'theta',
  noiseType: 'pink',
  noiseVolume: 0.12,
  padEnabled: true,
  scriptTone: 'calm, gentle, present',
  sessionMinutes: 15,
}

export function matchTheme(prompt: string): MeditationTheme {
  const lower = prompt.toLowerCase()
  for (const theme of MEDITATION_THEMES) {
    if (theme.keywords.some((kw) => lower.includes(kw))) return theme
  }
  return DEFAULT_THEME
}
