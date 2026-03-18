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
  stopTimeoutId: ReturnType<typeof setTimeout> | undefined
  pendingGain: number | null  // latest gain requested while loading
}

export type SamplePlayer = {
  layers: Map<SoundLayerId, SamplePlayerLayer>
  context: AudioContext
  destination: AudioNode
}

const LAYER_GAIN_TRIM: Partial<Record<SoundLayerId, number>> = {
  // Rain samples/noise bed are perceived quieter than other layers at the same slider value.
  rain: 2.2,
}

/**
 * Converts UI gain into effective layer output gain with per-layer compensation.
 */
function toEffectiveLayerGain(id: SoundLayerId, gain: number): number {
  const trim = LAYER_GAIN_TRIM[id] ?? 1
  return Math.max(0, gain) * trim
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
    // createNoiseBuffer already calls source.start() internally - do not start again
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
      stopTimeoutId: undefined,
      pendingGain: null,
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
  fadeSec = 0.08,  // fast default for slider interaction; callers can pass longer for scene switches
): Promise<void> {
  const layerData = player.layers.get(id)
  if (!layerData) return
  const layer = SOUND_LAYERS.find(l => l.id === id)
  if (!layer) return

  const ctx = player.context
  const now = ctx.currentTime
  const targetGain = toEffectiveLayerGain(id, gain)

  // Cancel any pending stop-source timeout so rapid moves don't kill an active source
  if (layerData.stopTimeoutId !== undefined) {
    clearTimeout(layerData.stopTimeoutId)
    layerData.stopTimeoutId = undefined
  }

  if (targetGain <= 0) {
    // Fade out then stop source
    layerData.gainNode.gain.cancelScheduledValues(now)
    layerData.gainNode.gain.setValueAtTime(layerData.gainNode.gain.value, now)
    layerData.gainNode.gain.linearRampToValueAtTime(0, now + fadeSec)
    layerData.stopTimeoutId = setTimeout(() => {
      layerData.stopTimeoutId = undefined
      // Only stop if gain is still effectively zero (user didn't bring it back up)
      if (layerData.gainNode.gain.value < 0.01) {
        if (layerData.source) {
          try { layerData.source.stop() } catch { /* ignore */ }
          try { layerData.source.disconnect() } catch { /* ignore */ }
          layerData.source = null
        }
      }
    }, Math.ceil(fadeSec * 1000) + 100)
    return
  }

  // gain > 0
  if (layerData.buffer !== null || layerData.useNoise) {
    if (!layerData.source) {
      startSource(player, layerData, layer)
    }
    layerData.gainNode.gain.cancelScheduledValues(now)
    layerData.gainNode.gain.setValueAtTime(layerData.gainNode.gain.value, now)
    layerData.gainNode.gain.linearRampToValueAtTime(targetGain, now + fadeSec)
    return
  }

  if (layerData.loading) {
    // Still loading — track latest requested gain so fade-in uses the right value
    layerData.pendingGain = gain
    return
  }

  // Load for the first time
  console.log('[samplePlayer] loading', id, 'ctx state:', player.context.state, 'targetGain:', targetGain)
  layerData.loading = true
  layerData.pendingGain = null
  const result = await loadLayerBuffer(ctx, layer)
  layerData.loading = false

  // Use the latest gain requested while loading, if any
  const finalGain = layerData.pendingGain !== null ? layerData.pendingGain : gain
  layerData.pendingGain = null

  if (result === 'noise') {
    layerData.useNoise = true
  } else {
    layerData.buffer = result
    layerData.useNoise = false
  }

  const finalTarget = toEffectiveLayerGain(id, finalGain)
  if (finalTarget <= 0) return  // user muted before load finished

  startSource(player, layerData, layer)

  // Fade in
  const n = ctx.currentTime
  layerData.gainNode.gain.cancelScheduledValues(n)
  layerData.gainNode.gain.setValueAtTime(0, n)
  layerData.gainNode.gain.linearRampToValueAtTime(finalTarget, n + 1.5)  // gentle fade-in on first load
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
