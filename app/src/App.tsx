import { useEffect, useRef, useState } from 'react'
import './App.css'

const PRESET_STORAGE_KEY = 'binaural-presets-v1'

type NoiseType = 'none' | 'white' | 'pink' | 'brown'
type LfoWaveform = 'sine' | 'triangle' | 'square' | 'sawtooth'
type LfoTarget = 'detune' | 'amplitude' | 'beat'

type AudioGraph = {
  context: AudioContext
  leftOsc: OscillatorNode
  rightOsc: OscillatorNode
  leftGain: GainNode
  rightGain: GainNode
  merger: ChannelMergerNode
  /** AM modulation gain node — sits between merger and masterGain */
  amGain: GainNode
  /** DC bias source for AM mode (keeps gain positive) */
  dcOffset: ConstantSourceNode | null
  masterGain: GainNode
  lfo: OscillatorNode
  lfoDepth: GainNode
  /** Tracks which target the LFO is currently wired to */
  lfoTarget: LfoTarget
  noiseSource: AudioBufferSourceNode | null
  noiseGain: GainNode
}

type SessionPreset = {
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

// ---------------------------------------------------------------------------
// Noise generation
// ---------------------------------------------------------------------------

function createNoiseSource(
  context: AudioContext,
  type: Exclude<NoiseType, 'none'>,
): AudioBufferSourceNode {
  const bufferSize = Math.ceil(context.sampleRate * 3)
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
  const data = buffer.getChannelData(0)

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.96900 * b2 + w * 0.1538520
      b3 = 0.86650 * b3 + w * 0.3104856
      b4 = 0.55000 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  } else {
    let last = 0
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      data[i] = last * 3.5
    }
  }

  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.start()
  return source
}

// ---------------------------------------------------------------------------
// End chime
// ---------------------------------------------------------------------------

function playEndChime(): void {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 432
  gain.gain.value = 0.18
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  gain.gain.setValueAtTime(0.18, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 2.2)
  osc.stop(ctx.currentTime + 2.3)
  osc.onended = () => { void ctx.close() }
}

// ---------------------------------------------------------------------------
// LFO wiring helpers
// ---------------------------------------------------------------------------

/**
 * Scales wobble depth to the right unit for the given LFO target.
 * detune / beat → raw cents value
 * amplitude → normalised 0–1 (depth slider 0–60 maps to 0–1 AM depth)
 */
function scaledLfoDepth(wobbleDepth: number, target: LfoTarget): number {
  return target === 'amplitude' ? wobbleDepth / 60 : wobbleDepth
}

/**
 * Disconnects the LFO depth node from all current targets, tears down any
 * DC offset source, and rewires everything for the new target.
 */
function reconnectLfo(graph: AudioGraph, newTarget: LfoTarget, wobbleDepth: number): void {
  // Sever all outgoing connections from lfoDepth
  try { graph.lfoDepth.disconnect() } catch { /* already disconnected */ }

  // Tear down AM DC bias if present
  if (graph.dcOffset) {
    try { graph.dcOffset.stop() } catch { /* ignore */ }
    try { graph.dcOffset.disconnect() } catch { /* ignore */ }
    graph.dcOffset = null
  }

  // Reset amGain to transparent pass-through
  graph.amGain.gain.cancelScheduledValues(graph.context.currentTime)
  graph.amGain.gain.setValueAtTime(1, graph.context.currentTime)

  graph.lfoTarget = newTarget
  graph.lfoDepth.gain.setValueAtTime(
    scaledLfoDepth(wobbleDepth, newTarget),
    graph.context.currentTime,
  )

  if (newTarget === 'detune') {
    graph.lfoDepth.connect(graph.leftOsc.detune)
    graph.lfoDepth.connect(graph.rightOsc.detune)
  } else if (newTarget === 'amplitude') {
    // ConstantSourceNode (value=1) + LFO keeps amGain always positive
    const dc = graph.context.createConstantSource()
    dc.offset.value = 1
    dc.connect(graph.amGain.gain)
    dc.start()
    graph.dcOffset = dc
    graph.lfoDepth.connect(graph.amGain.gain)
  } else {
    // beat: wobble only the right oscillator's detune → beat difference pulses
    graph.lfoDepth.connect(graph.rightOsc.detune)
  }
}

// ---------------------------------------------------------------------------
// Audio graph factory
// ---------------------------------------------------------------------------

type GraphParams = {
  leftFrequency: number
  rightFrequency: number
  wobbleRate: number
  wobbleDepth: number
  wobbleWaveform: LfoWaveform
  wobbleTarget: LfoTarget
  phaseOffset: number
  volume: number
  noiseType: NoiseType
  noiseVolume: number
}

function createAudioGraph(params: GraphParams): AudioGraph {
  const {
    leftFrequency, rightFrequency, wobbleRate, wobbleDepth,
    wobbleWaveform, wobbleTarget, phaseOffset,
    volume, noiseType, noiseVolume,
  } = params

  const context = new AudioContext()
  const now = context.currentTime

  // --- Oscillators ---
  const leftOsc = context.createOscillator()
  const rightOsc = context.createOscillator()
  leftOsc.type = 'sine'
  rightOsc.type = 'sine'
  leftOsc.frequency.value = leftFrequency
  rightOsc.frequency.value = rightFrequency

  // --- Per-channel gain (for future per-channel volume) ---
  const leftGain = context.createGain()
  const rightGain = context.createGain()
  leftGain.gain.value = 1
  rightGain.gain.value = 1

  // --- Stereo merge ---
  const merger = context.createChannelMerger(2)

  // --- AM gain node (transparent unless AM target active) ---
  const amGain = context.createGain()
  amGain.gain.value = 1

  // --- Master output ---
  const masterGain = context.createGain()
  masterGain.gain.value = volume

  // Signal path: L/R osc → per-channel gain → merger → amGain → masterGain → out
  leftOsc.connect(leftGain)
  rightOsc.connect(rightGain)
  leftGain.connect(merger, 0, 0)
  rightGain.connect(merger, 0, 1)
  merger.connect(amGain)
  amGain.connect(masterGain)
  masterGain.connect(context.destination)

  // --- LFO ---
  const lfo = context.createOscillator()
  lfo.type = wobbleWaveform
  lfo.frequency.value = wobbleRate
  const lfoDepth = context.createGain()
  lfoDepth.gain.value = scaledLfoDepth(wobbleDepth, wobbleTarget)
  lfo.connect(lfoDepth)

  // Wire LFO to chosen target
  let dcOffset: ConstantSourceNode | null = null
  if (wobbleTarget === 'detune') {
    lfoDepth.connect(leftOsc.detune)
    lfoDepth.connect(rightOsc.detune)
  } else if (wobbleTarget === 'amplitude') {
    const dc = context.createConstantSource()
    dc.offset.value = 1
    dc.connect(amGain.gain)
    dc.start(now)
    dcOffset = dc
    lfoDepth.connect(amGain.gain)
  } else {
    // beat
    lfoDepth.connect(rightOsc.detune)
  }

  // --- Noise layer ---
  const noiseGain = context.createGain()
  noiseGain.gain.value = noiseType !== 'none' ? noiseVolume : 0
  noiseGain.connect(masterGain)

  let noiseSource: AudioBufferSourceNode | null = null
  if (noiseType !== 'none') {
    noiseSource = createNoiseSource(context, noiseType)
    noiseSource.connect(noiseGain)
  }

  // --- Phase offset ---
  // Starting the right oscillator "in the past" gives an equivalent phase shift.
  // phaseDelay (seconds) = (phaseOffset / 360) / frequency
  const phaseDelay = phaseOffset > 0 ? (phaseOffset / 360) / rightFrequency : 0

  leftOsc.start(now)
  rightOsc.start(Math.max(0, now - phaseDelay))
  lfo.start(now)

  return {
    context,
    leftOsc,
    rightOsc,
    leftGain,
    rightGain,
    merger,
    amGain,
    dcOffset,
    masterGain,
    lfo,
    lfoDepth,
    lfoTarget: wobbleTarget,
    noiseSource,
    noiseGain,
  }
}

// ---------------------------------------------------------------------------
// Stop helper
// ---------------------------------------------------------------------------

function stopAudioGraph(graph: AudioGraph | null): void {
  if (!graph) return
  if (graph.noiseSource) {
    graph.noiseSource.stop()
    graph.noiseSource.disconnect()
  }
  if (graph.dcOffset) {
    graph.dcOffset.stop()
    graph.dcOffset.disconnect()
  }
  graph.lfo.stop()
  graph.leftOsc.stop()
  graph.rightOsc.stop()
  void graph.context.close()
}

// ---------------------------------------------------------------------------
// Preset persistence
// ---------------------------------------------------------------------------

function readSavedPresets(): SessionPreset[] {
  const raw = localStorage.getItem(PRESET_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as SessionPreset[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSavedPresets(presets: SessionPreset[]): void {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets))
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  // Frequency controls
  const [useIndependentTuning, setUseIndependentTuning] = useState(false)
  const [carrier, setCarrier] = useState(432)
  const [beat, setBeat] = useState(6)
  const [leftFrequency, setLeftFrequency] = useState(432)
  const [rightFrequency, setRightFrequency] = useState(438)

  // LFO / wobble
  const [wobbleRate, setWobbleRate] = useState(0.4)
  const [wobbleDepth, setWobbleDepth] = useState(8)
  const [wobbleWaveform, setWobbleWaveform] = useState<LfoWaveform>('sine')
  const [wobbleTarget, setWobbleTarget] = useState<LfoTarget>('detune')

  // Phase
  const [phaseOffset, setPhaseOffset] = useState(0)

  // Output
  const [volume, setVolume] = useState(0.2)

  // Session
  const [sessionMinutes, setSessionMinutes] = useState(10)
  const [fadeInSeconds, setFadeInSeconds] = useState(5)
  const [fadeOutSeconds, setFadeOutSeconds] = useState(5)

  // Noise
  const [noiseType, setNoiseType] = useState<NoiseType>('none')
  const [noiseVolume, setNoiseVolume] = useState(0.15)

  // Presets
  const [presetName, setPresetName] = useState('My Session')
  const [savedPresets, setSavedPresets] = useState<SessionPreset[]>([])
  const [selectedPresetName, setSelectedPresetName] = useState('')

  // Session state
  const [isRunning, setIsRunning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [sessionTotalSeconds, setSessionTotalSeconds] = useState(0)

  const graphRef = useRef<AudioGraph | null>(null)
  const fadeStopTimeoutRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  const sessionEndTimeoutRef = useRef<number | null>(null)

  // --- Timer helpers ---

  const clearSessionTimers = (): void => {
    if (fadeStopTimeoutRef.current !== null) {
      window.clearTimeout(fadeStopTimeoutRef.current)
      fadeStopTimeoutRef.current = null
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    if (sessionEndTimeoutRef.current !== null) {
      window.clearTimeout(sessionEndTimeoutRef.current)
      sessionEndTimeoutRef.current = null
    }
  }

  const stopSession = (useFade: boolean, withChime = false): void => {
    const graph = graphRef.current
    if (!graph) return

    clearSessionTimers()
    setRemainingSeconds(0)

    const now = graph.context.currentTime
    const fadeOut = useFade ? Math.max(0, fadeOutSeconds) : 0

    if (fadeOut <= 0) {
      stopAudioGraph(graph)
      graphRef.current = null
      setIsRunning(false)
      if (withChime) playEndChime()
      return
    }

    const currentGain = graph.masterGain.gain.value
    graph.masterGain.gain.cancelScheduledValues(now)
    graph.masterGain.gain.setValueAtTime(currentGain, now)
    graph.masterGain.gain.linearRampToValueAtTime(0.0001, now + fadeOut)

    fadeStopTimeoutRef.current = window.setTimeout(() => {
      stopAudioGraph(graphRef.current)
      graphRef.current = null
      setIsRunning(false)
      if (withChime) playEndChime()
      fadeStopTimeoutRef.current = null
    }, Math.ceil(fadeOut * 1000))
  }

  const startSessionTimers = (): void => {
    const totalSeconds = Math.max(0, Math.round(sessionMinutes * 60))
    setRemainingSeconds(totalSeconds)
    setSessionTotalSeconds(totalSeconds)
    if (totalSeconds <= 0) return

    let secondsLeft = totalSeconds
    countdownIntervalRef.current = window.setInterval(() => {
      secondsLeft -= 1
      setRemainingSeconds(Math.max(0, secondsLeft))
      if (secondsLeft <= 0 && countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }, 1000)

    const fadeOutStartMs = Math.max(totalSeconds - Math.max(0, fadeOutSeconds), 0) * 1000
    sessionEndTimeoutRef.current = window.setTimeout(() => {
      stopSession(true, true)
    }, Math.ceil(fadeOutStartMs))
  }

  // --- Preset helpers ---

  const buildCurrentPreset = (): SessionPreset => ({
    name: presetName.trim() || `Preset ${savedPresets.length + 1}`,
    useIndependentTuning,
    carrier,
    beat,
    leftFrequency,
    rightFrequency,
    wobbleRate,
    wobbleDepth,
    wobbleWaveform,
    wobbleTarget,
    phaseOffset,
    volume,
    sessionMinutes,
    fadeInSeconds,
    fadeOutSeconds,
    noiseType,
    noiseVolume,
  })

  const savePreset = (): void => {
    const next = buildCurrentPreset()
    const idx = savedPresets.findIndex((p) => p.name === next.name)
    const list = [...savedPresets]
    if (idx >= 0) {
      list[idx] = next
    } else {
      list.push(next)
    }
    setSavedPresets(list)
    setSelectedPresetName(next.name)
    writeSavedPresets(list)
  }

  const loadSelectedPreset = (): void => {
    const preset = savedPresets.find((p) => p.name === selectedPresetName)
    if (!preset) return
    setUseIndependentTuning(preset.useIndependentTuning)
    setCarrier(preset.carrier)
    setBeat(preset.beat)
    setLeftFrequency(preset.leftFrequency)
    setRightFrequency(preset.rightFrequency)
    setWobbleRate(preset.wobbleRate)
    setWobbleDepth(preset.wobbleDepth)
    setWobbleWaveform(preset.wobbleWaveform ?? 'sine')
    setWobbleTarget(preset.wobbleTarget ?? 'detune')
    setPhaseOffset(preset.phaseOffset ?? 0)
    setVolume(preset.volume)
    setSessionMinutes(preset.sessionMinutes)
    setFadeInSeconds(preset.fadeInSeconds)
    setFadeOutSeconds(preset.fadeOutSeconds)
    setNoiseType(preset.noiseType ?? 'none')
    setNoiseVolume(preset.noiseVolume ?? 0.15)
    setPresetName(preset.name)
  }

  const deleteSelectedPreset = (): void => {
    if (!selectedPresetName) return
    const list = savedPresets.filter((p) => p.name !== selectedPresetName)
    setSavedPresets(list)
    writeSavedPresets(list)
    setSelectedPresetName(list.length > 0 ? list[0].name : '')
  }

  // --- Toggle session ---

  const toggleAudio = async (): Promise<void> => {
    if (graphRef.current) {
      stopSession(true)
      return
    }

    clearSessionTimers()

    const graph = createAudioGraph({
      leftFrequency,
      rightFrequency,
      wobbleRate,
      wobbleDepth,
      wobbleWaveform,
      wobbleTarget,
      phaseOffset,
      volume,
      noiseType,
      noiseVolume,
    })

    if (graph.context.state !== 'running') {
      await graph.context.resume()
    }

    const now = graph.context.currentTime
    const safeVolume = Math.max(0.0001, volume)
    if (fadeInSeconds > 0) {
      graph.masterGain.gain.setValueAtTime(0.0001, now)
      graph.masterGain.gain.linearRampToValueAtTime(safeVolume, now + fadeInSeconds)
    } else {
      graph.masterGain.gain.setValueAtTime(safeVolume, now)
    }

    graphRef.current = graph
    setIsRunning(true)
    startSessionTimers()
  }

  // ---------------------------------------------------------------------------
  // Effects — live parameter updates while session is running
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const presets = readSavedPresets()
    setSavedPresets(presets)
    if (presets.length > 0) setSelectedPresetName(presets[0].name)
  }, [])

  // Sync carrier/beat → L/R frequencies in linked mode
  useEffect(() => {
    if (useIndependentTuning) return
    setLeftFrequency(carrier)
    setRightFrequency(carrier + beat)
  }, [carrier, beat, useIndependentTuning])

  // Oscillator frequencies
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.leftOsc.frequency.setValueAtTime(leftFrequency, graph.context.currentTime)
    graph.rightOsc.frequency.setValueAtTime(rightFrequency, graph.context.currentTime)
  }, [leftFrequency, rightFrequency])

  // LFO rate + depth
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.lfo.frequency.setValueAtTime(wobbleRate, graph.context.currentTime)
    graph.lfoDepth.gain.setValueAtTime(
      scaledLfoDepth(wobbleDepth, graph.lfoTarget),
      graph.context.currentTime,
    )
  }, [wobbleRate, wobbleDepth])

  // LFO waveform — can change on a live OscillatorNode
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.lfo.type = wobbleWaveform
  }, [wobbleWaveform])

  // LFO target — requires rewiring the graph
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    reconnectLfo(graph, wobbleTarget, wobbleDepth)
  }, [wobbleTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  // Master volume
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.masterGain.gain.setTargetAtTime(Math.max(0.0001, volume), graph.context.currentTime, 0.05)
  }, [volume])

  // Noise type swap
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    if (graph.noiseSource) {
      graph.noiseSource.stop()
      graph.noiseSource.disconnect()
      graph.noiseSource = null
    }
    if (noiseType !== 'none') {
      const source = createNoiseSource(graph.context, noiseType)
      source.connect(graph.noiseGain)
      graph.noiseSource = source
    }
    graph.noiseGain.gain.setValueAtTime(
      noiseType !== 'none' ? noiseVolume : 0,
      graph.context.currentTime,
    )
  }, [noiseType]) // eslint-disable-line react-hooks/exhaustive-deps

  // Noise volume
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.noiseGain.gain.setTargetAtTime(
      noiseType !== 'none' ? Math.max(0.0001, noiseVolume) : 0,
      graph.context.currentTime,
      0.05,
    )
  }, [noiseVolume, noiseType])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSessionTimers()
      stopAudioGraph(graphRef.current)
      graphRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const beatDifference = rightFrequency - leftFrequency
  const progressFraction =
    sessionTotalSeconds > 0 && remainingSeconds > 0
      ? 1 - remainingSeconds / sessionTotalSeconds
      : 0
  const timerDisplay =
    remainingSeconds > 0
      ? `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`
      : '00:00'

  const wobbleDepthLabel =
    wobbleTarget === 'amplitude'
      ? `${Math.round((wobbleDepth / 60) * 100)}% AM depth`
      : `${wobbleDepth.toFixed(1)} cents`

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Solfeggio + Binaural Beats</p>
        <h1>Binaural Engine MVP</h1>
        <p className="subtitle">
          Tune any carrier frequency, shape beat difference, and add wobble modulation.
          Headphones recommended.
        </p>
      </section>

      <section className="panel">
        {/* Readout */}
        <div className="readout">
          <div>
            <span>Left</span>
            <strong>{leftFrequency.toFixed(2)} Hz</strong>
          </div>
          <div>
            <span>Right</span>
            <strong>{rightFrequency.toFixed(2)} Hz</strong>
          </div>
          <div>
            <span>Beat</span>
            <strong>{beatDifference.toFixed(2)} Hz</strong>
          </div>
          <div>
            <span>Timer</span>
            <strong>{timerDisplay}</strong>
          </div>
        </div>

        {isRunning && sessionTotalSeconds > 0 && (
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(1, progressFraction) * 100}%` }}
            />
          </div>
        )}

        <button className="start-button" onClick={() => void toggleAudio()}>
          {isRunning ? 'Stop Session (Fade Out)' : 'Start Session'}
        </button>

        <div className="grid">

          {/* ── Frequency ── */}
          <div className="section-label">Frequency</div>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={useIndependentTuning}
              onChange={(e) => setUseIndependentTuning(e.target.checked)}
            />
            Independent Left / Right Tuning
          </label>

          {!useIndependentTuning && (
            <>
              <label>
                Carrier Frequency ({carrier.toFixed(1)} Hz)
                <input type="range" min={40} max={1200} step={0.1} value={carrier}
                  onChange={(e) => setCarrier(Number(e.target.value))} />
              </label>
              <label>
                Beat Difference ({beat.toFixed(2)} Hz)
                <input type="range" min={0} max={40} step={0.01} value={beat}
                  onChange={(e) => setBeat(Number(e.target.value))} />
              </label>
            </>
          )}

          {useIndependentTuning && (
            <>
              <label>
                Left Frequency ({leftFrequency.toFixed(2)} Hz)
                <input type="range" min={40} max={1200} step={0.01} value={leftFrequency}
                  onChange={(e) => setLeftFrequency(Number(e.target.value))} />
              </label>
              <label>
                Right Frequency ({rightFrequency.toFixed(2)} Hz)
                <input type="range" min={40} max={1200} step={0.01} value={rightFrequency}
                  onChange={(e) => setRightFrequency(Number(e.target.value))} />
              </label>
            </>
          )}

          {/* Phase offset */}
          <label>
            Phase Offset ({phaseOffset}°)
            <small className="control-hint">Applied at session start — restart to hear change</small>
            <input type="range" min={0} max={360} step={1} value={phaseOffset}
              onChange={(e) => setPhaseOffset(Number(e.target.value))} />
          </label>

          {/* ── Wobble / LFO ── */}
          <div className="section-label">Wobble / LFO</div>

          <label>
            LFO Waveform
            <div className="seg-control">
              {(['sine', 'triangle', 'square', 'sawtooth'] as LfoWaveform[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  className={wobbleWaveform === w ? 'active' : ''}
                  onClick={() => setWobbleWaveform(w)}
                >
                  {w.charAt(0).toUpperCase() + w.slice(1)}
                </button>
              ))}
            </div>
          </label>

          <label>
            LFO Target
            <div className="seg-control">
              {([
                ['detune', 'Carrier Detune'],
                ['amplitude', 'Amplitude (AM)'],
                ['beat', 'Beat Freq'],
              ] as [LfoTarget, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={wobbleTarget === val ? 'active' : ''}
                  onClick={() => setWobbleTarget(val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </label>

          <label>
            Wobble Rate ({wobbleRate.toFixed(2)} Hz)
            <input type="range" min={0} max={12} step={0.01} value={wobbleRate}
              onChange={(e) => setWobbleRate(Number(e.target.value))} />
          </label>

          <label>
            Wobble Depth ({wobbleDepthLabel})
            <input type="range" min={0} max={60} step={0.1} value={wobbleDepth}
              onChange={(e) => setWobbleDepth(Number(e.target.value))} />
          </label>

          {/* ── Session ── */}
          <div className="section-label">Session</div>

          <label>
            Session Length ({sessionMinutes.toFixed(0)} min)
            <input type="range" min={1} max={180} step={1} value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Number(e.target.value))} />
          </label>
          <label>
            Fade In ({fadeInSeconds.toFixed(0)} sec)
            <input type="range" min={0} max={60} step={1} value={fadeInSeconds}
              onChange={(e) => setFadeInSeconds(Number(e.target.value))} />
          </label>
          <label>
            Fade Out ({fadeOutSeconds.toFixed(0)} sec)
            <input type="range" min={0} max={60} step={1} value={fadeOutSeconds}
              onChange={(e) => setFadeOutSeconds(Number(e.target.value))} />
          </label>

          <label>
            Output Volume ({Math.round(volume * 100)}%)
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => setVolume(Number(e.target.value))} />
          </label>

          {/* ── Noise ── */}
          <div className="section-label">Ambient Noise Layer</div>

          <label>
            Noise Type
            <select className="text-input" value={noiseType}
              onChange={(e) => setNoiseType(e.target.value as NoiseType)}>
              <option value="none">Off</option>
              <option value="white">White</option>
              <option value="pink">Pink</option>
              <option value="brown">Brown</option>
            </select>
          </label>

          {noiseType !== 'none' && (
            <label>
              Noise Volume ({Math.round(noiseVolume * 100)}%)
              <input type="range" min={0} max={1} step={0.01} value={noiseVolume}
                onChange={(e) => setNoiseVolume(Number(e.target.value))} />
            </label>
          )}

          {/* ── Presets ── */}
          <div className="preset-panel">
            <div className="section-label" style={{ borderTop: 'none', paddingTop: 0 }}>Presets</div>
            <label>
              Preset Name
              <input className="text-input" type="text" value={presetName}
                onChange={(e) => setPresetName(e.target.value)} />
            </label>
            <div className="preset-actions">
              <button type="button" className="soft-button" onClick={savePreset}>
                Save Preset
              </button>
            </div>
            <label>
              Load Preset
              <select className="text-input" value={selectedPresetName}
                onChange={(e) => setSelectedPresetName(e.target.value)}>
                <option value="">Select a preset</option>
                {savedPresets.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </label>
            <div className="preset-actions">
              <button type="button" className="soft-button" onClick={loadSelectedPreset}>
                Load Selected
              </button>
              <button type="button" className="soft-button soft-button--danger"
                onClick={deleteSelectedPreset} disabled={!selectedPresetName}>
                Delete
              </button>
            </div>
          </div>

        </div>
      </section>

      <p className="footnote">
        Safety: keep volume low at session start. Use headphones for full binaural effect. Avoid therapeutic claims.
      </p>
    </main>
  )
}

export default App
