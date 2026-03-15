import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MoodSliders = {
  ground: number
  relax: number
  focus: number
  dream: number
  ascend: number
}

type PlayerTabProps = {
  isRunning: boolean
  carrier: number
  beat: number
  remainingSeconds: number
  sessionTotalSeconds: number
  soundsceneId: string
  volume: number
  setVolume: (v: number) => void
  binauralVolume: number
  setBinauralVolume: (v: number) => void
  noiseVolume: number
  setNoiseVolume: (v: number) => void
  voiceVolume: number
  setVoiceVolume: (v: number) => void
  voiceReverb: number
  setVoiceReverb: (v: number) => void
  analyserNode: AnalyserNode | null
  voiceObjectUrl: string | null
  onToggle: () => void
  setCarrier: (v: number) => void
  setBeat: (v: number) => void
  setWobbleRate: (v: number) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getBrainwaveName(beat: number): string {
  if (beat < 4) return 'Delta'
  if (beat < 8) return 'Theta'
  if (beat < 14) return 'Alpha'
  if (beat < 30) return 'Beta'
  return 'Gamma'
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const SOUNDSCAPE_LABELS: Record<string, string> = {
  off: 'No soundscape',
  ocean: 'Ocean Waves',
  forest: 'Forest',
  rain: 'Rain',
  cave: 'Cave Ambience',
  storm: 'Thunderstorm',
  space: 'Space Drift',
  custom: 'Custom Mix',
}

// Brainwave zone config
const BRAINWAVE_ZONES = [
  { label: 'δ', name: 'Delta', min: 0, max: 4, color: '#7b68ee' },
  { label: 'θ', name: 'Theta', min: 4, max: 8, color: '#5b9bd5' },
  { label: 'α', name: 'Alpha', min: 8, max: 14, color: '#3e8f72' },
  { label: 'β', name: 'Beta', min: 14, max: 30, color: '#e8b84b' },
  { label: 'γ', name: 'Gamma', min: 30, max: 100, color: '#e05a3a' },
]

const MAX_HZ = 100

// Quick preset pills
const QUICK_PILLS = [
  { emoji: '😴', label: 'Sleep',    desc: 'Deep delta waves for restful sleep',       carrier: 174, beat: 2.0,  mood: { ground: 0.8, relax: 0.6, focus: 0, dream: 0.3, ascend: 0 } },
  { emoji: '🎯', label: 'Focus',    desc: 'Beta focus for work & study',              carrier: 396, beat: 14.0, mood: { ground: 0, relax: 0, focus: 0.9, dream: 0, ascend: 0.2 } },
  { emoji: '🧘', label: 'Meditate', desc: 'Theta stillness for deep meditation',      carrier: 528, beat: 6.0,  mood: { ground: 0.2, relax: 0.5, focus: 0, dream: 0.7, ascend: 0.1 } },
  { emoji: '💡', label: 'Flow',     desc: 'Alpha-beta blend for creative flow',       carrier: 741, beat: 10.0, mood: { ground: 0, relax: 0.4, focus: 0.4, dream: 0.2, ascend: 0 } },
  { emoji: '✨', label: 'Lucid',    desc: 'Theta dreaming & vivid imagination',       carrier: 936, beat: 4.0,  mood: { ground: 0, relax: 0.3, focus: 0, dream: 0.8, ascend: 0.3 } },
  { emoji: '🌅', label: 'Rise',     desc: 'Energising beta to start your day',        carrier: 396, beat: 18.0, mood: { ground: 0, relax: 0, focus: 0.7, dream: 0, ascend: 0.5 } },
]

// Mood slider metadata
const MOOD_META = [
  { key: 'ground' as const, label: 'GROUND', hint: 'δ 1.5Hz', color: '#7b68ee' },
  { key: 'relax'  as const, label: 'RELAX',  hint: 'α 9Hz',   color: '#5b9bd5' },
  { key: 'focus'  as const, label: 'FOCUS',  hint: 'β 18Hz',  color: '#e8b84b' },
  { key: 'dream'  as const, label: 'DREAM',  hint: 'θ 6Hz',   color: '#3e8f72' },
  { key: 'ascend' as const, label: 'ASCEND', hint: 'γ 40Hz',  color: '#e05a3a' },
]

// Anti-Mood metadata — negative states that map to healing frequencies
type AntiMoodKey = 'angry' | 'anxious' | 'sad' | 'scattered' | 'exhausted'
type AntiMoodSliders = Record<AntiMoodKey, number>

const ANTI_MOOD_META: { key: AntiMoodKey; label: string; hint: string; color: string; fixLabel: string }[] = [
  { key: 'angry',     label: 'ANGRY',     hint: '→ calm',    color: '#e05a3a', fixLabel: 'Calm' },
  { key: 'anxious',   label: 'ANXIOUS',   hint: '→ ground',  color: '#7b68ee', fixLabel: 'Ground' },
  { key: 'sad',       label: 'SAD',       hint: '→ uplift',  color: '#5b9bd5', fixLabel: 'Uplift' },
  { key: 'scattered', label: 'SCATTERED', hint: '→ focus',   color: '#e8b84b', fixLabel: 'Focus' },
  { key: 'exhausted', label: 'EXHAUSTED', hint: '→ energize',color: '#3e8f72', fixLabel: 'Energize' },
]

function applyAntiMoodSliders(
  sliders: AntiMoodSliders,
  setCarrier: (v: number) => void,
  setBeat: (v: number) => void,
  setWobbleRate: (v: number) => void,
): void {
  // Each anti-mood drives toward its healing recipe
  // angry → theta 6Hz + 396Hz (release tension)
  // anxious → delta 2Hz + 174Hz (deep grounding)
  // sad → alpha/beta 10Hz + 528Hz (heart opening)
  // scattered → low beta 14Hz + 852Hz (mental clarity)
  // exhausted → mid beta 18Hz + 396Hz (activation)
  const recipes: Record<AntiMoodKey, { carrier: number; beat: number; wobble: number }> = {
    angry:     { carrier: 396, beat: 6.0,  wobble: 0.15 },
    anxious:   { carrier: 174, beat: 2.0,  wobble: 0.08 },
    sad:       { carrier: 528, beat: 10.0, wobble: 0.3  },
    scattered: { carrier: 852, beat: 14.0, wobble: 0.6  },
    exhausted: { carrier: 396, beat: 18.0, wobble: 0.5  },
  }

  let carrierTarget = 0, beatTarget = 0, wobbleTarget = 0, totalWeight = 0
  for (const [k, recipe] of Object.entries(recipes) as [AntiMoodKey, typeof recipes[AntiMoodKey]][]) {
    const w = sliders[k]
    if (w > 0) {
      carrierTarget += recipe.carrier * w
      beatTarget    += recipe.beat    * w
      wobbleTarget  += recipe.wobble  * w
      totalWeight   += w
    }
  }

  if (totalWeight > 0) {
    setCarrier(Math.round(carrierTarget / totalWeight))
    setBeat(Math.round((beatTarget / totalWeight) * 10) / 10)
    setWobbleRate(Math.max(0.05, Math.min(4, wobbleTarget / totalWeight)))
  } else {
    // All sliders zeroed — reset to neutral defaults
    setCarrier(432)
    setBeat(10.0)
    setWobbleRate(0.4)
  }
}

// ---------------------------------------------------------------------------
// applyMoodSliders
// ---------------------------------------------------------------------------
function applyMoodSliders(
  sliders: MoodSliders,
  setCarrier: (v: number) => void,
  setBeat: (v: number) => void,
  setWobbleRate: (v: number) => void,
): void {
  let carrierTarget = 0, carrierWeight = 0
  if (sliders.ground > 0) { carrierTarget += 174 * sliders.ground; carrierWeight += sliders.ground }
  if (sliders.dream > 0)  { carrierTarget += 528 * sliders.dream;  carrierWeight += sliders.dream }
  if (sliders.ascend > 0) { carrierTarget += 852 * sliders.ascend; carrierWeight += sliders.ascend }
  if (carrierWeight > 0) setCarrier(Math.round(carrierTarget / carrierWeight))
  else setCarrier(432)

  let beatTarget = 0, beatWeight = 0
  if (sliders.ground > 0) { beatTarget += 1.5  * sliders.ground; beatWeight += sliders.ground }
  if (sliders.relax > 0)  { beatTarget += 9.0  * sliders.relax;  beatWeight += sliders.relax }
  if (sliders.focus > 0)  { beatTarget += 18.0 * sliders.focus;  beatWeight += sliders.focus }
  if (sliders.dream > 0)  { beatTarget += 6.0  * sliders.dream;  beatWeight += sliders.dream }
  if (sliders.ascend > 0) { beatTarget += 40.0 * sliders.ascend; beatWeight += sliders.ascend }
  if (beatWeight > 0) setBeat(Math.round(beatTarget / beatWeight * 10) / 10)
  else setBeat(10.0)

  let wobbleRate = 0.4
  if (sliders.relax > 0)  wobbleRate = Math.max(wobbleRate, 0.15 * sliders.relax)
  if (sliders.focus > 0)  wobbleRate = Math.max(wobbleRate, 0.6  * sliders.focus)
  if (sliders.dream > 0)  wobbleRate = Math.min(wobbleRate, 0.08 + (1 - sliders.dream) * 0.4)
  setWobbleRate(Math.max(0.05, Math.min(4, wobbleRate)))
}

// ---------------------------------------------------------------------------
// VU Meter canvas
// ---------------------------------------------------------------------------
function VuMeter({ analyserNode }: { analyserNode: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!analyserNode) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#dbe4dd'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#9ab5aa'
      ctx.font = '9px system-ui'
      ctx.textBaseline = 'middle'
      ctx.fillText('OFF', 6, canvas.height / 2)
      return
    }

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      analyserNode.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i]
      const avg = sum / (bufferLength * 255)
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#e8f4ee'
      ctx.fillRect(0, 0, w, h)
      const fillW = Math.round(avg * w)
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, '#3e8f72')
      grad.addColorStop(0.65, '#7ac96e')
      grad.addColorStop(0.85, '#e8b84b')
      grad.addColorStop(1.0, '#e05a3a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, fillW, h)
      ctx.fillStyle = '#e8f4ee'
      for (let i = 1; i < 20; i++) {
        const x = Math.round((i / 20) * w)
        ctx.fillRect(x, 0, 1, h)
      }
    }

    draw()
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [analyserNode])

  return (
    <canvas ref={canvasRef} className="player-vu-canvas" width={300} height={16} />
  )
}

// ---------------------------------------------------------------------------
// Oscilloscope
// ---------------------------------------------------------------------------
function Oscilloscope({ analyserNode }: { analyserNode: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawEmpty = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = '#f5faf7'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = '#c8ddd5'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      ctx.stroke()
    }

    if (!analyserNode) {
      drawEmpty()
      return
    }

    const bufferLength = analyserNode.fftSize
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      analyserNode.getByteTimeDomainData(dataArray)
      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = '#f5faf7'
      ctx.fillRect(0, 0, w, h)
      // Centerline
      ctx.strokeStyle = '#c8ddd5'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      ctx.stroke()
      // Waveform
      ctx.strokeStyle = '#3e8f72'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      const sliceWidth = w / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * h) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.stroke()
    }

    draw()
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [analyserNode])

  return (
    <div>
      <div className="player-section-label">Waveform</div>
      <canvas ref={canvasRef} className="player-oscilloscope" width={400} height={80} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Frequency Spectrum
// ---------------------------------------------------------------------------
function FrequencySpectrum({ analyserNode }: { analyserNode: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const peaksRef = useRef<number[]>(new Array(32).fill(0))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const NUM_BARS = 32
    const peaks = peaksRef.current

    const drawEmpty = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = '#f5faf7'
      ctx.fillRect(0, 0, w, h)
      const gap = 2
      const barW = (w - gap * (NUM_BARS - 1)) / NUM_BARS
      for (let i = 0; i < NUM_BARS; i++) {
        const x = i * (barW + gap)
        ctx.fillStyle = '#dbe4dd'
        ctx.fillRect(x, h - 2, barW, 2)
      }
    }

    if (!analyserNode) {
      drawEmpty()
      return
    }

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount)

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      analyserNode.getByteFrequencyData(dataArray)

      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = '#f5faf7'
      ctx.fillRect(0, 0, w, h)

      const gap = 2
      const barW = (w - gap * (NUM_BARS - 1)) / NUM_BARS
      const binStep = Math.floor(dataArray.length / NUM_BARS)

      for (let i = 0; i < NUM_BARS; i++) {
        let sum = 0
        for (let j = 0; j < binStep; j++) {
          sum += dataArray[i * binStep + j]
        }
        const val = sum / binStep // 0–255

        // Decay peak
        peaks[i] = Math.max(peaks[i] - 2, val)
        const barH = Math.max(2, (peaks[i] / 255) * h)

        const x = i * (barW + gap)
        const y = h - barH

        // Gradient: green at bottom, amber/orange at top for high bars
        const grad = ctx.createLinearGradient(x, y, x, h)
        const norm = peaks[i] / 255
        if (norm > 0.75) {
          grad.addColorStop(0, '#e05a3a')
          grad.addColorStop(0.4, '#e8b84b')
          grad.addColorStop(1, '#3e8f72')
        } else {
          grad.addColorStop(0, '#7ac96e')
          grad.addColorStop(1, '#3e8f72')
        }
        ctx.fillStyle = grad
        ctx.fillRect(x, y, barW, barH)
      }
    }

    draw()
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [analyserNode])

  return (
    <div>
      <div className="player-section-label">Spectrum</div>
      <canvas ref={canvasRef} className="player-spectrum" width={400} height={80} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Voice waveform canvas
// ---------------------------------------------------------------------------
function VoiceWaveform({ objectUrl }: { objectUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let closed = false
    const audioCtx = new AudioContext()

    fetch(objectUrl)
      .then(r => r.arrayBuffer())
      .then(buf => audioCtx.decodeAudioData(buf))
      .then(decoded => {
        if (closed) return
        const data = decoded.getChannelData(0)
        const w = canvas.width
        const h = canvas.height
        const step = Math.ceil(data.length / w)
        const mid = h / 2
        ctx.clearRect(0, 0, w, h)
        ctx.fillStyle = '#f0f8f4'
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = '#3e8f72'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = 0; x < w; x++) {
          let min = 1, max = -1
          for (let j = 0; j < step; j++) {
            const idx = x * step + j
            if (idx < data.length) {
              if (data[idx] < min) min = data[idx]
              if (data[idx] > max) max = data[idx]
            }
          }
          const y1 = mid + min * mid * 0.9
          const y2 = mid + max * mid * 0.9
          if (x === 0) ctx.moveTo(x, y1)
          ctx.lineTo(x, y1)
          ctx.lineTo(x, y2)
        }
        ctx.stroke()
      })
      .catch(() => { /* hide gracefully */ })
      .finally(() => { void audioCtx.close() })

    return () => { closed = true }
  }, [objectUrl])

  return (
    <canvas ref={canvasRef} className="player-waveform-canvas" width={400} height={48} />
  )
}

// ---------------------------------------------------------------------------
// Brainwave Band Indicator
// ---------------------------------------------------------------------------
function BrainwaveBand({ beat }: { beat: number }) {
  // Compute dot position as percentage along the full 0–100Hz bar
  const clampedBeat = Math.min(beat, MAX_HZ)
  const dotPct = (clampedBeat / MAX_HZ) * 100

  return (
    <div>
      <div className="player-section-label">Brainwave</div>
      <div className="player-brainwave-bar">
        {/* Zone labels row */}
        <div className="player-brainwave-zones">
          {BRAINWAVE_ZONES.map(z => (
            <div
              key={z.name}
              className="player-brainwave-zone"
              style={{
                flex: z.max - z.min,
                backgroundColor: z.color,
              }}
            >
              <span className="player-brainwave-zone-label">{z.label}</span>
              <span className="player-brainwave-zone-name">{z.name}</span>
            </div>
          ))}
        </div>
        {/* Dot row */}
        <div className="player-brainwave-dot-row">
          <div
            className="player-brainwave-dot"
            style={{ left: `${dotPct}%` }}
            title={`${beat.toFixed(1)} Hz`}
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Session Intensity Ring
// ---------------------------------------------------------------------------
function SessionRing({
  remainingSeconds,
  sessionTotalSeconds,
  isRunning,
  beat,
}: {
  remainingSeconds: number
  sessionTotalSeconds: number
  isRunning: boolean
  beat: number
}) {
  const r = 50
  const cx = 60
  const cy = 60
  const circumference = 2 * Math.PI * r

  const progress = isRunning && sessionTotalSeconds > 0
    ? Math.max(0, Math.min(1, 1 - remainingSeconds / sessionTotalSeconds))
    : 0

  const dashOffset = circumference * (1 - progress)
  const timeLabel = isRunning ? formatTime(remainingSeconds) : 'Ready'
  const brainwaveLabel = getBrainwaveName(beat)

  return (
    <div className="player-ring-wrap">
      <svg className="player-ring-svg" width={120} height={120} viewBox="0 0 120 120">
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#dbe4dd"
          strokeWidth={6}
        />
        {/* Progress */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#3e8f72"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dashoffset 1s linear' }}
        />
        {/* Center time */}
        <text
          x={cx} y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={18}
          fontWeight={700}
          fill="#1a3329"
          className="player-ring-text"
        >
          {timeLabel}
        </text>
        {/* Brainwave label */}
        <text
          x={cx} y={cy + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill="#7a9a8a"
        >
          {brainwaveLabel}
        </text>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Mood Equalizer (Mood + Anti-Mood modes)
// ---------------------------------------------------------------------------
function MoodEqualizer({
  sliders,
  antiSliders,
  mode,
  onMode,
  onChange,
  onAntiChange,
}: {
  sliders: MoodSliders
  antiSliders: AntiMoodSliders
  mode: 'mood' | 'anti'
  onMode: (m: 'mood' | 'anti') => void
  onChange: (k: keyof MoodSliders, v: number) => void
  onAntiChange: (k: AntiMoodKey, v: number) => void
}) {
  return (
    <div>
      {/* Tab toggle */}
      <div className="mood-eq-tabs">
        <button
          className={`mood-eq-tab ${mode === 'mood' ? 'mood-eq-tab--active' : ''}`}
          onClick={() => onMode('mood')}
        >Mood EQ</button>
        <button
          className={`mood-eq-tab ${mode === 'anti' ? 'mood-eq-tab--active' : ''}`}
          onClick={() => onMode('anti')}
        >Anti-Mood</button>
      </div>

      {mode === 'mood' ? (
        <div className="player-mood-eq">
          {MOOD_META.map(m => (
            <div key={m.key} className="player-mood-col">
              <span className="player-mood-label" style={{ color: m.color }}>{m.label}</span>
              <div className="player-mood-slider-wrap">
                <input
                  type="range"
                  className="player-mood-slider"
                  min={0} max={1} step={0.01}
                  value={sliders[m.key]}
                  onChange={e => onChange(m.key, Number(e.target.value))}
                />
              </div>
              <span className="player-mood-hint">{m.hint}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="player-mood-eq">
          {ANTI_MOOD_META.map(m => (
            <div key={m.key} className="player-mood-col">
              <span className="player-mood-label" style={{ color: m.color }}>{m.label}</span>
              <div className="player-mood-slider-wrap">
                <input
                  type="range"
                  className="player-mood-slider"
                  min={0} max={1} step={0.01}
                  value={antiSliders[m.key]}
                  onChange={e => onAntiChange(m.key, Number(e.target.value))}
                />
              </div>
              <span className="player-mood-hint">{m.hint}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Intent Cards (replaces Quick Preset Pills as hero UI)
// ---------------------------------------------------------------------------
function IntentCards({
  activePill,
  onPill,
}: {
  activePill: string | null
  onPill: (pill: typeof QUICK_PILLS[number]) => void
}) {
  return (
    <div className="player-intent-grid">
      {QUICK_PILLS.map(p => (
        <button
          key={p.label}
          className={`player-intent-card ${activePill === p.label ? 'player-intent-card--active' : ''}`}
          onClick={() => onPill(p)}
        >
          <span className="player-intent-emoji">{p.emoji}</span>
          <span className="player-intent-label">{p.label}</span>
          <span className="player-intent-desc">{p.desc}</span>
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Volume row
// ---------------------------------------------------------------------------
function VolRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="player-vol-row">
      <span className="player-vol-label">{label.toUpperCase().slice(0, 6).padEnd(6)}</span>
      <input
        className="player-vol-slider"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
      <span className="player-vol-value">{Math.round(value * 100)}%</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PlayerTab
// ---------------------------------------------------------------------------
export function PlayerTab(props: PlayerTabProps) {
  const {
    isRunning, carrier, beat, remainingSeconds, sessionTotalSeconds,
    soundsceneId,
    volume, setVolume,
    binauralVolume, setBinauralVolume,
    noiseVolume, setNoiseVolume,
    voiceVolume, setVoiceVolume,
    voiceReverb, setVoiceReverb,
    analyserNode, voiceObjectUrl,
    onToggle,
    setCarrier, setBeat, setWobbleRate,
  } = props

  const [showReverb, setShowReverb] = useState(false)
  const [moodSliders, setMoodSliders] = useState<MoodSliders>({
    ground: 0, relax: 0, focus: 0, dream: 0, ascend: 0,
  })
  const [activePill, setActivePill] = useState<string | null>(null)
  const [moodMode, setMoodMode] = useState<'mood' | 'anti'>('mood')
  const [antiSliders, setAntiSliders] = useState<AntiMoodSliders>({
    angry: 0, anxious: 0, sad: 0, scattered: 0, exhausted: 0,
  })
  const [showHzControls, setShowHzControls] = useState<boolean>(() => {
    try { return localStorage.getItem('liminal-power-user') === 'true' } catch { return false }
  })

  const brainwave = getBrainwaveName(beat)
  const timerDisplay = formatTime(remainingSeconds)
  const soundscapeLabel = SOUNDSCAPE_LABELS[soundsceneId] ?? 'Custom'
  const progress = sessionTotalSeconds > 0
    ? Math.max(0, Math.min(1, 1 - remainingSeconds / sessionTotalSeconds))
    : 0

  const handleMoodChange = (k: keyof MoodSliders, v: number) => {
    const next = { ...moodSliders, [k]: v }
    setMoodSliders(next)
    setActivePill(null)
    applyMoodSliders(next, setCarrier, setBeat, setWobbleRate)
  }

  const handlePill = (pill: typeof QUICK_PILLS[number]) => {
    setActivePill(pill.label)
    setMoodSliders(pill.mood)
    setCarrier(pill.carrier)
    setBeat(pill.beat)
    applyMoodSliders(pill.mood, setCarrier, setBeat, setWobbleRate)
  }

  const handleAntiMoodChange = (k: AntiMoodKey, v: number) => {
    const next = { ...antiSliders, [k]: v }
    setAntiSliders(next)
    applyAntiMoodSliders(next, setCarrier, setBeat, setWobbleRate)
  }

  return (
    <div className="player-skin">
      {/* ── 1. Top bar: status + VU ── */}
      <div className="player-topbar">
        <div className="player-status-dots">
          <span className={`player-dot player-dot--rec ${isRunning ? 'player-dot--active-rec' : ''}`}>●REC</span>
          <span className={`player-dot ${isRunning ? 'player-dot--active' : ''}`}>▶PLAY</span>
          <span className={`player-dot ${!isRunning ? 'player-dot--active' : ''}`}>■STOP</span>
        </div>
        <div className="player-vu-wrap">
          <span className="player-vu-label">VU</span>
          <VuMeter analyserNode={analyserNode} />
        </div>
      </div>

      {/* ── 2. Session Intensity Ring ── */}
      <SessionRing
        remainingSeconds={remainingSeconds}
        sessionTotalSeconds={sessionTotalSeconds}
        isRunning={isRunning}
        beat={beat}
      />

      {/* ── 3. LCD Display ── */}
      <div className="player-lcd">
        <div className={`player-lcd-inner ${!isRunning ? 'player-lcd--dim' : ''}`}>
          <div className="player-lcd-text">
            ◈ {carrier.toFixed(1)} Hz — {brainwave} {beat.toFixed(1)} Hz beat
          </div>
          <div className="player-lcd-text">
            {isRunning ? '▶' : '◼'} {isRunning ? 'Session Active' : 'Ready'} · {timerDisplay} remain
          </div>
          <div className="player-lcd-text">
            ⬡ {soundscapeLabel}
          </div>
        </div>
      </div>

      {/* ── Scrub bar ── */}
      <div className="player-scrub-row">
        <input
          type="range"
          className="player-scrub"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          readOnly
          onChange={() => {/* display only */}}
        />
        <span className="player-scrub-time">{timerDisplay}</span>
      </div>

      {/* ── 4. Oscilloscope ── */}
      <Oscilloscope analyserNode={analyserNode} />

      {/* ── 5. Frequency Spectrum ── */}
      <FrequencySpectrum analyserNode={analyserNode} />

      {/* ── 6. Voice Waveform ── */}
      {voiceObjectUrl && (
        <div className="player-waveform-wrap">
          <VoiceWaveform objectUrl={voiceObjectUrl} />
        </div>
      )}

      {/* ── 7. Brainwave Band ── */}
      <BrainwaveBand beat={beat} />

      {/* ── 8. Intent Cards (hero UI) ── */}
      <div className="player-section-label">Choose Your Intent</div>
      <IntentCards activePill={activePill} onPill={handlePill} />

      {/* ── 9. Hz Power-user panel ── */}
      <div className="player-hz-header">
        <span className="player-section-label" style={{ marginBottom: 0 }}>Frequency</span>
        <button
          className={`player-hz-toggle ${showHzControls ? 'player-hz-toggle--active' : ''}`}
          onClick={() => {
            const next = !showHzControls
            setShowHzControls(next)
            try { localStorage.setItem('liminal-power-user', String(next)) } catch { /* ignore */ }
          }}
        >
          ⚙ Hz
        </button>
      </div>

      {showHzControls && (
        <div className="player-hz-panel">
          {/* Carrier slider */}
          <div className="player-vol-row">
            <span className="player-vol-label">CARRIER</span>
            <input
              className="player-vol-slider"
              type="range"
              min={40} max={1200} step={1}
              value={carrier}
              onChange={e => { setCarrier(Number(e.target.value)); setActivePill(null) }}
            />
            <span className="player-vol-value">{carrier} Hz</span>
          </div>
          {/* Beat slider */}
          <div className="player-vol-row">
            <span className="player-vol-label">BEAT</span>
            <input
              className="player-vol-slider"
              type="range"
              min={0} max={40} step={0.1}
              value={beat}
              onChange={e => { setBeat(Number(e.target.value)); setActivePill(null) }}
            />
            <span className="player-vol-value">{beat.toFixed(1)} Hz</span>
          </div>
          {/* Mood EQ */}
          <MoodEqualizer
            sliders={moodSliders}
            antiSliders={antiSliders}
            mode={moodMode}
            onMode={setMoodMode}
            onChange={handleMoodChange}
            onAntiChange={handleAntiMoodChange}
          />
        </div>
      )}

      {/* ── 10. Volume sliders ── */}
      <div className="player-vol-section">
        <div className="player-vol-section-label">Volume</div>
        <VolRow label="MASTER" value={volume} onChange={setVolume} />
        <VolRow label="TONES" value={binauralVolume} onChange={setBinauralVolume} />
        <VolRow label="SOUNDS" value={noiseVolume} onChange={setNoiseVolume} />
        <div className="player-vol-voice-wrap">
          <div className="player-vol-row">
            <span className="player-vol-label">VOICE </span>
            <input
              className="player-vol-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={voiceVolume}
              onChange={e => setVoiceVolume(Number(e.target.value))}
            />
            <span className="player-vol-value">{Math.round(voiceVolume * 100)}%</span>
            <button
              className="player-reverb-toggle"
              onClick={() => setShowReverb(v => !v)}
              title="Toggle reverb"
            >
              {showReverb ? '▲' : '▼'}
            </button>
          </div>
          {showReverb && (
            <div className="player-vol-row player-vol-row--sub">
              <span className="player-vol-label">REVERB</span>
              <input
                className="player-vol-slider"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={voiceReverb}
                onChange={e => setVoiceReverb(Number(e.target.value))}
              />
              <span className="player-vol-value">{Math.round(voiceReverb * 100)}%</span>
              <span style={{ width: '18px' }} />
            </div>
          )}
        </div>
      </div>

      {/* ── 11. Play/Stop button ── */}
      <button
        className={`player-btn-start ${isRunning ? 'player-btn-start--active' : ''}`}
        onClick={onToggle}
      >
        {isRunning ? '■ STOP SESSION' : '▶ START SESSION'}
      </button>
    </div>
  )
}
