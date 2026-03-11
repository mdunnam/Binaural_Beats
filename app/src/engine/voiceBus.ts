export type VoiceBus = {
  context: AudioContext
  source: AudioBufferSourceNode | null
  gainNode: GainNode
  reverbNode: ConvolverNode
  dryGain: GainNode
  wetGain: GainNode
  outputGain: GainNode
}

function createReverbIR(context: AudioContext, durationSeconds: number): AudioBuffer {
  const sampleRate = context.sampleRate
  const length = Math.ceil(sampleRate * durationSeconds)
  const buffer = context.createBuffer(2, length, sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-3 * i / length)
      data[i] = (Math.random() * 2 - 1) * decay
    }
  }
  return buffer
}

export async function createVoiceBus(
  context: AudioContext,
  audioBlob: Blob,
  destination: AudioNode,
  volume: number,
): Promise<VoiceBus> {
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioBuffer = await context.decodeAudioData(arrayBuffer)

  const source = context.createBufferSource()
  source.buffer = audioBuffer

  // Main gain (pre-split)
  const gainNode = context.createGain()
  gainNode.gain.value = volume

  // Reverb (1.5s intimate room)
  const reverbNode = context.createConvolver()
  reverbNode.buffer = createReverbIR(context, 1.5)

  // Dry/wet split
  const dryGain = context.createGain()
  dryGain.gain.value = 0.7

  const wetGain = context.createGain()
  wetGain.gain.value = 0.3

  // Output mixer
  const outputGain = context.createGain()
  outputGain.gain.value = 1

  // Signal path: source → gainNode → dryGain → outputGain → destination
  //                               ↘ reverbNode → wetGain ↗
  source.connect(gainNode)
  gainNode.connect(dryGain)
  gainNode.connect(reverbNode)
  dryGain.connect(outputGain)
  reverbNode.connect(wetGain)
  wetGain.connect(outputGain)
  outputGain.connect(destination)

  // Start after 10s so fade-in completes first
  source.start(context.currentTime + 10)

  return { context, source, gainNode, reverbNode, dryGain, wetGain, outputGain }
}

export function stopVoiceBus(bus: VoiceBus, fadeSeconds = 1): void {
  const ctx = bus.context
  const now = ctx.currentTime
  if (fadeSeconds > 0) {
    bus.outputGain.gain.cancelScheduledValues(now)
    bus.outputGain.gain.setValueAtTime(bus.outputGain.gain.value, now)
    bus.outputGain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds)
    setTimeout(() => {
      try { bus.source?.stop() } catch { /* ignore */ }
      try { bus.outputGain.disconnect() } catch { /* ignore */ }
    }, Math.ceil(fadeSeconds * 1000) + 50)
  } else {
    try { bus.source?.stop() } catch { /* ignore */ }
    try { bus.outputGain.disconnect() } catch { /* ignore */ }
  }
}

export function setVoiceVolume(bus: VoiceBus, volume: number): void {
  bus.gainNode.gain.setTargetAtTime(Math.max(0.0001, volume), bus.context.currentTime, 0.05)
}

export function setVoiceReverb(bus: VoiceBus, wetAmount: number): void {
  // wetAmount: 0 = dry only, 1 = fully wet. Crossfade dry/wet.
  const wet = Math.max(0, Math.min(1, wetAmount))
  const dry = 1 - wet * 0.6  // keep some dry always so voice stays present
  bus.dryGain.gain.setTargetAtTime(dry, bus.context.currentTime, 0.05)
  bus.wetGain.gain.setTargetAtTime(wet * 0.6, bus.context.currentTime, 0.05)
}
