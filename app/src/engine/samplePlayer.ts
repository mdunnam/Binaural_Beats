import { createNoiseBuffer } from './noiseGen'
import type { SoundLayerId, SoundLayer } from './soundscapeMixer'
import { SOUND_LAYERS } from './soundscapeMixer'
import type { LayerGains } from './soundscapeMixer'

export type SamplePlayerLayer = {
  id: SoundLayerId
  gainNode: GainNode
  pannerNode: StereoPannerNode
  source: AudioBufferSourceNode | null
  buffer: AudioBuffer | null
  loading: boolean
  useNoise: boolean
  stopTimeoutId: ReturnType<typeof setTimeout> | undefined
  pendingGain: number | null  // latest gain requested while loading
  loopGen: number             // increment to cancel pending crossfade callbacks
  crossfadeTimeoutId: ReturnType<typeof setTimeout> | undefined
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

const XFADE_SEC = 2.5

function scheduleCrossfadeLoop(
  player: SamplePlayer,
  layerData: SamplePlayerLayer,
  buffer: AudioBuffer,
  gen: number,
  fadeIn: boolean,
): void {
  const ctx = player.context
  const srcGain = ctx.createGain()
  srcGain.connect(layerData.gainNode)

  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.connect(srcGain)

  if (fadeIn) {
    srcGain.gain.setValueAtTime(0, ctx.currentTime)
    srcGain.gain.linearRampToValueAtTime(1, ctx.currentTime + XFADE_SEC)
  } else {
    srcGain.gain.value = 1
  }

  src.start()
  layerData.source = src

  const scheduleMs = Math.max(50, (buffer.duration - XFADE_SEC) * 1000)
  layerData.crossfadeTimeoutId = setTimeout(() => {
    layerData.crossfadeTimeoutId = undefined
    if (gen !== layerData.loopGen) return

    // Start next iteration before this one ends
    layerData.loopGen = gen + 1
    scheduleCrossfadeLoop(player, layerData, buffer, gen + 1, true)

    // Fade out this iteration
    const now = ctx.currentTime
    srcGain.gain.cancelScheduledValues(now)
    srcGain.gain.setValueAtTime(srcGain.gain.value, now)
    srcGain.gain.linearRampToValueAtTime(0, now + XFADE_SEC)

    // Disconnect after fade completes
    setTimeout(() => {
      try { src.stop() } catch { /* ignore */ }
      try { src.disconnect() } catch { /* ignore */ }
      try { srcGain.disconnect() } catch { /* ignore */ }
    }, XFADE_SEC * 1000 + 100)
  }, scheduleMs)
}

async function loadLayerBuffer(context: AudioContext, layer: SoundLayer): Promise<AudioBuffer | 'noise'> {
  for (const ext of ['ogg', 'mp3', 'mp4']) {
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}sounds/${layer.id}.${ext}`)
      if (resp.ok) {
        const ab = await resp.arrayBuffer()
        const buf = await context.decodeAudioData(ab)
        console.log(`[samplePlayer] loaded ${layer.id}.${ext} — duration=${buf.duration.toFixed(1)}s`)
        return buf
      }
    } catch (e) {
      console.warn(`[samplePlayer] failed ${layer.id}.${ext}:`, e)
    }
  }
  console.warn(`[samplePlayer] ${layer.id} fell back to noise`)
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

  if (layerData.useNoise || !layerData.buffer) {
    // createNoiseBuffer already calls source.start() internally
    const src = createNoiseSourceForLayer(player.context, layer)
    src.connect(layerData.gainNode)
    layerData.source = src
    return
  }

  // Buffer source: seamless crossfade loop
  scheduleCrossfadeLoop(player, layerData, layerData.buffer, layerData.loopGen, false)
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

    const pannerNode = context.createStereoPanner()
    pannerNode.pan.value = 0  // center by default
    gainNode.connect(pannerNode)
    pannerNode.connect(destination)

    const layerData: SamplePlayerLayer = {
      id: layer.id,
      gainNode,
      pannerNode,
      source: null,
      buffer: null,
      loading: false,
      useNoise: false,
      stopTimeoutId: undefined,
      pendingGain: null,
      loopGen: 0,
      crossfadeTimeoutId: undefined,
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
    // Cancel any pending crossfade so no new iteration starts
    layerData.loopGen++
    if (layerData.crossfadeTimeoutId !== undefined) {
      clearTimeout(layerData.crossfadeTimeoutId)
      layerData.crossfadeTimeoutId = undefined
    }
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
  console.log(`[samplePlayer] ${id} post-load: finalGain=${finalGain} finalTarget=${finalTarget} useNoise=${layerData.useNoise}`)
  if (finalTarget <= 0) { console.warn(`[samplePlayer] ${id} skipped start — finalTarget=0`); return }

  startSource(player, layerData, layer)

  // Fade in
  const n = ctx.currentTime
  layerData.gainNode.gain.cancelScheduledValues(n)
  layerData.gainNode.gain.setValueAtTime(0, n)
  layerData.gainNode.gain.linearRampToValueAtTime(finalTarget, n + 1.5)
}

export function stopSamplePlayer(player: SamplePlayer): void {
  for (const [, layerData] of player.layers) {
    // Invalidate any pending crossfade callbacks
    layerData.loopGen++
    if (layerData.crossfadeTimeoutId !== undefined) {
      clearTimeout(layerData.crossfadeTimeoutId)
      layerData.crossfadeTimeoutId = undefined
    }
    if (layerData.source) {
      try { layerData.source.stop() } catch { /* ignore */ }
      try { layerData.source.disconnect() } catch { /* ignore */ }
      layerData.source = null
    }
    try { layerData.gainNode.disconnect() } catch { /* ignore */ }
    try { layerData.pannerNode.disconnect() } catch { /* ignore */ }
  }
}

/**
 * Sets the stereo pan position for a layer (-1 = hard left, 0 = center, 1 = hard right).
 * Applied immediately (no ramp — pan changes are inaudible unless extreme).
 */
export function setLayerPan(player: SamplePlayer, id: SoundLayerId, pan: number): void {
  const layerData = player.layers.get(id)
  if (!layerData) return
  layerData.pannerNode.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), player.context.currentTime, 0.05)
}
