const PAD_PRESETS_KEY = 'liminal-pad-presets'

export type PadPreset = {
  name: string
  waveform: OscillatorType
  rootNote: string
  octave: number
  chordMode: string
  detune: number
  attack: number
  decay: number
  sustain: number
  release: number
  filterCutoff: number
  filterQ: number
  reverbMix: number
  masterVolume: number
}

export function loadPadPresets(): PadPreset[] {
  try {
    return JSON.parse(localStorage.getItem(PAD_PRESETS_KEY) ?? '[]')
  } catch { return [] }
}

export function savePadPreset(preset: PadPreset): void {
  try {
    const existing = loadPadPresets().filter(p => p.name !== preset.name)
    localStorage.setItem(PAD_PRESETS_KEY, JSON.stringify([...existing, preset]))
  } catch { /* ignore */ }
}

export function deletePadPreset(name: string): void {
  try {
    const existing = loadPadPresets().filter(p => p.name !== name)
    localStorage.setItem(PAD_PRESETS_KEY, JSON.stringify(existing))
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Custom soundscape presets (shared with App.tsx)
// ---------------------------------------------------------------------------
const CUSTOM_SOUNDSCAPE_KEY = 'liminal-custom-soundscapes'

export type CustomSoundscapePreset = { name: string; gains: Record<string, number> }

export function loadCustomSoundscapes(): CustomSoundscapePreset[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_SOUNDSCAPE_KEY) ?? '[]') } catch { return [] }
}
