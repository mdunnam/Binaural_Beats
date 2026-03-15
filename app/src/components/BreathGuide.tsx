import { useEffect, useState, useRef } from 'react'

type Pattern = {
  name: string
  label: string
  steps: { phase: 'inhale' | 'hold' | 'exhale' | 'hold2'; seconds: number }[]
}

const PATTERNS: Pattern[] = [
  {
    name: '4-7-8',
    label: '4-7-8 Relaxing',
    steps: [
      { phase: 'inhale', seconds: 4 },
      { phase: 'hold',   seconds: 7 },
      { phase: 'exhale', seconds: 8 },
    ],
  },
  {
    name: 'box',
    label: 'Box (4-4-4-4)',
    steps: [
      { phase: 'inhale', seconds: 4 },
      { phase: 'hold',   seconds: 4 },
      { phase: 'exhale', seconds: 4 },
      { phase: 'hold2',  seconds: 4 },
    ],
  },
  {
    name: 'coherent',
    label: 'Coherent (5.5)',
    steps: [
      { phase: 'inhale', seconds: 5.5 },
      { phase: 'exhale', seconds: 5.5 },
    ],
  },
  {
    name: 'slow',
    label: 'Slow (5-5)',
    steps: [
      { phase: 'inhale', seconds: 5 },
      { phase: 'exhale', seconds: 5 },
    ],
  },
]

type Props = { isRunning: boolean }

export function BreathGuide({ isRunning }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [patternName, setPatternName] = useState('box')
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'hold2'>('inhale')
  const [progress, setProgress] = useState(0) // 0–1 within current phase
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<number | null>(null)

  // Run breathing cycle
  useEffect(() => {
    if (!enabled || !isRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      setPhase('inhale')
      setProgress(0)
      return
    }

    const pattern = PATTERNS.find(p => p.name === patternName) ?? PATTERNS[1]
    let stepIdx = 0
    let elapsed = 0
    const TICK = 50 // ms

    timerRef.current = window.setInterval(() => {
      const step = pattern.steps[stepIdx]
      elapsed += TICK / 1000
      const prog = Math.min(elapsed / step.seconds, 1)
      setPhase(step.phase)
      setProgress(prog)
      setCountdown(Math.ceil(step.seconds - elapsed))

      if (elapsed >= step.seconds) {
        elapsed = 0
        stepIdx = (stepIdx + 1) % pattern.steps.length
      }
    }, TICK)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [enabled, isRunning, patternName])

  const PHASE_LABELS: Record<string, string> = {
    inhale: 'Inhale',
    hold: 'Hold',
    exhale: 'Exhale',
    hold2: 'Hold',
  }

  // Ring size: inhale = grows, hold = full, exhale = shrinks, hold2 = small
  const ringScale = phase === 'inhale' ? 0.5 + progress * 0.5
    : phase === 'hold' ? 1
    : phase === 'exhale' ? 1 - progress * 0.5
    : 0.5

  return (
    <div className="breath-guide-wrap">
      <div className="breath-guide-header">
        <span className="section-label">BREATH GUIDE</span>
        <button
          className={`soft-button${enabled ? ' soft-button--accent' : ''}`}
          style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
          onClick={() => setEnabled(e => !e)}
        >
          {enabled ? 'On' : 'Off'}
        </button>
      </div>

      {enabled && (
        <>
          {/* Pattern selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
            {PATTERNS.map(p => (
              <button
                key={p.name}
                className={`soft-button${patternName === p.name ? ' soft-button--accent' : ''}`}
                style={{ padding: '0.2rem 0.55rem', fontSize: '0.78rem' }}
                onClick={() => setPatternName(p.name)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Visual ring */}
          {isRunning ? (
            <div className="breath-ring-container">
              <div
                className={`breath-ring breath-ring--${phase}`}
                style={{ transform: `scale(${ringScale})` }}
              />
              <div className="breath-ring-label">
                <span className="breath-phase-text">{PHASE_LABELS[phase]}</span>
                <span className="breath-countdown">{countdown}</span>
              </div>
            </div>
          ) : (
            <p className="control-hint" style={{ textAlign: 'center' }}>Start a session to begin breathing guide</p>
          )}
        </>
      )}
    </div>
  )
}
