import { useRef, useState, useCallback, useEffect } from 'react'
import { loadPadPresets, savePadPreset, deletePadPreset } from '../data/padPresets'
import type { PadPreset } from '../data/padPresets'

const NOTE_FREQS: Record<string, number> = {
  'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
  'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
  'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88,
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SHARP_NOTES = new Set(['C#', 'D#', 'F#', 'G#', 'A#'])

const CHORD_INTERVALS: Record<string, number[]> = {
  'Root':    [0],
  'Power':   [0, 7],
  'Major':   [0, 4, 7],
  'Minor':   [0, 3, 7],
  'Sus4':    [0, 5, 7],
  'Major 7': [0, 4, 7, 11],
}

function makeReverbIR(ctx: AudioContext, duration = 3, decay = 2): AudioBuffer {
  const rate = ctx.sampleRate
  const length = rate * duration
  const buf = ctx.createBuffer(2, length, rate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return buf
}

export function PadSynth() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [waveform, setWaveform] = useState<OscillatorType>('triangle')
  const [rootNote, setRootNote] = useState('A')
  const [octave, setOctave] = useState(3)
  const [chordMode, setChordMode] = useState('Major')
  const [detune, setDetune] = useState(20)
  const [attack, setAttack] = useState(2)
  const [decay, setDecay] = useState(0.5)
  const [sustain, setSustain] = useState(0.8)
  const [release, setRelease] = useState(4)
  const [filterCutoff, setFilterCutoff] = useState(4000)
  const [filterQ, setFilterQ] = useState(1.5)
  const [reverbMix, setReverbMix] = useState(0.5)
  const [masterVolume, setMasterVolume] = useState(0.7)

  // Preset state
  const [presets, setPresets] = useState<PadPreset[]>(() => loadPadPresets())
  const [presetName, setPresetName] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')

  function handleSavePreset() {
    if (!presetName.trim()) return
    const preset: PadPreset = {
      name: presetName.trim(),
      waveform, rootNote, octave, chordMode, detune,
      attack, decay, sustain, release,
      filterCutoff, filterQ, reverbMix, masterVolume
    }
    savePadPreset(preset)
    setPresets(loadPadPresets())
    setPresetName('')
  }

  function handleLoadPreset(name: string) {
    const p = presets.find(pr => pr.name === name)
    if (!p) return
    setWaveform(p.waveform)
    setRootNote(p.rootNote)
    setOctave(p.octave)
    setChordMode(p.chordMode)
    setDetune(p.detune)
    setAttack(p.attack)
    setDecay(p.decay)
    setSustain(p.sustain)
    setRelease(p.release)
    setFilterCutoff(p.filterCutoff)
    setFilterQ(p.filterQ)
    setReverbMix(p.reverbMix)
    setMasterVolume(p.masterVolume)
    setSelectedPreset(name)
  }

  function handleDeletePreset() {
    if (!selectedPreset) return
    deletePadPreset(selectedPreset)
    setPresets(loadPadPresets())
    setSelectedPreset('')
  }

  const ctxRef = useRef<AudioContext | null>(null)
  const voiceGainsRef = useRef<GainNode[]>([])
  const masterGainRef = useRef<GainNode | null>(null)
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const dryGainRef = useRef<GainNode | null>(null)
  const wetGainRef = useRef<GainNode | null>(null)
  const releaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current)
      ctxRef.current?.close()
    }
  }, [])

  const startPad = useCallback(() => {
    if (isPlaying) return

    // Clear any pending release timeout from a previous stop
    if (releaseTimeoutRef.current) { clearTimeout(releaseTimeoutRef.current); releaseTimeoutRef.current = null }

    const ctx = new AudioContext()
    ctxRef.current = ctx

    const masterGain = ctx.createGain()
    masterGain.gain.value = masterVolume
    masterGainRef.current = masterGain
    masterGainRef.current = masterGain

    // Filter
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = filterCutoff
    filter.Q.value = filterQ
    filterRef.current = filter
    filterRef.current = filter

    // Reverb
    const convolver = ctx.createConvolver()
    convolver.buffer = makeReverbIR(ctx, 3, 2)
    const dryGain = ctx.createGain()
    const wetGain = ctx.createGain()
    dryGain.gain.value = 1 - reverbMix
    wetGain.gain.value = reverbMix
    dryGainRef.current = dryGain
    wetGainRef.current = wetGain
    dryGainRef.current = dryGain
    wetGainRef.current = wetGain
    filter.connect(dryGain)
    filter.connect(convolver)
    convolver.connect(wetGain)
    dryGain.connect(masterGain)
    wetGain.connect(masterGain)
    masterGain.connect(ctx.destination)

    // Chorus: 3 delays with LFO each
    const chorusOutput = ctx.createGain()
    chorusOutput.gain.value = 0.4
    chorusOutput.connect(filter)

    const DELAY_TIMES = [0.015, 0.025, 0.035]
    DELAY_TIMES.forEach((delayTime) => {
      const delay = ctx.createDelay(0.1)
      delay.delayTime.value = delayTime
      delay.connect(chorusOutput)

      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.3
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 0.003
      lfo.connect(lfoGain)
      lfoGain.connect(delay.delayTime)
      lfo.start()
    })

    // Direct (dry signal to filter)
    const directToFilter = ctx.createGain()
    directToFilter.gain.value = 1
    directToFilter.connect(filter)

    const intervals = CHORD_INTERVALS[chordMode]
    const voiceGains: GainNode[] = []

    intervals.forEach((semitones) => {
      const baseFreq = NOTE_FREQS[rootNote] * Math.pow(2, (octave - 4) + semitones / 12)
      const PANS = [-0.6, -0.2, 0.2, 0.6]
      const DETUNE_OFFSETS = [-detune * 0.5, -detune * 0.15, detune * 0.15, detune * 0.5]

      const voiceGain = ctx.createGain()
      voiceGain.gain.setValueAtTime(0, ctx.currentTime)
      voiceGain.gain.linearRampToValueAtTime(sustain, ctx.currentTime + attack)
      if (decay > 0) {
        voiceGain.gain.setTargetAtTime(sustain * 0.9, ctx.currentTime + attack, decay / 3)
      }
      // Also connect to chorus input
      voiceGain.connect(directToFilter)
      voiceGain.connect(chorusOutput)
      voiceGains.push(voiceGain)

      PANS.forEach((pan, i) => {
        const osc = ctx.createOscillator()
        osc.type = waveform
        osc.frequency.value = baseFreq
        osc.detune.value = DETUNE_OFFSETS[i]

        const panner = ctx.createStereoPanner()
        panner.pan.value = pan

        const oscGain = ctx.createGain()
        oscGain.gain.value = 0.25

        osc.connect(oscGain)
        oscGain.connect(panner)
        panner.connect(voiceGain)
        osc.start()
      })
    })

    voiceGainsRef.current = voiceGains
    setIsPlaying(true)
  }, [isPlaying, waveform, rootNote, octave, chordMode, detune, attack, decay, sustain, release, filterCutoff, filterQ, reverbMix, masterVolume])

  const stopPad = useCallback(() => {
    if (!isPlaying || !ctxRef.current) return
    const ctx = ctxRef.current
    const now = ctx.currentTime

    voiceGainsRef.current.forEach(g => {
      g.gain.cancelScheduledValues(now)
      g.gain.setValueAtTime(g.gain.value, now)
      g.gain.linearRampToValueAtTime(0, now + release)
    })

    releaseTimeoutRef.current = setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close().catch(() => {})
      if (ctxRef.current === ctx) { ctxRef.current = null }
      voiceGainsRef.current = []
      setIsPlaying(false)
    }, (release + 0.5) * 1000)
  }, [isPlaying, release])


  // Live parameter updates — no restart needed
  useEffect(() => { if (masterGainRef.current) masterGainRef.current.gain.setTargetAtTime(masterVolume, ctxRef.current?.currentTime ?? 0, 0.02) }, [masterVolume])
  useEffect(() => { if (filterRef.current) filterRef.current.frequency.setTargetAtTime(filterCutoff, ctxRef.current?.currentTime ?? 0, 0.02) }, [filterCutoff])
  useEffect(() => { if (filterRef.current) filterRef.current.Q.setTargetAtTime(filterQ, ctxRef.current?.currentTime ?? 0, 0.02) }, [filterQ])
  useEffect(() => {
    if (dryGainRef.current) dryGainRef.current.gain.setTargetAtTime(1 - reverbMix, ctxRef.current?.currentTime ?? 0, 0.02)
    if (wetGainRef.current) wetGainRef.current.gain.setTargetAtTime(reverbMix, ctxRef.current?.currentTime ?? 0, 0.02)
  }, [reverbMix])

  // Params that require restart — auto-restart if playing
  const restartIfPlaying = useCallback(() => {
    if (!isPlaying) return
    stopPad()
    // Small delay to let release begin, then restart
    setTimeout(() => { startPad() }, 100)
  }, [isPlaying, stopPad, startPad])

  useEffect(() => { restartIfPlaying() }, [waveform, rootNote, octave, chordMode, detune, attack, decay, sustain]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="tab-sections">
      {/* Root & Chord */}
      <div className="section-block">
        <div className="section-card">
          <div className="section-label">Root &amp; Chord</div>
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Note</div>
            <div className="pad-note-grid">
              {NOTES.map(note => (
                <button
                  key={note}
                  className={`pad-note-btn${SHARP_NOTES.has(note) ? ' pad-sharp' : ''}${rootNote === note ? ' pad-note-btn--active' : ''}`}
                  onClick={() => setRootNote(note)}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Octave</div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[3, 4, 5].map(o => (
                  <button
                    key={o}
                    className={`pad-note-btn${octave === o ? ' pad-note-btn--active' : ''}`}
                    onClick={() => setOctave(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Chord</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {Object.keys(CHORD_INTERVALS).map(mode => (
                <button
                  key={mode}
                  className={`pad-note-btn${chordMode === mode ? ' pad-note-btn--active' : ''}`}
                  onClick={() => setChordMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div className="section-block">
        <div className="section-card">
          <div className="section-label">Waveform</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['sine', 'triangle', 'sawtooth'] as OscillatorType[]).map(w => (
              <button
                key={w}
                className={`pad-note-btn${waveform === w ? ' pad-note-btn--active' : ''}`}
                style={{ flex: 1, textTransform: 'capitalize' }}
                onClick={() => setWaveform(w)}
              >
                {w}
              </button>
            ))}
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <label className="control-label">
              Detune Spread: <span className="control-value">{detune} cents</span>
            </label>
            <input type="range" min={0} max={50} step={1} value={detune}
              onChange={e => setDetune(Number(e.target.value))} className="slider" />
          </div>
        </div>
      </div>

      {/* ADSR */}
      <div className="section-block">
        <div className="section-card">
          <div className="section-label">ADSR Envelope</div>
          <div className="pad-adsr-grid">
            <div>
              <label className="control-label">Attack: <span className="control-value">{attack.toFixed(2)}s</span></label>
              <input type="range" min={0.01} max={8} step={0.01} value={attack}
                onChange={e => setAttack(Number(e.target.value))} className="slider" />
            </div>
            <div>
              <label className="control-label">Decay: <span className="control-value">{decay.toFixed(2)}s</span></label>
              <input type="range" min={0.1} max={4} step={0.01} value={decay}
                onChange={e => setDecay(Number(e.target.value))} className="slider" />
            </div>
            <div>
              <label className="control-label">Sustain: <span className="control-value">{sustain.toFixed(2)}</span></label>
              <input type="range" min={0} max={1} step={0.01} value={sustain}
                onChange={e => setSustain(Number(e.target.value))} className="slider" />
            </div>
            <div>
              <label className="control-label">Release: <span className="control-value">{release.toFixed(2)}s</span></label>
              <input type="range" min={0.5} max={10} step={0.1} value={release}
                onChange={e => setRelease(Number(e.target.value))} className="slider" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="section-block">
        <div className="section-card">
          <div className="section-label">Filter</div>
          <div>
            <label className="control-label">Cutoff: <span className="control-value">{filterCutoff >= 1000 ? (filterCutoff / 1000).toFixed(1) + 'kHz' : filterCutoff + 'Hz'}</span></label>
            <input type="range" min={Math.log(200)} max={Math.log(18000)} step={0.01}
              value={Math.log(filterCutoff)}
              onChange={e => setFilterCutoff(Math.round(Math.exp(Number(e.target.value))))}
              className="slider" />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <label className="control-label">Resonance (Q): <span className="control-value">{filterQ.toFixed(1)}</span></label>
            <input type="range" min={0.5} max={12} step={0.1} value={filterQ}
              onChange={e => setFilterQ(Number(e.target.value))} className="slider" />
          </div>
        </div>
      </div>

      {/* Effects */}
      <div className="section-block">
        <div className="section-card">
          <div className="section-label">Effects</div>
          <div>
            <label className="control-label">Reverb Mix: <span className="control-value">{Math.round(reverbMix * 100)}%</span></label>
            <input type="range" min={0} max={1} step={0.01} value={reverbMix}
              onChange={e => setReverbMix(Number(e.target.value))} className="slider" />
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="section-block">
        <div className="section-title">Presets</div>
        <div className="section-card">
          <label>Preset Name
            <input className="text-input" type="text" value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="e.g. Deep Dream Pad" />
          </label>
          <div className="preset-actions">
            <button className="soft-button" onClick={handleSavePreset}>Save Preset</button>
          </div>
          <hr className="section-divider" />
          <label>Load Preset
            <select className="text-input" value={selectedPreset}
              onChange={e => { setSelectedPreset(e.target.value); handleLoadPreset(e.target.value) }}>
              <option value="">Select a preset</option>
              {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </label>
          <div className="preset-actions">
            <button className="soft-button soft-button--danger"
              onClick={handleDeletePreset}
              disabled={!selectedPreset}>Delete</button>
          </div>
        </div>
      </div>

      {/* Output + Play */}
      <div className="section-block">
        <div className="section-card">
          <div className="section-label">Output</div>
          <div>
            <label className="control-label">Master Volume: <span className="control-value">{Math.round(masterVolume * 100)}%</span></label>
            <input type="range" min={0} max={1} step={0.01} value={masterVolume}
              onChange={e => setMasterVolume(Number(e.target.value))} className="slider" />
          </div>
          <button
            className={`pad-play-btn${isPlaying ? ' pad-play-btn--stop' : ''}`}
            onClick={isPlaying ? stopPad : startPad}
          >
            {isPlaying ? '■ Stop' : '▶ Play Pad'}
          </button>
        </div>
      </div>
    </div>
  )
}
