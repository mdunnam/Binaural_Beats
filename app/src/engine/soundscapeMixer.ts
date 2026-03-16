import { createSamplePlayer, setLayerGain as sampleSetLayerGain, stopSamplePlayer } from './samplePlayer'
import type { SamplePlayer } from './samplePlayer'

export type SoundLayerId = 'rain' | 'thunder' | 'wind' | 'waves' | 'fire' | 'forest' | 'space' | 'cave' | 'stream' | 'birds' | 'cafe' | 'night' | 'fan' | 'bowl' | 'beach' | 'city' | 'underwater' | 'monastery' | 'train' | 'library' | 'storm-heavy' | 'meadow'

export type SoundLayer = {
  id: SoundLayerId
  label: string
  emoji: string
  noiseType: 'white' | 'pink' | 'brown'
  filterType: 'lowpass' | 'highpass' | 'bandpass' | 'none'
  filterFreq: number
  filterQ: number
  defaultGain: number
}

export const SOUND_LAYERS: SoundLayer[] = [
  { id: 'rain',    label: 'Rain',    emoji: '🌧', noiseType: 'pink',  filterType: 'bandpass', filterFreq: 1200, filterQ: 0.8, defaultGain: 0 },
  { id: 'thunder', label: 'Thunder', emoji: '⛈', noiseType: 'brown', filterType: 'lowpass',  filterFreq: 180,  filterQ: 1.2, defaultGain: 0 },
  { id: 'wind',    label: 'Wind',    emoji: '🌬', noiseType: 'pink',  filterType: 'highpass', filterFreq: 600,  filterQ: 0.5, defaultGain: 0 },
  { id: 'waves',   label: 'Waves',   emoji: '🌊', noiseType: 'brown', filterType: 'lowpass',  filterFreq: 400,  filterQ: 0.7, defaultGain: 0 },
  { id: 'fire',    label: 'Fire',    emoji: '🔥', noiseType: 'brown', filterType: 'bandpass', filterFreq: 300,  filterQ: 1.5, defaultGain: 0 },
  { id: 'forest',  label: 'Forest',  emoji: '🌲', noiseType: 'pink',  filterType: 'bandpass', filterFreq: 2000, filterQ: 0.6, defaultGain: 0 },
  { id: 'space',   label: 'Space',   emoji: '🌌', noiseType: 'brown', filterType: 'lowpass',  filterFreq: 120,  filterQ: 2.0, defaultGain: 0 },
  { id: 'cave',    label: 'Cave',     emoji: '🗿', noiseType: 'brown', filterType: 'lowpass',  filterFreq: 250,  filterQ: 1.8, defaultGain: 0 },
  { id: 'stream',  label: 'Stream',   emoji: '🏞', noiseType: 'brown', filterType: 'bandpass', filterFreq: 800,  filterQ: 1.2, defaultGain: 0 },
  { id: 'birds',   label: 'Birds',    emoji: '🐦', noiseType: 'pink',  filterType: 'highpass', filterFreq: 2000, filterQ: 0.8, defaultGain: 0 },
  { id: 'cafe',    label: 'Café',     emoji: '☕', noiseType: 'pink',  filterType: 'bandpass', filterFreq: 1000, filterQ: 0.6, defaultGain: 0 },
  { id: 'night',   label: 'Night',    emoji: '🌙', noiseType: 'brown', filterType: 'lowpass',  filterFreq: 600,  filterQ: 1.0, defaultGain: 0 },
  { id: 'fan',     label: 'Fan',      emoji: '🌀', noiseType: 'white', filterType: 'bandpass', filterFreq: 400,  filterQ: 2.0, defaultGain: 0 },
  { id: 'bowl',    label: 'Bowl',     emoji: '🔔', noiseType: 'pink',  filterType: 'bandpass', filterFreq: 300,  filterQ: 3.0, defaultGain: 0 },
  { id: 'beach',   label: 'Beach',    emoji: '🏖', noiseType: 'brown', filterType: 'lowpass',  filterFreq: 500,  filterQ: 0.6, defaultGain: 0 },
  { id: 'city',    label: 'City Rain',emoji: '🏙', noiseType: 'pink',  filterType: 'bandpass', filterFreq: 900,  filterQ: 0.7, defaultGain: 0 },
  { id: 'underwater',  label: 'Underwater',  emoji: '🐠', noiseType: 'brown', filterType: 'lowpass',  filterFreq: 200,  filterQ: 1.5, defaultGain: 0 },
  { id: 'monastery',   label: 'Monastery',   emoji: '🏯', noiseType: 'pink',  filterType: 'bandpass', filterFreq: 500,  filterQ: 2.0, defaultGain: 0 },
  { id: 'train',       label: 'Train',       emoji: '🚂', noiseType: 'brown', filterType: 'bandpass', filterFreq: 150,  filterQ: 1.0, defaultGain: 0 },
  { id: 'library',     label: 'Library',     emoji: '📚', noiseType: 'pink',  filterType: 'lowpass',  filterFreq: 800,  filterQ: 0.5, defaultGain: 0 },
  { id: 'storm-heavy', label: 'Heavy Storm', emoji: '🌩', noiseType: 'brown', filterType: 'lowpass',  filterFreq: 300,  filterQ: 0.8, defaultGain: 0 },
  { id: 'meadow',      label: 'Meadow',      emoji: '🌿', noiseType: 'pink',  filterType: 'bandpass', filterFreq: 1500, filterQ: 0.6, defaultGain: 0 },
]

export type SoundscapeScene = {
  id: string
  label: string
  emoji: string
  gains: Partial<Record<SoundLayerId, number>>
}

export const SOUNDSCAPE_SCENES: SoundscapeScene[] = [
  { id: 'off',    label: 'Off',          emoji: '○',  gains: {} },
  { id: 'storm',  label: 'Thunderstorm', emoji: '⛈', gains: { rain: 0.7, thunder: 0.4, wind: 0.3 } },
  { id: 'ocean',  label: 'Ocean',        emoji: '🌊', gains: { waves: 0.8, wind: 0.2 } },
  { id: 'forest', label: 'Forest Rain',  emoji: '🌲', gains: { forest: 0.6, rain: 0.4 } },
  { id: 'fire',   label: 'Fireplace',    emoji: '🔥', gains: { fire: 0.7, cave: 0.2 } },
  { id: 'space',  label: 'Deep Space',   emoji: '🌌', gains: { space: 0.8, cave: 0.3 } },
  { id: 'cave',   label: 'Cave Drip',    emoji: '🗿', gains: { cave: 0.6, wind: 0.2 } },
  { id: 'custom', label: 'Custom',       emoji: '🎚', gains: {} },
  { id: 'stream', label: 'Forest Stream', emoji: '🏞', gains: { stream: 0.7, birds: 0.4, forest: 0.2 } },
  { id: 'cafe',   label: 'Rainy Café',    emoji: '☕', gains: { cafe: 0.6, rain: 0.3, city: 0.2 } },
  { id: 'night',  label: 'Night Crickets',emoji: '🌙', gains: { night: 0.8, wind: 0.1 } },
  { id: 'bowl',   label: 'Tibetan Bowl',  emoji: '🔔', gains: { bowl: 0.7, cave: 0.2 } },
  { id: 'beach',  label: 'Beach',         emoji: '🏖', gains: { beach: 0.7, waves: 0.3, wind: 0.1 } },
  { id: 'underwater', label: 'Underwater',  emoji: '🌊', gains: { underwater: 0.8, space: 0.2 } },
  { id: 'monastery',  label: 'Monastery',   emoji: '🏯', gains: { monastery: 0.7, bowl: 0.4 } },
  { id: 'focus-train', label: 'Night Train', emoji: '🚂', gains: { train: 0.6, rain: 0.3 } },
  { id: 'meadow',     label: 'Meadow',      emoji: '🌿', gains: { meadow: 0.7, birds: 0.3, wind: 0.1 } },
]

export type LayerGains = Record<SoundLayerId, number>

export const DEFAULT_GAINS: LayerGains = {
  rain: 0, thunder: 0, wind: 0, waves: 0, fire: 0, forest: 0, space: 0, cave: 0,
  stream: 0, birds: 0, cafe: 0, night: 0, fan: 0, bowl: 0, beach: 0, city: 0,
  underwater: 0, monastery: 0, train: 0, library: 0, 'storm-heavy': 0, meadow: 0,
}

// SoundscapeMixerNodes wraps SamplePlayer — same external API
export type SoundscapeMixerNodes = {
  _player: SamplePlayer
  // keep masterGain for API compat (unused internally now, but not referenced externally either)
}

export function createSoundscapeMixer(
  context: AudioContext,
  destination: AudioNode,
  gains: LayerGains,
): SoundscapeMixerNodes {
  const player = createSamplePlayer(context, destination, gains)
  return { _player: player }
}

export function updateLayerGain(nodes: SoundscapeMixerNodes, id: SoundLayerId, gain: number): void {
  sampleSetLayerGain(nodes._player, id, gain).catch(console.error)
}

export function stopSoundscapeMixer(nodes: SoundscapeMixerNodes): void {
  stopSamplePlayer(nodes._player)
}
