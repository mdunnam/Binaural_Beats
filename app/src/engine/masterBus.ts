export type MasterBus = {
  context: AudioContext
  masterGain: GainNode
  limiter: DynamicsCompressorNode
  binauralBus: GainNode    // binaural oscillators connect here
  soundscapeBus: GainNode  // soundscape connects here
  voiceBus: GainNode       // voice connects here
  musicBus: GainNode       // music player connects here
  padBus: GainNode         // pad synth connects here
  analyser: AnalyserNode   // post-limiter analyser for VU meter
  // Mid/side stereo width matrix (between masterGain and limiter)
  widthLL: GainNode  // L_out ← L_in  coefficient: (1+w)/2
  widthRL: GainNode  // L_out ← R_in  coefficient: (1-w)/2
  widthLR: GainNode  // R_out ← L_in  coefficient: (1-w)/2
  widthRR: GainNode  // R_out ← R_in  coefficient: (1+w)/2
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

  const padBus = context.createGain()
  padBus.gain.value = 1

  // Mid/side stereo width matrix — inserted between masterGain and limiter.
  // L_out = ((1+w)/2)*L + ((1-w)/2)*R
  // R_out = ((1-w)/2)*L + ((1+w)/2)*R
  // At w=1 (default): L_out=L, R_out=R (normal stereo)
  // At w=0: mono sum; at w=2: exaggerated stereo separation
  const splitter = context.createChannelSplitter(2)
  const widthLL = context.createGain(); widthLL.gain.value = 1   // (1+1)/2
  const widthRL = context.createGain(); widthRL.gain.value = 0   // (1-1)/2
  const widthLR = context.createGain(); widthLR.gain.value = 0   // (1-1)/2
  const widthRR = context.createGain(); widthRR.gain.value = 1   // (1+1)/2
  const widthMerger = context.createChannelMerger(2)

  // All buses → masterGain → splitter
  binauralBus.connect(masterGain)
  soundscapeBus.connect(masterGain)
  voiceBus.connect(masterGain)
  musicBus.connect(masterGain)
  padBus.connect(masterGain)
  masterGain.connect(splitter)

  // Splitter ch0 (L) feeds widthLL and widthLR gain nodes
  splitter.connect(widthLL, 0)
  splitter.connect(widthLR, 0)
  // Splitter ch1 (R) feeds widthRL and widthRR gain nodes
  splitter.connect(widthRL, 1)
  splitter.connect(widthRR, 1)

  // Matrix outputs → merger inputs
  widthLL.connect(widthMerger, 0, 0)   // L contribution → L out
  widthRL.connect(widthMerger, 0, 0)   // R contribution → L out (summed)
  widthLR.connect(widthMerger, 0, 1)   // L contribution → R out
  widthRR.connect(widthMerger, 0, 1)   // R contribution → R out (summed)

  widthMerger.connect(limiter)

  const analyser = context.createAnalyser()
  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.8
  limiter.connect(analyser)
  // analyser does NOT connect to destination — read-only tap for VU meter
  limiter.connect(context.destination)

  return { context, masterGain, limiter, binauralBus, soundscapeBus, voiceBus, musicBus, padBus, analyser, widthLL, widthRL, widthLR, widthRR }
}

export function setMasterVolume(bus: MasterBus, volume: number): void {
  const now = bus.context.currentTime
  const gain = bus.masterGain.gain
  gain.cancelScheduledValues(now)
  gain.setValueAtTime(gain.value, now)
  gain.setTargetAtTime(Math.max(0.0001, volume), now, 0.05)
}

/**
 * Adjusts the stereo width of the master output using a mid/side matrix.
 * @param width - 0 = mono, 1 = normal stereo (default), 2 = wide stereo
 */
export function setMasterStereoWidth(bus: MasterBus, width: number): void {
  const w = Math.max(0, Math.min(2, width))
  const now = bus.context.currentTime
  const tc = 0.02 // 20ms smoothing
  bus.widthLL.gain.setTargetAtTime((1 + w) / 2, now, tc)
  bus.widthRL.gain.setTargetAtTime((1 - w) / 2, now, tc)
  bus.widthLR.gain.setTargetAtTime((1 - w) / 2, now, tc)
  bus.widthRR.gain.setTargetAtTime((1 + w) / 2, now, tc)
}
