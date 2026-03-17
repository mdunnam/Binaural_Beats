import { useState } from 'react'
import { AuraProfile, AuraQualityResult, TuningStep, buildTuningJourney } from '../lib/auraAnalyzer'
import { ProGate } from './ProGate'
import { useProGate } from '../hooks/useProGate'

interface AuraTuningProps {
  profile: AuraProfile
  assessment: AuraQualityResult
  onStartTuning: (steps: TuningStep[]) => void
}

export function AuraTuning({ profile, assessment, onStartTuning }: AuraTuningProps) {
  const { isPro } = useProGate()
  const [expanded, setExpanded] = useState(false)
  const journey = buildTuningJourney(profile, assessment)
  const totalMinutes = Math.round(journey.reduce((sum, s) => sum + s.durationSeconds, 0) / 60)

  return (
    <div className="aura-tuning-card">
      {/* Quality badge */}
      <div className="aura-quality-row">
        <span className="aura-quality-badge" data-quality={assessment.quality}>
          {assessment.label}
        </span>
        <span className="aura-quality-msg">{assessment.message}</span>
      </div>

      {assessment.needsTuning && (
        <div className="aura-tuning-body">
          <p className="aura-tuning-desc">{assessment.tuningMessage}</p>

          {/* Journey preview */}
          <button className="bridge-mapping-toggle" onClick={() => setExpanded(v => !v)}>
            {expanded ? '▲' : '▼'} Preview journey ({totalMinutes} min)
          </button>
          {expanded && (
            <div className="aura-tuning-steps">
              {journey.map((step, i) => (
                <div key={i} className="aura-tuning-step">
                  <div className="aura-tuning-step-num">{i + 1}</div>
                  <div className="aura-tuning-step-info">
                    <strong>{step.label}</strong>
                    <span>{step.beat} Hz · {Math.round(step.durationSeconds / 60)} min</span>
                    <em>{step.description}</em>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA — Pro gated */}
          <ProGate feature="Aura Tuning">
            <button
              className="soft-button soft-button--accent"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => onStartTuning(journey)}
            >
              🔮 Begin Aura Tuning — {totalMinutes} min
            </button>
          </ProGate>
        </div>
      )}

      {!assessment.needsTuning && (
        <p className="aura-tuning-clear">Your aura is in good shape. No tuning needed — just enjoy your session.</p>
      )}
    </div>
  )
}
