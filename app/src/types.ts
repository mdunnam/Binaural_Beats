export type NoiseType = 'none' | 'white' | 'pink' | 'brown' | 'blue' | 'violet'
export type IsochronicWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle'
export type LfoWaveform = 'sine' | 'triangle' | 'square' | 'sawtooth'
export type LfoTarget = 'detune' | 'amplitude' | 'beat'
export type FilterType = 'off' | 'lowpass' | 'highpass'
export type PadWaveform = 'sine' | 'triangle'

/** A normalized automation point. time 0–1 (fraction of session), value in lane-specific units. */
export type AutomationPoint = { time: number; value: number }

export type AutomationLanes = {
  volume: AutomationPoint[]      // 0–1
  filterCutoff: AutomationPoint[] // 20–20000 Hz
  beatFrequency: AutomationPoint[] // 0–40 Hz
}

export type AudioGraph = {
  context: AudioContext
  leftOsc: OscillatorNode
  rightOsc: OscillatorNode
  leftGain: GainNode
  rightGain: GainNode
  merger: ChannelMergerNode
  amGain: GainNode
  dcOffset: ConstantSourceNode | null
  filterNode: BiquadFilterNode
  /** Automation-controlled volume (0–1, default 1) */
  automationGain: GainNode
  masterGain: GainNode
  lfo: OscillatorNode
  lfoDepth: GainNode
  lfoTarget: LfoTarget
  noiseSource: AudioBufferSourceNode | null
  noiseGain: GainNode
}

export type SessionPreset = {
  name: string
  useIndependentTuning: boolean
  carrier: number
  beat: number
  leftFrequency: number
  rightFrequency: number
  wobbleRate: number
  wobbleDepth: number
  wobbleWaveform: LfoWaveform
  wobbleTarget: LfoTarget
  phaseOffset: number
  volume: number
  sessionMinutes: number
  fadeInSeconds: number
  fadeOutSeconds: number
  noiseType: NoiseType
  noiseVolume: number
}

export type JournalEntry = {
  id: string
  date: string
  presetName: string
  durationMinutes: number
  notes: string
}

export type PadSynthGraph = {
  context: AudioContext
  oscillators: OscillatorNode[]
  oscGains: GainNode[]
  dryGain: GainNode
  convolver: ConvolverNode
  wetGain: GainNode
  padMixGain: GainNode
  outputGain: GainNode
  breatheLfo: OscillatorNode
  breatheLfoGain: GainNode
  breatheDc: ConstantSourceNode
}

export type GraphParams = {
  leftFrequency: number
  rightFrequency: number
  wobbleRate: number
  wobbleDepth: number
  wobbleWaveform: LfoWaveform
  wobbleTarget: LfoTarget
  phaseOffset: number
  volume: number
  binauralVolume: number
  noiseType: NoiseType
  noiseVolume: number
  filterType: FilterType
  filterFrequency: number
  filterQ: number
}

export type PadParams = {
  carrier: number
  padVolume: number
  padReverbMix: number
  padWaveform: PadWaveform
  padBreatheRate: number
}

export type SessionPlan = {
  name: string
  totalMinutes: number
  crossfadeSec: number
  fadeInSec: number
  fadeOutSec: number
  music: {
    enabled: boolean
    trackIds: string[]
    volume: number
  }
  soundscape: {
    enabled: boolean
    sceneId: string
    volume: number
  }
  binaural: {
    enabled: boolean
    carrier: number
    beatStart: number
    beatEnd: number
    volume: number
  }
  noise: {
    enabled: boolean
    type: string
    volume: number
  }
  pad: {
    enabled: boolean
    volume: number
  }
}

// ---------------------------------------------------------------------------
// Studio
// ---------------------------------------------------------------------------
export type StudioLayerType = 'carrier' | 'beat' | 'soundscape' | 'noise' | 'pad' | 'music'

export type StudioLayer = {
  id: string
  type: StudioLayerType
  enabled: boolean
  volume: number
  label: string
  settings: Record<string, unknown>
  automation?: {
    beatFrequency?: AutomationPoint[]   // beat layer only
    volume?: AutomationPoint[]          // all other layers
  }
}

export type StudioScene = {
  id: string
  name: string
  durationMinutes: number
  crossfadeSec: number
  layers: StudioLayer[]
}

export type StudioJourney = {
  id: string
  name: string
  scenes: StudioScene[]
}

export type VoiceBus = {
  context: AudioContext
  source: AudioBufferSourceNode | null
  gainNode: GainNode
  reverbNode: ConvolverNode
  dryGain: GainNode
  wetGain: GainNode
  outputGain: GainNode
}
