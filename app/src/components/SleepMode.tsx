import { useState } from 'react'
import type { Journey } from '../engine/journeyEngine'
import { IconMoon } from './Icons'

// ── Stage definitions ─────────────────────────────────────────────────────────
const STAGE_DEFS = [
  { label: 'Settling',   beat: 14, wobbleRate: 0.15, color: '#e8b84b', pct: 0.10, band: 'Beta'  },
  { label: 'Relaxing',   beat: 10, wobbleRate: 0.10, color: '#3e8f72', pct: 0.15, band: 'Alpha' },
  { label: 'Drifting',   beat: 6,  wobbleRate: 0.07, color: '#5b9bd5', pct: 0.25, band: 'Theta' },
  { label: 'Deep Sleep', beat: 2,  wobbleRate: 0.03, color: '#7b68ee', pct: 0.50, band: 'Delta' },
]

const DURATIONS = [
  { label: '2 hrs', hours: 2 },
  { label: '4 hrs', hours: 4 },
  { label: '6 hrs', hours: 6 },
  { label: '8 hrs', hours: 8 },
]

export function buildSleepJourney(hours: number): Journey {
  const totalMinutes = hours * 60
  return {
    id: 'sleep-descent',
    name: 'Sleep Descent',
    stages: STAGE_DEFS.map((s, i) => ({
      id: `sleep-${i}`,
      label: s.label,
      carrier: 174,
      beat: s.beat,
      wobbleRate: s.wobbleRate,
      durationMinutes: Math.round(totalMinutes * s.pct),
      soundsceneId: 'rain',
      color: s.color,
    })),
  }
}

function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

type Props = {
  isRunning: boolean
  remainingSeconds: number
  sessionTotalSeconds: number
  activeStageIndex: number
  onStart: (hours: number) => void
  onStop: () => void
}

export function SleepMode({ isRunning, remainingSeconds, activeStageIndex, onStart, onStop }: Props) {
  const [selectedHours, setSelectedHours] = useState(8)

  const stageIdx = Math.max(0, Math.min(activeStageIndex, STAGE_DEFS.length - 1))
  const stage = STAGE_DEFS[stageIdx]

  return (
    <div className="sleep-mode">

      {/* Header */}
      <div className="sleep-header">
        <div className="sleep-moon"><IconMoon size={36} /></div>
        <h2 className="sleep-title">Sleep Mode</h2>
        <p className="sleep-subtitle">A guided descent from waking mind to deep sleep.</p>
      </div>

      {/* Duration picker — hidden while running */}
      {!isRunning && (
        <div className="sleep-section">
          <span className="section-label">Session length</span>
          <div className="sleep-dur-row">
            {DURATIONS.map(d => (
              <button
                key={d.hours}
                className={`seg-btn${selectedHours === d.hours ? ' seg-btn--active' : ''}`}
                onClick={() => setSelectedHours(d.hours)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stage bar — always visible, highlights active stage when running */}
      <div className="sleep-section">
        <span className="section-label">Descent journey</span>
        <div className="sleep-stage-bar">
          {STAGE_DEFS.map((s, i) => (
            <div
              key={s.label}
              className="sleep-stage-seg"
              style={{
                flex: s.pct,
                borderColor: s.color + '88',
                opacity: isRunning && i > stageIdx ? 0.35 : 1,
              }}
            >
              <div
                className="sleep-seg-swatch"
                style={{
                  background: s.color,
                  boxShadow: isRunning && i === stageIdx ? `0 0 7px ${s.color}` : 'none',
                }}
              />
              <span className="sleep-seg-name">{s.label}</span>
              <span className="sleep-seg-band">{s.band} · {s.beat} Hz</span>
              <span className="sleep-seg-dur">
                {isRunning && i === stageIdx
                  ? <span style={{ color: s.color, fontWeight: 700 }}>now</span>
                  : `${Math.round(selectedHours * 60 * s.pct)} min`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Compact status strip — shown when running */}
      {isRunning && (
        <div className="mode-status-strip" style={{ borderColor: stage.color + '55' }}>
          <span className="mode-status-stage" style={{ color: stage.color }}>{stage.label}</span>
          <span className="mode-status-band">{stage.band} · {stage.beat} Hz</span>
          <span className="mode-status-time">{formatHMS(remainingSeconds)}</span>
        </div>
      )}

      {/* Params */}
      <div className="sleep-section sleep-params">
        <div className="sleep-param"><span>Carrier</span><strong>174 Hz — Foundation</strong></div>
        <div className="sleep-param"><span>Noise</span><strong>Brown</strong></div>
        <div className="sleep-param"><span>Soundscape</span><strong>Rain</strong></div>
        <div className="sleep-param"><span>Fade in</span><strong>60 s — ultra-gentle</strong></div>
      </div>

      {/* Toggle button */}
      <button
        className={isRunning ? 'mode-stop-btn' : 'sleep-start-btn'}
        onClick={isRunning ? onStop : () => onStart(selectedHours)}
      >
        {isRunning ? 'Stop Session' : 'Begin Sleep Session'}
      </button>

      {!isRunning && (
        <p className="sleep-note">
          Use headphones for full binaural effect. Screen can turn off — audio continues in the background.
        </p>
      )}
    </div>
  )
}
