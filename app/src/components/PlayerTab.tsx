import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
      // Static OFF display
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

      // Compute average level (0–1)
      let sum = 0
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i]
      const avg = sum / (bufferLength * 255)

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#e8f4ee'
      ctx.fillRect(0, 0, w, h)

      // Gradient bar
      const fillW = Math.round(avg * w)
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, '#3e8f72')
      grad.addColorStop(0.65, '#7ac96e')
      grad.addColorStop(0.85, '#e8b84b')
      grad.addColorStop(1.0, '#e05a3a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, fillW, h)

      // Segmented lines
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
    <canvas
      ref={canvasRef}
      className="player-vu-canvas"
      width={300}
      height={16}
    />
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
      .finally(() => {
        void audioCtx.close()
      })

    return () => {
      closed = true
    }
  }, [objectUrl])

  return (
    <canvas
      ref={canvasRef}
      className="player-waveform-canvas"
      width={400}
      height={48}
    />
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
  } = props

  const [showReverb, setShowReverb] = useState(false)

  const brainwave = getBrainwaveName(beat)
  const timerDisplay = formatTime(remainingSeconds)
  const soundscapeLabel = SOUNDSCAPE_LABELS[soundsceneId] ?? 'Custom'
  const progress = sessionTotalSeconds > 0
    ? Math.max(0, Math.min(1, 1 - remainingSeconds / sessionTotalSeconds))
    : 0

  return (
    <div className="player-skin">
      {/* ── Top bar: status + VU ── */}
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

      {/* ── LCD Display ── */}
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

      {/* ── Voice waveform ── */}
      {voiceObjectUrl && (
        <div className="player-waveform-wrap">
          <VoiceWaveform objectUrl={voiceObjectUrl} />
        </div>
      )}

      {/* ── Volume sliders ── */}
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

      {/* ── Play/Stop button ── */}
      <button
        className={`player-btn-start ${isRunning ? 'player-btn-start--active' : ''}`}
        onClick={onToggle}
      >
        {isRunning ? '■ STOP SESSION' : '▶ START SESSION'}
      </button>
    </div>
  )
}
