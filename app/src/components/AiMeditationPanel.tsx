import { useEffect, useRef, useState } from 'react'
import { generateMeditation } from '../ai/meditationComposer'
import type { NoiseType } from '../types'

export type AiMeditationConfig = {
  carrier: number
  beat: number
  noiseType: NoiseType
  noiseVolume: number
  padEnabled: boolean
  sessionMinutes: number
  audioBlob: Blob
  theme: string
  script: string
}

interface AiMeditationPanelProps {
  onSessionReady: (config: AiMeditationConfig) => void
  onClose: () => void
  apiKey: string
  onOpenSettings: () => void
}

type Step = 'idle' | 'writing' | 'rendering' | 'starting' | 'error'

// ---------------------------------------------------------------------------
// Loading messages — SimCity energy but make it meditation
// ---------------------------------------------------------------------------
const LOADING_MESSAGES: Record<'writing' | 'rendering' | 'starting', string[]> = {
  writing: [
    'Reticulating brainwaves…',
    'Consulting the cosmic frequency table…',
    'Tuning the third eye oscillator…',
    'Channelling your higher self…',
    'Aligning the solfeggio harmonics…',
    'Calibrating quantum resonance fields…',
    'Whispering to the theta realm…',
    'Encoding your intention into sound…',
    'Selecting the optimal sacred geometry…',
    'Preparing the astral signal path…',
  ],
  rendering: [
    'Warming up the voice of the universe…',
    'Applying golden ratio reverb…',
    'Breathing life into the soundscape…',
    'Polishing the shimmer crystals…',
    'Weaving frequencies into words…',
    'Infusing the audio with good vibes…',
    'Rendering at 432 Hz quality…',
    'Activating the voice circuits…',
  ],
  starting: [
    'Opening the gate…',
    'Synchronising your neurons…',
    'Dimming the outside world…',
    'Initialising deep calm…',
    'Preparing the sacred space…',
  ],
}

function useRotatingMessage(step: 'writing' | 'rendering' | 'starting' | null, intervalMs = 2200): string {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!step) { setIdx(0); return }
    setIdx(0)
    timerRef.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % LOADING_MESSAGES[step].length)
    }, intervalMs)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [step, intervalMs])

  if (!step) return ''
  return LOADING_MESSAGES[step][idx % LOADING_MESSAGES[step].length]
}

// ---------------------------------------------------------------------------
// Progress estimation
// Each step gets a % range. We animate smoothly within it.
// ---------------------------------------------------------------------------
const STEP_PROGRESS: Record<'writing' | 'rendering' | 'starting', [number, number]> = {
  writing:   [5,  70],
  rendering: [72, 92],
  starting:  [93, 99],
}

function useAnimatedProgress(step: Step): number {
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    if (step === 'idle') { setProgress(0); return }
    if (step === 'error') { setProgress(0); return }

    const activeStep = step as 'writing' | 'rendering' | 'starting'
    const [start, end] = STEP_PROGRESS[activeStep]

    setProgress(start)

    // Animate toward end, slowing down as it approaches
    timerRef.current = window.setInterval(() => {
      setProgress((p) => {
        const remaining = end - p
        const increment = Math.max(0.3, remaining * 0.04)
        return Math.min(end, p + increment)
      })
    }, 150)

    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [step])

  return progress
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AiMeditationPanel({ onSessionReady, onClose, apiKey, onOpenSettings }: AiMeditationPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')

  const activeLoadingStep = (step === 'writing' || step === 'rendering' || step === 'starting') ? step : null
  const rotatingMessage = useRotatingMessage(activeLoadingStep)
  const progress = useAnimatedProgress(step)

  const isGenerating = step === 'writing' || step === 'rendering' || step === 'starting'

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setError('')
    setStep('writing')

    try {
      const result = await generateMeditation(prompt, apiKey)
      setStep('rendering')
      await new Promise((r) => setTimeout(r, 400))
      setStep('starting')
      await new Promise((r) => setTimeout(r, 400))

      const config: AiMeditationConfig = {
        carrier: result.config.carrier,
        beat: result.config.beat,
        noiseType: result.config.noiseType as NoiseType,
        noiseVolume: result.config.noiseVolume,
        padEnabled: result.config.padEnabled,
        sessionMinutes: result.config.sessionMinutes,
        audioBlob: result.audioBlob,
        theme: result.config.theme,
        script: result.script,
      }

      onSessionReady(config)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setStep('error')
    }
  }

  const stepStatus = (s: 'writing' | 'rendering' | 'starting') => {
    const order = ['writing', 'rendering', 'starting']
    const current = order.indexOf(step)
    const target = order.indexOf(s)
    if (current > target) return 'done'
    if (current === target) return 'active'
    return 'pending'
  }

  // Prevent backdrop click from closing while generating
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return
    if (isGenerating) return   // 🔒 locked during generation
    onClose()
  }

  return (
    <div className="ai-panel" onClick={handleBackdropClick}>
      <div className="ai-panel-card">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>✨ AI Guided Meditation</h2>
          {!isGenerating && (
            <button
              className="soft-button"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* No API key */}
        {!apiKey && (
          <div className="ai-no-key">
            <p>Add your OpenAI API key in Settings to use AI Meditation.</p>
            <button className="soft-button" onClick={onOpenSettings}>⚙ Open Settings</button>
          </div>
        )}

        {/* Idle — prompt input */}
        {apiKey && step === 'idle' && (
          <>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
              What do you want to meditate on?
              <textarea
                className="ai-prompt-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. meditate on abundance, help me sleep deeply, release anxiety…"
                rows={3}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) void handleGenerate() }}
              />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="ai-generate-btn"
                onClick={() => void handleGenerate()}
                disabled={!prompt.trim()}
              >
                Generate &amp; Start Session
              </button>
              <button className="soft-button" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}

        {/* Generating */}
        {isGenerating && (
          <div className="ai-generating">
            {/* Progress bar */}
            <div className="ai-progress-track">
              <div
                className="ai-progress-fill"
                style={{ width: `${progress.toFixed(1)}%` }}
              />
            </div>
            <div className="ai-rotating-message">{rotatingMessage}</div>

            {/* Step list */}
            <ul className="ai-step-indicator">
              {(['writing', 'rendering', 'starting'] as const).map((s, i) => {
                const labels = ['Writing your meditation', 'Rendering voice', 'Starting session']
                const status = stepStatus(s)
                return (
                  <li key={s} className={`ai-step ai-step--${status}`}>
                    <span className="ai-step-icon">
                      {status === 'done' ? '✓' : status === 'active' ? '●' : `${i + 1}`}
                    </span>
                    {labels[i]}
                    {status === 'active' && <span className="ai-step-ellipsis">…</span>}
                  </li>
                )
              })}
            </ul>

            <p className="ai-lock-note">Please wait — your meditation is being prepared ✦</p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div>
            <p className="ai-error">{error}</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="ai-generate-btn" onClick={() => setStep('idle')}>Try Again</button>
              <button className="soft-button" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
