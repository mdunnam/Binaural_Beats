import { useState } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'

type Props = { onDone: () => void; onStartProgram?: () => void }

const STEPS = [
  {
    emoji: '🎧',
    title: 'Welcome to Liminal',
    body: 'Shift your mental state with binaural beats, soundscapes, and guided journeys. Built for focus, calm, and deep sleep.',
    note: null,
  },
  {
    emoji: '🧠',
    title: 'How It Works',
    body: 'Choose a frequency preset or dial in your own. Layer in ambient sounds. Set a session length. Hit play — and let your brain do the rest.',
    note: 'Use headphones for the full binaural effect.',
  },
  {
    emoji: '✨',
    title: 'Free & Pro',
    body: 'The core experience is completely free. Upgrade to Pro for unlimited sessions, all soundscapes, Journey Builder, Studio, AI Meditation, Music, and Journal.',
    note: null,
  },
] as const

export function OnboardingModal({ onDone, onStartProgram }: Props) {
  const [step, setStep] = useState(0)
  const { openUpgradeModal } = useSubscription()

  function dismiss() {
    localStorage.setItem('liminal-onboarding-done', 'true')
    onDone()
  }

  function learnPro() {
    dismiss()
    openUpgradeModal('Onboarding')
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="settings-backdrop" onClick={dismiss}>
      <div
        className="settings-modal"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <span />
          <button className="settings-close" onClick={dismiss} aria-label="Skip onboarding">✕</button>
        </div>

        <div className="onboarding-step">
          <div className="onboarding-emoji">{current.emoji}</div>
          <div className="onboarding-title">{current.title}</div>
          <div className="onboarding-body">{current.body}</div>
          {current.note && <div className="onboarding-note">{current.note}</div>}
        </div>

        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot${i === step ? ' onboarding-dot--active' : ''}`}
            />
          ))}
        </div>

        {isLast ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem' }}>
            {onStartProgram && (
              <button className="soft-button soft-button--accent" onClick={() => { dismiss(); onStartProgram() }}>
                📅 Start the 7-Day Program
              </button>
            )}
            <button className="soft-button soft-button--accent" onClick={dismiss}>
              Start Free →
            </button>
            <button className="onboarding-skip" onClick={learnPro}>
              Learn about Pro
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem' }}>
            <button className="soft-button soft-button--accent" onClick={() => setStep(step + 1)}>
              Next →
            </button>
            <button className="onboarding-skip" onClick={dismiss}>
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
