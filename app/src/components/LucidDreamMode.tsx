import { useState } from 'react'
import type { Journey } from '../engine/journeyEngine'
import { IconSparkle } from './Icons'

// ── Stage definitions ─────────────────────────────────────────────────────────
// Aligned to ~90-min natural sleep cycle boundaries
const STAGE_DEFS = [
  { label: 'Settling',    beat: 7, wobbleRate: 0.12, color: '#5b9bd5', pct: 0.10, band: 'Theta'       },
  { label: 'Drifting',    beat: 5, wobbleRate: 0.08, color: '#7b68ee', pct: 0.15, band: 'Theta'       },
  { label: 'REM Zone 1',  beat: 4, wobbleRate: 0.05, color: '#9b59b6', pct: 0.25, band: 'Theta/Delta' },
  { label: 'REM Zone 2',  beat: 4, wobbleRate: 0.05, color: '#6a5acd', pct: 0.25, band: 'Theta/Delta' },
  { label: 'REM Zone 3',  beat: 4, wobbleRate: 0.05, color: '#4b3b8f', pct: 0.25, band: 'Theta/Delta' },
]

const DURATIONS = [
  { label: '4 hrs', hours: 4 },
  { label: '6 hrs', hours: 6 },
  { label: '8 hrs', hours: 8 },
]

export function buildLucidJourney(hours: number): Journey {
  const totalMinutes = hours * 60
  return {
    id: 'lucid-dream',
    name: 'Lucid Dream',
    stages: STAGE_DEFS.map((s, i) => ({
      id: `lucid-${i}`,
      label: s.label,
      carrier: 432,
      beat: s.beat,
      wobbleRate: s.wobbleRate,
      durationMinutes: Math.max(5, Math.round(totalMinutes * s.pct)),
      soundsceneId: 'ocean',
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
  activeStageIndex: number
  onStart: (hours: number) => void
  onStop: () => void
}

export function LucidDreamMode({ isRunning, remainingSeconds, activeStageIndex, onStart, onStop }: Props) {
  const [selectedHours, setSelectedHours] = useState(6)

  const stage = STAGE_DEFS[Math.max(0, Math.min(activeStageIndex, STAGE_DEFS.length - 1))]

  return (
    <div className="lucid-mode">

      {/* Header */}
      <div className="sleep-header">
        <div className="sleep-moon" style={{ color: '#7b68ee' }}><IconSparkle size={36} /></div>
        <h2 className="sleep-title">Lucid Dream Mode</h2>
        <p className="sleep-subtitle">Theta-tuned cycles aligned to natural 90-minute REM windows.</p>
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
            <span className="section-label">Sleep cycle map</span>
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
                  <span className="sleep-seg-dur">{Math.max(5, Math.round(selectedHours * 60 * s.pct))} min</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sleep-section sleep-params">
            <div className="sleep-param"><span>Carrier</span><strong>432 Hz — Harmony</strong></div>
            <div className="sleep-param"><span>Noise</span><strong>Brown — deep sleep masking</strong></div>
            <div className="sleep-param"><span>Soundscape</span><strong>Ocean</strong></div>
            <div className="sleep-param"><span>Fade in</span><strong>90 s — ultra-gentle</strong></div>
          </div>

          <div className="lucid-tip">
            <strong>Set your intention before sleeping.</strong> REM zones are spaced at natural 90-minute cycle boundaries. Keep a dream journal nearby — write immediately on waking.
          </div>

          <button className="lucid-start-btn" onClick={() => onStart(selectedHours)}>
            Begin Lucid Session
          </button>

          <p className="sleep-note">
            Use headphones. Screen can turn off — audio continues in the background. Set a gentle alarm 30 minutes before your target wake time.
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
