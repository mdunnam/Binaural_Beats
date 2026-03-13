import { createNoiseBuffer } from './noiseGen'
import type { SoundLayerId, SoundLayer } from './soundscapeMixer'
import { SOUND_LAYERS } from './soundscapeMixer'
import type { LayerGains } from './soundscapeMixer'

export type SamplePlayerLayer = {
  id: SoundLayerId
  gainNode: GainNode
  source: AudioBufferSourceNode | null
  buffer: AudioBuffer | null
  loading: boolean
  useNoise: boolean
}

export type SamplePlayer = {
  layers: Map<SoundLayerId, SamplePlayerLayer>
  context: AudioContext
  destination: AudioNode
}

async function loadLayerBuffer(context: AudioContext, layer: SoundLayer): Promise<AudioBuffer | 'noise'> {
  for (const ext of ['ogg', 'mp3', 'mp4']) {
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}sounds/${layer.id}.${ext}`)
      if (resp.ok) {
        const ab = await resp.arrayBuffer()
        return await context.decodeAudioData(ab)
      }
    } catch {
      /* try next */
    }
  }
  return 'noise'
}

function createNoiseSourceForLayer(context: AudioContext, layer: SoundLayer): AudioBufferSourceNode {
  return createNoiseBuffer(context, layer.noiseType)
}

function startSource(
  player: SamplePlayer,
  layerData: SamplePlayerLayer,
  layer: SoundLayer,
): void {
  if (layerData.source) {
    try { layerData.source.stop() } catch { /* ignore */ }
    try { layerData.source.disconnect() } catch { /* ignore */ }
    layerData.source = null
  }

  let src: AudioBufferSourceNode
  let alreadyStarted = false

  if (layerData.useNoise || !layerData.buffer) {
    // createNoiseBuffer already calls source.start() internally — do not start again
    src = createNoiseSourceForLayer(player.context, layer)
    alreadyStarted = true
  } else {
    src = player.context.createBufferSource()
    src.buffer = layerData.buffer
    src.loop = true
  }

  src.connect(layerData.gainNode)
  if (!alreadyStarted) {
    src.start()
  }
  layerData.source = src
}

export function createSamplePlayer(
  context: AudioContext,
  destination: AudioNode,
  gains: LayerGains,
): SamplePlayer {
  const layers = new Map<SoundLayerId, SamplePlayerLayer>()

  const player: SamplePlayer = { layers, context, destination }

  for (const layer of SOUND_LAYERS) {
    const gainNode = context.createGain()
    gainNode.gain.value = 0  // start silent; fade in when gain set
    gainNode.connect(destination)

    const layerData: SamplePlayerLayer = {
      id: layer.id,
      gainNode,
      source: null,
      buffer: null,
      loading: false,
      useNoise: false,
    }
    layers.set(layer.id, layerData)

    // If initial gain > 0, kick off load immediately
    if (gains[layer.id] > 0) {
      void setLayerGain(player, layer.id, gains[layer.id])
    }
  }

  return player
}

export async function setLayerGain(
  player: SamplePlayer,
  id: SoundLayerId,
  gain: number,
): Promise<void> {
  const layerData = player.layers.get(id)
  if (!layerData) return
  const layer = SOUND_LAYERS.find(l => l.id === id)
  if (!layer) return

  const ctx = player.context
  const now = ctx.currentTime
  const FADE = 2

  if (gain <= 0) {
    // Fade out
    layerData.gainNode.gain.cancelScheduledValues(now)
    layerData.gainNode.gain.setValueAtTime(layerData.gainNode.gain.value, now)
    layerData.gainNode.gain.linearRampToValueAtTime(0, now + FADE)
    setTimeout(() => {
      if (layerData.source) {
        try { layerData.source.stop() } catch { /* ignore */ }
        try { layerData.source.disconnect() } catch { /* ignore */ }
        layerData.source = null
      }
    }, Math.ceil(FADE * 1000) + 50)
    return
  }

  // gain > 0
  if (layerData.buffer !== null || layerData.useNoise) {
    // Already loaded or noise fallback — source may or may not be running
    if (!layerData.source) {
      startSource(player, layerData, layer)
    }
    layerData.gainNode.gain.cancelScheduledValues(now)
    layerData.gainNode.gain.setValueAtTime(layerData.gainNode.gain.value, now)
    layerData.gainNode.gain.linearRampToValueAtTime(gain, now + FADE)
    return
  }

  if (layerData.loading) {
    // Still loading — just update gain target; source start will handle it on load
    return
  }

  // Load for the first time
  layerData.loading = true
  const result = await loadLayerBuffer(ctx, layer)
  layerData.loading = false

  if (result === 'noise') {
    layerData.useNoise = true
  } else {
    layerData.buffer = result
    layerData.useNoise = false
  }

  startSource(player, layerData, layer)

  // Fade in
  const n = ctx.currentTime
  layerData.gainNode.gain.cancelScheduledValues(n)
  layerData.gainNode.gain.setValueAtTime(0, n)
  layerData.gainNode.gain.linearRampToValueAtTime(gain, n + FADE)
}

export function stopSamplePlayer(player: SamplePlayer): void {
  for (const [, layerData] of player.layers) {
    if (layerData.source) {
      try { layerData.source.stop() } catch { /* ignore */ }
      try { layerData.source.disconnect() } catch { /* ignore */ }
      layerData.source = null
    }
    try { layerData.gainNode.disconnect() } catch { /* ignore */ }
  }
}
