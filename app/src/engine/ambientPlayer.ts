// Manages a standalone AudioContext for ambient playback (soundscape + noise)
// completely independent of the binaural session

import { createNoiseBuffer } from './noiseGen'
import type { NoiseType } from '../types'
import { createSamplePlayer, setLayerGain, stopSamplePlayer } from './samplePlayer'
import type { SamplePlayer } from './samplePlayer'
import type { LayerGains, SoundLayerId } from './soundscapeMixer'
import { SOUND_LAYERS } from './soundscapeMixer'

export type AmbientPlayer = {
  context: AudioContext
  masterGain: GainNode
  noiseGain: GainNode
  noiseSource: AudioBufferSourceNode | null
  samplePlayer: SamplePlayer
}

export function createAmbientPlayer(
  masterVolume: number,
  noiseType: NoiseType,
  noiseVolume: number,
  layerGains: LayerGains,
): AmbientPlayer {
  const context = new AudioContext()

  const masterGain = context.createGain()
  masterGain.gain.value = Math.max(0.0001, masterVolume)
  masterGain.connect(context.destination)

  const noiseGain = context.createGain()
  noiseGain.gain.value = noiseType !== 'none' ? Math.max(0.0001, noiseVolume) : 0
  noiseGain.connect(masterGain)

  let noiseSource: AudioBufferSourceNode | null = null
  if (noiseType !== 'none') {
    noiseSource = createNoiseBuffer(context, noiseType)
    noiseSource.connect(noiseGain)
  }

  const samplePlayer = createSamplePlayer(context, masterGain, layerGains)

  // Kick off layers that have gain > 0
  for (const layer of SOUND_LAYERS) {
    if (layerGains[layer.id] > 0) {
      void setLayerGain(samplePlayer, layer.id, layerGains[layer.id])
    }
  }

  return { context, masterGain, noiseGain, noiseSource, samplePlayer }
}

export function setAmbientNoiseType(player: AmbientPlayer, type: NoiseType, volume: number): void {
  if (player.noiseSource) {
    try { player.noiseSource.stop() } catch { /* ignore */ }
    try { player.noiseSource.disconnect() } catch { /* ignore */ }
    player.noiseSource = null
  }

  if (type !== 'none') {
    const source = createNoiseBuffer(player.context, type)
    source.connect(player.noiseGain)
    player.noiseSource = source
    player.noiseGain.gain.setTargetAtTime(Math.max(0.0001, volume), player.context.currentTime, 0.05)
  } else {
    player.noiseGain.gain.setTargetAtTime(0, player.context.currentTime, 0.05)
  }
}

export function setAmbientNoiseVolume(player: AmbientPlayer, volume: number): void {
  const v = player.noiseGain.gain.value
  if (v > 0 || volume > 0) {
    player.noiseGain.gain.setTargetAtTime(volume > 0 ? Math.max(0.0001, volume) : 0, player.context.currentTime, 0.05)
  }
}

export function setAmbientMasterVolume(player: AmbientPlayer, volume: number): void {
  player.masterGain.gain.setTargetAtTime(Math.max(0.0001, volume), player.context.currentTime, 0.05)
}

export function setAmbientLayerGain(player: AmbientPlayer, id: string, gain: number): void {
  void setLayerGain(player.samplePlayer, id as SoundLayerId, gain)
}

export function stopAmbientPlayer(player: AmbientPlayer): void {
  if (player.noiseSource) {
    try { player.noiseSource.stop() } catch { /* ignore */ }
    try { player.noiseSource.disconnect() } catch { /* ignore */ }
    player.noiseSource = null
  }
  stopSamplePlayer(player.samplePlayer)
  void player.context.close()
}
