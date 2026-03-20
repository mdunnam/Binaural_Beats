import { useState } from 'react'
import type { Journey } from '../engine/journeyEngine'
import { IconLightning, IconCheck } from './Icons'

// ── Stage definitions ─────────────────────────────────────────────────────────
const STAGE_DEFS = [
  { label: 'Warm-up',    beat: 18, wobbleRate: 0.20, color: '#f4c430', pct: 0.10, band: 'Beta'       },
  { label: 'Flow State', beat: 14, wobbleRate: 0.15, color: '#3e8f72', pct: 0.55, band: 'Beta'       },
  { label: 'Deep Focus', beat: 12, wobbleRate: 0.12, color: '#5b9bd5', pct: 0.25, band: 'Alpha/Beta' },
  { label: 'Wind-Down',  beat: 9,  wobbleRate: 0.08, color: '#9b59b6', pct: 0.10, band: 'Alpha'      },
]

const WORK_DURATIONS = [
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 },
]

export function buildFocusJourney(minutes: number): Journey {
  return {
    id: 'focus-session',
    name: 'Focus Session',
    stages: STAGE_DEFS.map((s, i) => ({
      id: `focus-${i}`,
      label: s.label,
      carrier: 200,
      beat: s.beat,
      wobbleRate: s.wobbleRate,
      durationMinutes: Math.max(1, Math.round(minutes * s.pct)),
      soundsceneId: 'off',
      color: s.color,
    })),
  }
}

function formatMS(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

type Props = {
  isRunning: boolean
  remainingSeconds: number
  activeStageIndex: number
  onStart: (minutes: number) => void
  onStop: () => void
}

export function FocusMode({ isRunning, remainingSeconds, activeStageIndex, onStart, onStop }: Props) {
  const [selectedMinutes, setSelectedMinutes] = useState(45)
  const [gammaBoost, setGammaBoost] = useState(false)

  const stage = STAGE_DEFS[Math.max(0, Math.min(activeStageIndex, STAGE_DEFS.length - 1))]

  return (
    <div className="focus-mode">

      {/* Header */}
      <div className="sleep-header">
        <div className="sleep-moon" style={{ color: '#f4c430' }}><IconLightning size={36} /></div>
        <h2 className="sleep-title">Focus Mode</h2>
        <p className="sleep-subtitle">Beta-driven concentration with a structured arc into deep work.</p>
      </div>

      {!isRunning ? (
        // ── Setup ──────────────────────────────────────────────────────────────
        <>
          <div className="sleep-section">
            <span className="section-label">Session length</span>
            <div className="sleep-dur-row">
              {WORK_DURATIONS.map(d => (
                <button
                  key={d.minutes}
                  className={`seg-btn${selectedMinutes === d.minutes ? ' seg-btn--active' : ''}`}
                  onClick={() => setSelectedMinutes(d.minutes)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sleep-section">
            <span className="section-label">Focus arc</span>
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
                  <span className="sleep-seg-dur">{Math.max(1, Math.round(selectedMinutes * s.pct))} min</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sleep-section sleep-params">
            <div className="sleep-param"><span>Carrier</span><strong>200 Hz</strong></div>
            <div className="sleep-param"><span>Noise</span><strong>Pink — light masking</strong></div>
            <div className="sleep-param"><span>Fade in</span><strong>30 s</strong></div>
            <div className="sleep-param focus-param-toggle" onClick={() => setGammaBoost(g => !g)}>
              <span>Gamma burst <span className="focus-param-sub">40 Hz pulse at session start</span></span>
              <strong className={gammaBoost ? 'focus-param-on' : 'focus-param-off'}>
                {gammaBoost ? <><IconCheck size={13} /> On</> : 'Off'}
              </strong>
            </div>
          </div>

          <button className="focus-start-btn" onClick={() => onStart(selectedMinutes)}>
            Begin Focus Session
          </button>

          <p className="sleep-note">
            Use headphones for full binaural effect. Pink noise masks distractions automatically.
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
            <div className="sleep-clock">{formatMS(remainingSeconds)}</div>
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
