export type MasterBus = {
  context: AudioContext
  masterGain: GainNode
  limiter: DynamicsCompressorNode
  binauralBus: GainNode    // binaural oscillators connect here
  soundscapeBus: GainNode  // soundscape connects here
  voiceBus: GainNode       // voice connects here
  musicBus: GainNode       // future music connects here
  analyser: AnalyserNode   // post-limiter analyser for VU meter
}

export function createMasterBus(initialVolume: number, existingContext?: AudioContext): MasterBus {
  const context = existingContext ?? new AudioContext()

  const masterGain = context.createGain()
  masterGain.gain.value = initialVolume

  // Soft limiter — prevents clipping when multiple buses are loud
  const limiter = context.createDynamicsCompressor()
  limiter.threshold.value = -3
  limiter.knee.value = 3
  limiter.ratio.value = 20
  limiter.attack.value = 0.001
  limiter.release.value = 0.1

  const binauralBus = context.createGain()
  binauralBus.gain.value = 1

  const soundscapeBus = context.createGain()
  soundscapeBus.gain.value = 1

  const voiceBus = context.createGain()
  voiceBus.gain.value = 1

  const musicBus = context.createGain()
  musicBus.gain.value = 1

  // All buses → masterGain → limiter → destination
  binauralBus.connect(masterGain)
  soundscapeBus.connect(masterGain)
  voiceBus.connect(masterGain)
  musicBus.connect(masterGain)
  masterGain.connect(limiter)

  const analyser = context.createAnalyser()
  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.8
  limiter.connect(analyser)
  analyser.connect(context.destination)

  return { context, masterGain, limiter, binauralBus, soundscapeBus, voiceBus, musicBus, analyser }
}

export function setMasterVolume(bus: MasterBus, volume: number): void {
  bus.masterGain.gain.setTargetAtTime(Math.max(0.0001, volume), bus.context.currentTime, 0.05)
}
