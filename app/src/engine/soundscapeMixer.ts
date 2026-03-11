import { createNoiseBuffer } from './noiseGen'

export type SoundLayerId = 'rain' | 'thunder' | 'wind' | 'waves' | 'fire' | 'forest' | 'space' | 'cave'

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
  { id: 'cave',    label: 'Cave',    emoji: '🗿', noiseType: 'brown', filterType: 'lowpass',  filterFreq: 250,  filterQ: 1.8, defaultGain: 0 },
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
]

export type LayerGains = Record<SoundLayerId, number>

export const DEFAULT_GAINS: LayerGains = {
  rain: 0, thunder: 0, wind: 0, waves: 0, fire: 0, forest: 0, space: 0, cave: 0,
}

export type SoundscapeMixerNodes = {
  layers: Map<SoundLayerId, { source: AudioBufferSourceNode; filter: BiquadFilterNode | null; gainNode: GainNode }>
  masterGain: GainNode
}

export function createSoundscapeMixer(
  context: AudioContext,
  destination: AudioNode,
  gains: LayerGains,
): SoundscapeMixerNodes {
  const masterGain = context.createGain()
  masterGain.gain.value = 1
  masterGain.connect(destination)

  const layers = new Map<SoundLayerId, { source: AudioBufferSourceNode; filter: BiquadFilterNode | null; gainNode: GainNode }>()

  for (const layer of SOUND_LAYERS) {
    const source = createNoiseBuffer(context, layer.noiseType)
    let filter: BiquadFilterNode | null = null

    if (layer.filterType !== 'none') {
      filter = context.createBiquadFilter()
      filter.type = layer.filterType as BiquadFilterType
      filter.frequency.value = layer.filterFreq
      filter.Q.value = layer.filterQ
    }

    const gainNode = context.createGain()
    gainNode.gain.value = gains[layer.id]

    if (filter) {
      source.connect(filter)
      filter.connect(gainNode)
    } else {
      source.connect(gainNode)
    }
    gainNode.connect(masterGain)

    layers.set(layer.id, { source, filter, gainNode })
  }

  return { layers, masterGain }
}

export function updateLayerGain(nodes: SoundscapeMixerNodes, id: SoundLayerId, gain: number): void {
  const layer = nodes.layers.get(id)
  if (!layer) return
  layer.gainNode.gain.setTargetAtTime(Math.max(0, gain), layer.gainNode.context.currentTime, 0.05)
}

export function stopSoundscapeMixer(nodes: SoundscapeMixerNodes): void {
  for (const [, layer] of nodes.layers) {
    try { layer.source.stop() } catch { /* ignore */ }
    layer.source.disconnect()
    if (layer.filter) layer.filter.disconnect()
    layer.gainNode.disconnect()
  }
  nodes.masterGain.disconnect()
}
