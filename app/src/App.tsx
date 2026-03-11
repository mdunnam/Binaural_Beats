import { useEffect, useRef, useState } from 'react'
import './App.css'

const PRESET_STORAGE_KEY = 'binaural-presets-v1'

type NoiseType = 'none' | 'white' | 'pink' | 'brown'

type AudioGraph = {
  context: AudioContext
  leftOsc: OscillatorNode
  rightOsc: OscillatorNode
  leftGain: GainNode
  rightGain: GainNode
  merger: ChannelMergerNode
  masterGain: GainNode
  lfo: OscillatorNode
  lfoDepth: GainNode
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
  volume: number
  sessionMinutes: number
  fadeInSeconds: number
  fadeOutSeconds: number
  noiseType: NoiseType
  noiseVolume: number
}

/**
 * Generates a noise AudioBufferSourceNode for the given noise colour.
 */
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
    // brown noise
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

/**
 * Plays a short 432 Hz sine tone as a session-end chime.
 */
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

/**
 * Builds the binaural audio graph with optional noise layer.
 */
function createAudioGraph(
  leftFrequency: number,
  rightFrequency: number,
  wobbleRate: number,
  wobbleDepth: number,
  volume: number,
  noiseType: NoiseType,
  noiseVolume: number,
): AudioGraph {
  const context = new AudioContext()

  const leftOsc = context.createOscillator()
  const rightOsc = context.createOscillator()
  leftOsc.type = 'sine'
  rightOsc.type = 'sine'

  const leftGain = context.createGain()
  const rightGain = context.createGain()
  leftGain.gain.value = 1
  rightGain.gain.value = 1

  const merger = context.createChannelMerger(2)
  const masterGain = context.createGain()
  masterGain.gain.value = volume

  const lfo = context.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = wobbleRate
  const lfoDepth = context.createGain()
  lfoDepth.gain.value = wobbleDepth

  leftOsc.frequency.value = leftFrequency
  rightOsc.frequency.value = rightFrequency

  leftOsc.connect(leftGain)
  rightOsc.connect(rightGain)

  leftGain.connect(merger, 0, 0)
  rightGain.connect(merger, 0, 1)
  merger.connect(masterGain)
  masterGain.connect(context.destination)

  lfo.connect(lfoDepth)
  lfoDepth.connect(leftOsc.detune)
  lfoDepth.connect(rightOsc.detune)

  const noiseGain = context.createGain()
  noiseGain.gain.value = noiseType !== 'none' ? noiseVolume : 0
  noiseGain.connect(masterGain)

  let noiseSource: AudioBufferSourceNode | null = null
  if (noiseType !== 'none') {
    noiseSource = createNoiseSource(context, noiseType)
    noiseSource.connect(noiseGain)
  }

  leftOsc.start()
  rightOsc.start()
  lfo.start()

  return {
    context,
    leftOsc,
    rightOsc,
    leftGain,
    rightGain,
    merger,
    masterGain,
    lfo,
    lfoDepth,
    noiseSource,
    noiseGain,
  }
}

/**
 * Stops and closes the active audio graph safely.
 */
function stopAudioGraph(graph: AudioGraph | null): void {
  if (!graph) {
    return
  }

  if (graph.noiseSource) {
    graph.noiseSource.stop()
    graph.noiseSource.disconnect()
  }
  graph.lfo.stop()
  graph.leftOsc.stop()
  graph.rightOsc.stop()
  void graph.context.close()
}

/**
 * Reads saved presets from localStorage.
 */
function readSavedPresets(): SessionPreset[] {
  const rawValue = localStorage.getItem(PRESET_STORAGE_KEY)
  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as SessionPreset[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

/**
 * Writes presets to localStorage.
 */
function writeSavedPresets(presets: SessionPreset[]): void {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets))
}

function App() {
  const [useIndependentTuning, setUseIndependentTuning] = useState(false)
  const [carrier, setCarrier] = useState(432)
  const [beat, setBeat] = useState(6)
  const [leftFrequency, setLeftFrequency] = useState(432)
  const [rightFrequency, setRightFrequency] = useState(438)
  const [wobbleRate, setWobbleRate] = useState(0.4)
  const [wobbleDepth, setWobbleDepth] = useState(8)
  const [volume, setVolume] = useState(0.2)
  const [sessionMinutes, setSessionMinutes] = useState(10)
  const [fadeInSeconds, setFadeInSeconds] = useState(5)
  const [fadeOutSeconds, setFadeOutSeconds] = useState(5)

  const [noiseType, setNoiseType] = useState<NoiseType>('none')
  const [noiseVolume, setNoiseVolume] = useState(0.15)

  const [presetName, setPresetName] = useState('My Session')
  const [savedPresets, setSavedPresets] = useState<SessionPreset[]>([])
  const [selectedPresetName, setSelectedPresetName] = useState('')

  const [isRunning, setIsRunning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [sessionTotalSeconds, setSessionTotalSeconds] = useState(0)

  const graphRef = useRef<AudioGraph | null>(null)
  const fadeStopTimeoutRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  const sessionEndTimeoutRef = useRef<number | null>(null)

  /**
   * Clears any active session timers to prevent duplicate stop events.
   */
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

  /**
   * Stops the current graph either immediately or using a fade-out.
   * Pass withChime=true when the session ends naturally via the timer.
   */
  const stopSession = (useFade: boolean, withChime = false): void => {
    const graph = graphRef.current
    if (!graph) {
      return
    }

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

  /**
   * Starts timer countdown and schedules automatic session end.
   */
  const startSessionTimers = (): void => {
    const totalSeconds = Math.max(0, Math.round(sessionMinutes * 60))
    setRemainingSeconds(totalSeconds)
    setSessionTotalSeconds(totalSeconds)

    if (totalSeconds <= 0) {
      return
    }

    let secondsLeft = totalSeconds
    countdownIntervalRef.current = window.setInterval(() => {
      secondsLeft -= 1
      setRemainingSeconds(Math.max(0, secondsLeft))
      if (secondsLeft <= 0 && countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }, 1000)

    const fadeOutStartSeconds = Math.max(totalSeconds - Math.max(0, fadeOutSeconds), 0)
    sessionEndTimeoutRef.current = window.setTimeout(() => {
      stopSession(true, true)
    }, Math.ceil(fadeOutStartSeconds * 1000))
  }

  /**
   * Converts the current controls into a preset payload.
   */
  const buildCurrentPreset = (): SessionPreset => {
    return {
      name: presetName.trim() || `Preset ${savedPresets.length + 1}`,
      useIndependentTuning,
      carrier,
      beat,
      leftFrequency,
      rightFrequency,
      wobbleRate,
      wobbleDepth,
      volume,
      sessionMinutes,
      fadeInSeconds,
      fadeOutSeconds,
      noiseType,
      noiseVolume,
    }
  }

  /**
   * Saves or overwrites a preset by name.
   */
  const savePreset = (): void => {
    const nextPreset = buildCurrentPreset()
    const existingIndex = savedPresets.findIndex((preset) => preset.name === nextPreset.name)
    const nextPresets = [...savedPresets]
    if (existingIndex >= 0) {
      nextPresets[existingIndex] = nextPreset
    } else {
      nextPresets.push(nextPreset)
    }

    setSavedPresets(nextPresets)
    setSelectedPresetName(nextPreset.name)
    writeSavedPresets(nextPresets)
  }

  /**
   * Loads the selected preset into state.
   */
  const loadSelectedPreset = (): void => {
    const preset = savedPresets.find((item) => item.name === selectedPresetName)
    if (!preset) {
      return
    }

    setUseIndependentTuning(preset.useIndependentTuning)
    setCarrier(preset.carrier)
    setBeat(preset.beat)
    setLeftFrequency(preset.leftFrequency)
    setRightFrequency(preset.rightFrequency)
    setWobbleRate(preset.wobbleRate)
    setWobbleDepth(preset.wobbleDepth)
    setVolume(preset.volume)
    setSessionMinutes(preset.sessionMinutes)
    setFadeInSeconds(preset.fadeInSeconds)
    setFadeOutSeconds(preset.fadeOutSeconds)
    setNoiseType(preset.noiseType ?? 'none')
    setNoiseVolume(preset.noiseVolume ?? 0.15)
    setPresetName(preset.name)
  }

  /**
   * Deletes the currently selected preset from state and localStorage.
   */
  const deleteSelectedPreset = (): void => {
    if (!selectedPresetName) return
    const nextPresets = savedPresets.filter((p) => p.name !== selectedPresetName)
    setSavedPresets(nextPresets)
    writeSavedPresets(nextPresets)
    setSelectedPresetName(nextPresets.length > 0 ? nextPresets[0].name : '')
  }

  const toggleAudio = async (): Promise<void> => {
    if (graphRef.current) {
      stopSession(true)
      return
    }

    clearSessionTimers()

    const graph = createAudioGraph(leftFrequency, rightFrequency, wobbleRate, wobbleDepth, volume, noiseType, noiseVolume)
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

  useEffect(() => {
    const presets = readSavedPresets()
    setSavedPresets(presets)
    if (presets.length > 0) {
      setSelectedPresetName(presets[0].name)
    }
  }, [])

  useEffect(() => {
    if (useIndependentTuning) {
      return
    }

    setLeftFrequency(carrier)
    setRightFrequency(carrier + beat)
  }, [carrier, beat, useIndependentTuning])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) {
      return
    }

    graph.leftOsc.frequency.setValueAtTime(leftFrequency, graph.context.currentTime)
    graph.rightOsc.frequency.setValueAtTime(rightFrequency, graph.context.currentTime)
  }, [leftFrequency, rightFrequency])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) {
      return
    }

    graph.lfo.frequency.setValueAtTime(wobbleRate, graph.context.currentTime)
    graph.lfoDepth.gain.setValueAtTime(wobbleDepth, graph.context.currentTime)
  }, [wobbleRate, wobbleDepth])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) {
      return
    }

    graph.masterGain.gain.setTargetAtTime(Math.max(0.0001, volume), graph.context.currentTime, 0.05)
  }, [volume])

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

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.noiseGain.gain.setTargetAtTime(
      noiseType !== 'none' ? Math.max(0.0001, noiseVolume) : 0,
      graph.context.currentTime,
      0.05,
    )
  }, [noiseVolume, noiseType])

  useEffect(() => {
    return () => {
      clearSessionTimers()
      stopAudioGraph(graphRef.current)
      graphRef.current = null
    }
  }, [])

  const beatDifference = rightFrequency - leftFrequency

  const progressFraction =
    sessionTotalSeconds > 0 && remainingSeconds > 0
      ? 1 - remainingSeconds / sessionTotalSeconds
      : 0

  const timerDisplay =
    remainingSeconds > 0
      ? `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`
      : '00:00'

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
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={useIndependentTuning}
              onChange={(event) => setUseIndependentTuning(event.target.checked)}
            />
            Independent Left/Right Tuning
          </label>

          {!useIndependentTuning && (
            <>
              <label>
                Carrier Frequency ({carrier.toFixed(1)} Hz)
                <input
                  type="range"
                  min={40}
                  max={1200}
                  step={0.1}
                  value={carrier}
                  onChange={(event) => setCarrier(Number(event.target.value))}
                />
              </label>

              <label>
                Beat Difference ({beat.toFixed(2)} Hz)
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={0.01}
                  value={beat}
                  onChange={(event) => setBeat(Number(event.target.value))}
                />
              </label>
            </>
          )}

          {useIndependentTuning && (
            <>
              <label>
                Left Frequency ({leftFrequency.toFixed(2)} Hz)
                <input
                  type="range"
                  min={40}
                  max={1200}
                  step={0.01}
                  value={leftFrequency}
                  onChange={(event) => setLeftFrequency(Number(event.target.value))}
                />
              </label>

              <label>
                Right Frequency ({rightFrequency.toFixed(2)} Hz)
                <input
                  type="range"
                  min={40}
                  max={1200}
                  step={0.01}
                  value={rightFrequency}
                  onChange={(event) => setRightFrequency(Number(event.target.value))}
                />
              </label>
            </>
          )}

          <label>
            Session Length ({sessionMinutes.toFixed(0)} min)
            <input
              type="range"
              min={1}
              max={180}
              step={1}
              value={sessionMinutes}
              onChange={(event) => setSessionMinutes(Number(event.target.value))}
            />
          </label>

          <label>
            Fade In ({fadeInSeconds.toFixed(0)} sec)
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={fadeInSeconds}
              onChange={(event) => setFadeInSeconds(Number(event.target.value))}
            />
          </label>

          <label>
            Fade Out ({fadeOutSeconds.toFixed(0)} sec)
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={fadeOutSeconds}
              onChange={(event) => setFadeOutSeconds(Number(event.target.value))}
            />
          </label>

          <label>
            Wobble Rate ({wobbleRate.toFixed(2)} Hz)
            <input
              type="range"
              min={0}
              max={12}
              step={0.01}
              value={wobbleRate}
              onChange={(event) => setWobbleRate(Number(event.target.value))}
            />
          </label>

          <label>
            Wobble Depth ({wobbleDepth.toFixed(1)} cents)
            <input
              type="range"
              min={0}
              max={60}
              step={0.1}
              value={wobbleDepth}
              onChange={(event) => setWobbleDepth(Number(event.target.value))}
            />
          </label>

          <label>
            Output Volume ({Math.round(volume * 100)}%)
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>

          <div className="section-label">Ambient Noise Layer</div>

          <label>
            Noise Type
            <select
              className="text-input"
              value={noiseType}
              onChange={(event) => setNoiseType(event.target.value as NoiseType)}
            >
              <option value="none">Off</option>
              <option value="white">White</option>
              <option value="pink">Pink</option>
              <option value="brown">Brown</option>
            </select>
          </label>

          {noiseType !== 'none' && (
            <label>
              Noise Volume ({Math.round(noiseVolume * 100)}%)
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={noiseVolume}
                onChange={(event) => setNoiseVolume(Number(event.target.value))}
              />
            </label>
          )}

          <div className="preset-panel">
            <div className="section-label">Presets</div>
            <label>
              Preset Name
              <input
                className="text-input"
                type="text"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
              />
            </label>

            <div className="preset-actions">
              <button type="button" className="soft-button" onClick={savePreset}>
                Save Preset
              </button>
            </div>

            <label>
              Load Preset
              <select
                className="text-input"
                value={selectedPresetName}
                onChange={(event) => setSelectedPresetName(event.target.value)}
              >
                <option value="">Select a preset</option>
                {savedPresets.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="preset-actions">
              <button type="button" className="soft-button" onClick={loadSelectedPreset}>
                Load Selected
              </button>
              <button
                type="button"
                className="soft-button soft-button--danger"
                onClick={deleteSelectedPreset}
                disabled={!selectedPresetName}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </section>
      <p className="footnote">
        Safety: keep volume low at session start and avoid therapeutic claims in product copy.
      </p>
    </main>
  )
}

export default App
