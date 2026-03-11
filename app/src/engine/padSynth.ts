import type { PadSynthGraph, PadWaveform } from '../types'

function generateImpulseResponse(context: AudioContext | OfflineAudioContext, durationSec = 3): AudioBuffer {
  const length = Math.ceil(context.sampleRate * durationSec)
  const buffer = context.createBuffer(2, length, context.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (context.sampleRate * 0.8))
      data[i] = (Math.random() * 2 - 1) * decay
    }
  }
  return buffer
}

/** Intervals in semitones from root: root(0), fifth(7), octave(12), major third(4) */
const INTERVALS = [0, 7, 12, 4]

function semitonesToRatio(semitones: number): number {
  return Math.pow(2, semitones / 12)
}

export function createPadSynth(
  context: AudioContext,
  carrier: number,
  padVolume: number,
  reverbMix: number,
  waveform: PadWaveform,
  breatheRate: number,
  destination: AudioNode,
): PadSynthGraph {
  const now = context.currentTime
  const padRoot = carrier / 2

  const oscillators: OscillatorNode[] = []
  const oscGains: GainNode[] = []

  // Mix bus before reverb split
  const preFx = context.createGain()
  preFx.gain.value = 1

  for (let i = 0; i < 4; i++) {
    const freq = padRoot * semitonesToRatio(INTERVALS[i])
    // Random detune ±3–8 cents
    const detune = (Math.random() * 10 - 5) + (Math.random() > 0.5 ? 5 : -5)
    const osc = context.createOscillator()
    osc.type = waveform
    osc.frequency.value = freq
    osc.detune.value = detune
    const g = context.createGain()
    g.gain.value = 0.25
    osc.connect(g)
    g.connect(preFx)
    osc.start(now)
    oscillators.push(osc)
    oscGains.push(g)
  }

  // Dry path
  const dryGain = context.createGain()
  dryGain.gain.value = 1 - reverbMix
  preFx.connect(dryGain)

  // Wet path through convolver
  const convolver = context.createConvolver()
  convolver.buffer = generateImpulseResponse(context)
  const wetGain = context.createGain()
  wetGain.gain.value = reverbMix
  preFx.connect(convolver)
  convolver.connect(wetGain)

  // Mix dry+wet
  const padMixGain = context.createGain()
  padMixGain.gain.value = 1
  dryGain.connect(padMixGain)
  wetGain.connect(padMixGain)

  // Output gain (modulated by LFO for breathing)
  const outputGain = context.createGain()
  outputGain.gain.value = padVolume
  padMixGain.connect(outputGain)
  outputGain.connect(destination)

  // Breathe LFO
  const breatheLfo = context.createOscillator()
  breatheLfo.type = 'sine'
  breatheLfo.frequency.value = breatheRate
  const breatheLfoGain = context.createGain()
  breatheLfoGain.gain.value = padVolume * 0.3  // ±30% of pad volume
  breatheLfo.connect(breatheLfoGain)

  const breatheDc = context.createConstantSource()
  breatheDc.offset.value = padVolume
  breatheDc.connect(outputGain.gain)
  breatheDc.start(now)
  breatheLfoGain.connect(outputGain.gain)
  outputGain.gain.value = 0  // will be driven by DC + LFO

  breatheLfo.start(now)

  return {
    context,
    oscillators,
    oscGains,
    dryGain,
    convolver,
    wetGain,
    padMixGain,
    outputGain,
    breatheLfo,
    breatheLfoGain,
    breatheDc,
  }
}

export function stopPadSynth(pad: PadSynthGraph | null, fadeTime = 1.5): Promise<void> {
  if (!pad) return Promise.resolve()
  return new Promise((resolve) => {
    const now = pad.context.currentTime
    pad.breatheDc.offset.cancelScheduledValues(now)
    pad.breatheDc.offset.setValueAtTime(pad.breatheDc.offset.value, now)
    pad.breatheDc.offset.linearRampToValueAtTime(0, now + fadeTime)
    pad.breatheLfoGain.gain.setValueAtTime(pad.breatheLfoGain.gain.value, now)
    pad.breatheLfoGain.gain.linearRampToValueAtTime(0, now + fadeTime)
    setTimeout(() => {
      pad.oscillators.forEach((o) => { try { o.stop() } catch { /* ignore */ } })
      try { pad.breatheLfo.stop() } catch { /* ignore */ }
      try { pad.breatheDc.stop() } catch { /* ignore */ }
      resolve()
    }, Math.ceil(fadeTime * 1000) + 100)
  })
}

export function updatePadVolume(pad: PadSynthGraph, padVolume: number): void {
  const now = pad.context.currentTime
  pad.breatheDc.offset.setTargetAtTime(padVolume, now, 0.1)
  pad.breatheLfoGain.gain.setTargetAtTime(padVolume * 0.3, now, 0.1)
}

export function updatePadReverbMix(pad: PadSynthGraph, mix: number): void {
  const now = pad.context.currentTime
  pad.dryGain.gain.setTargetAtTime(1 - mix, now, 0.1)
  pad.wetGain.gain.setTargetAtTime(mix, now, 0.1)
}

export function updatePadBreatheRate(pad: PadSynthGraph, rate: number): void {
  pad.breatheLfo.frequency.setValueAtTime(rate, pad.context.currentTime)
}

export function updatePadWaveform(pad: PadSynthGraph, waveform: PadWaveform): void {
  pad.oscillators.forEach((o) => { o.type = waveform })
}

export function updatePadRoot(pad: PadSynthGraph, carrier: number): void {
  const padRoot = carrier / 2
  pad.oscillators.forEach((osc, i) => {
    const freq = padRoot * semitonesToRatio(INTERVALS[i])
    osc.frequency.setTargetAtTime(freq, pad.context.currentTime, 0.2)
  })
}
