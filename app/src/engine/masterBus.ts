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

  // Hard limiter — clip protection only; inaudible at normal levels
  const limiter = context.createDynamicsCompressor()
  limiter.threshold.value = -1.0  // kicks in just below 0 dBFS
  limiter.knee.value = 0          // hard knee for true limiting
  limiter.ratio.value = 20        // high ratio = limiting behaviour
  limiter.attack.value = 0.001    // 1ms attack
  limiter.release.value = 0.1     // 100ms release

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
  // analyser does NOT connect to destination — read-only tap for VU meter
  limiter.connect(context.destination)

  return { context, masterGain, limiter, binauralBus, soundscapeBus, voiceBus, musicBus, analyser }
}

export function setMasterVolume(bus: MasterBus, volume: number): void {
  const now = bus.context.currentTime
  const gain = bus.masterGain.gain
  gain.cancelScheduledValues(now)
  gain.setValueAtTime(gain.value, now)
  gain.setTargetAtTime(Math.max(0.0001, volume), now, 0.05)
}
