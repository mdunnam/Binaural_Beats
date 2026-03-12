import { useState } from 'react'

export type OnboardingConfig = {
  goal: string
  carrier: number
  beat: number
  wobbleRate: number
  soundsceneId: string
  sessionMinutes: number
  journeyId: string | null
}

type OnboardingProps = {
  onComplete: (config: OnboardingConfig) => void
  onSkip: () => void
}

const GOALS = [
  {
    id: 'sleep',
    emoji: '😴',
    title: 'Fall Asleep',
    subtitle: 'Drift into deep, restful sleep',
    config: {
      carrier: 174, beat: 2, wobbleRate: 0.1,
      soundsceneId: 'rain', sessionMinutes: 30,
      journeyId: 'sleep-descent',
    },
  },
  {
    id: 'focus',
    emoji: '🎯',
    title: 'Deep Focus',
    subtitle: 'Lock in for work or study',
    config: {
      carrier: 396, beat: 14, wobbleRate: 0.6,
      soundsceneId: 'forest', sessionMinutes: 45,
      journeyId: 'focus-ramp',
    },
  },
  {
    id: 'meditate',
    emoji: '🧘',
    title: 'Meditate',
    subtitle: 'Find stillness and inner quiet',
    config: {
      carrier: 528, beat: 6, wobbleRate: 0.2,
      soundsceneId: 'cave', sessionMinutes: 20,
      journeyId: 'deep-meditate',
    },
  },
  {
    id: 'relax',
    emoji: '🌊',
    title: 'Relax & Unwind',
    subtitle: 'Let go of stress and tension',
    config: {
      carrier: 432, beat: 10, wobbleRate: 0.3,
      soundsceneId: 'waves', sessionMinutes: 20,
      journeyId: null,
    },
  },
  {
    id: 'lucid',
    emoji: '🌙',
    title: 'Lucid Dreaming',
    subtitle: 'Enter the theta gateway',
    config: {
      carrier: 528, beat: 5, wobbleRate: 0.15,
      soundsceneId: 'space', sessionMinutes: 30,
      journeyId: null,
    },
  },
  {
    id: 'energy',
    emoji: '⚡',
    title: 'Boost Energy',
    subtitle: 'Rise, focus, and feel alive',
    config: {
      carrier: 852, beat: 18, wobbleRate: 0.7,
      soundsceneId: 'forest', sessionMinutes: 15,
      journeyId: 'morning-rise',
    },
  },
] as const

const SOUNDSCAPE_LABELS: Record<string, string> = {
  off: 'No soundscape',
  rain: 'Rain',
  forest: 'Forest',
  cave: 'Cave',
  waves: 'Ocean Waves',
  space: 'Space',
  fire: 'Fire',
  stream: 'Stream',
  wind: 'Wind',
}

const JOURNEY_NAMES: Record<string, string> = {
  'sleep-descent': '😴 Sleep Descent',
  'focus-ramp': '🎯 Focus Ramp',
  'deep-meditate': '🧘 Deep Meditate',
  'morning-rise': '🌅 Morning Rise',
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState<'pick' | 'confirm'>('pick')
  const [selected, setSelected] = useState<typeof GOALS[number] | null>(null)

  function handleCardClick(goal: typeof GOALS[number]) {
    setSelected(goal)
    setStep('confirm')
  }

  function handleStart() {
    if (!selected) return
    onComplete({
      goal: selected.id,
      ...selected.config,
    })
  }

  return (
    <div className="onboarding-overlay">
      {step === 'pick' && (
        <>
          <p className="onboarding-app-name">✦ Liminal</p>
          <h1 className="onboarding-title">What do you want to achieve?</h1>
          <p className="onboarding-subtitle">Pick a goal and we'll configure everything for you.</p>
          <div className="onboarding-grid">
            {GOALS.map((goal) => (
              <div
                key={goal.id}
                className={`onboarding-goal-card${selected?.id === goal.id ? ' onboarding-goal-card--selected' : ''}`}
                onClick={() => handleCardClick(goal)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCardClick(goal)}
              >
                <span className="onboarding-goal-emoji">{goal.emoji}</span>
                <span className="onboarding-goal-title">{goal.title}</span>
                <span className="onboarding-goal-subtitle">{goal.subtitle}</span>
              </div>
            ))}
          </div>
          <button className="onboarding-skip" onClick={onSkip}>
            Skip → I'll explore on my own
          </button>
        </>
      )}

      {step === 'confirm' && selected && (
        <div className="onboarding-confirm">
          <span className="onboarding-confirm-emoji">{selected.emoji}</span>
          <h2 className="onboarding-title">{selected.title}</h2>
          <p className="onboarding-subtitle">{selected.subtitle}</p>

          <div className="onboarding-confirm-details">
            <div className="onboarding-confirm-detail-row">
              <span>🎵</span>
              <span>{selected.config.carrier} Hz carrier · {selected.config.beat} Hz beat</span>
            </div>
            <div className="onboarding-confirm-detail-row">
              <span>🌊</span>
              <span>{SOUNDSCAPE_LABELS[selected.config.soundsceneId] ?? selected.config.soundsceneId}</span>
            </div>
            <div className="onboarding-confirm-detail-row">
              <span>⏱</span>
              <span>{selected.config.sessionMinutes} min session</span>
            </div>
            {selected.config.journeyId && (
              <div className="onboarding-confirm-detail-row">
                <span>🗺</span>
                <span>Journey: {JOURNEY_NAMES[selected.config.journeyId] ?? selected.config.journeyId}</span>
              </div>
            )}
          </div>

          <button className="onboarding-start-btn" onClick={handleStart}>
            ▶ Start Session
          </button>
          <button className="onboarding-back-btn" onClick={() => setStep('pick')}>
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
