import { useState } from 'react'
import type { Journey } from '../engine/journeyEngine'
import { IconMoon } from './Icons'

// ── Stage definitions ────────────────────────────────────────────────────────
// Colors inlined to avoid circular init order with journeyEngine
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

  const stage = STAGE_DEFS[Math.max(0, Math.min(activeStageIndex, STAGE_DEFS.length - 1))]

  return (
    <div className="sleep-mode">

      {/* Header */}
      <div className="sleep-header">
        <div className="sleep-moon"><IconMoon size={36} /></div>
        <h2 className="sleep-title">Sleep Mode</h2>
        <p className="sleep-subtitle">A guided descent from waking mind to deep sleep.</p>
      </div>

      {!isRunning ? (
        // ── Setup ──────────────────────────────────────────────────────────────
        <>
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

          <div className="sleep-section">
            <span className="section-label">Descent journey</span>
            <div className="sleep-stage-bar">
              {STAGE_DEFS.map(s => (
                <div
                  key={s.label}
                  className="sleep-stage-seg"
                  style={{ flex: s.pct, borderColor: s.color + '88' }}
                >
                  <div className="sleep-seg-swatch" style={{ background: s.color }} />
                  <span className="sleep-seg-name">{s.label}</span>
                  <span className="sleep-seg-band">{s.band} · {s.beat} Hz</span>
                  <span className="sleep-seg-dur">{Math.round(selectedHours * 60 * s.pct)} min</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sleep-section sleep-params">
            <div className="sleep-param"><span>Carrier</span><strong>174 Hz — Foundation</strong></div>
            <div className="sleep-param"><span>Noise</span><strong>Brown</strong></div>
            <div className="sleep-param"><span>Soundscape</span><strong>Rain</strong></div>
            <div className="sleep-param"><span>Fade in</span><strong>60 s — ultra-gentle</strong></div>
          </div>

          <button className="sleep-start-btn" onClick={() => onStart(selectedHours)}>
            Begin Sleep Session
          </button>

          <p className="sleep-note">
            Use headphones for full binaural effect. Screen can turn off — audio continues in the background.
          </p>
        </>
      ) : (
        // ── Running ────────────────────────────────────────────────────────────
        <>
          <div className="sleep-running">
            <div className="sleep-stage-name" style={{ color: stage.color }}>
              {stage.label}
            </div>
            <div className="sleep-band-name">{stage.band} · {stage.beat} Hz</div>
            <div className="sleep-clock">{formatHMS(remainingSeconds)}</div>
            <div className="sleep-clock-sub">remaining</div>
          </div>

          {/* Stage progress bar */}
          <div className="sleep-prog-track">
            {STAGE_DEFS.map((s, i) => (
              <div
                key={s.label}
                className={`sleep-prog-seg${i === activeStageIndex ? ' sleep-prog-seg--active' : ''}`}
                style={{
                  flex: s.pct,
                  background: i < activeStageIndex ? s.color + 'cc'
                    : i === activeStageIndex ? s.color
                    : s.color + '22',
                  borderColor: s.color + '88',
                }}
                title={s.label}
              />
            ))}
          </div>

          {/* Stage list */}
          <div className="sleep-stage-list">
            {STAGE_DEFS.map((s, i) => (
              <div key={s.label} className={`sleep-stage-row${i === activeStageIndex ? ' sleep-stage-row--active' : ''}`}>
                <div
                  className="sleep-stage-dot"
                  style={{
                    background: i < activeStageIndex ? s.color : i === activeStageIndex ? s.color : 'transparent',
                    borderColor: s.color,
                  }}
                />
                <span className="sleep-stage-row-label">{s.label}</span>
                <span className="sleep-stage-row-band">{s.band} · {s.beat} Hz</span>
                {i === activeStageIndex && <span className="sleep-stage-row-now">now</span>}
              </div>
            ))}
          </div>

          <button className="sleep-stop-btn" onClick={onStop}>
            End Session
          </button>
        </>
      )}
    </div>
  )
}
