import { useState } from 'react'
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

export function AiMeditationPanel({ onSessionReady, onClose, apiKey, onOpenSettings }: AiMeditationPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setError('')
    setStep('writing')

    try {
      const result = await generateMeditation(prompt, apiKey)
      setStep('rendering')
      // Small delay so the user sees "Rendering voice..." step tick
      await new Promise((r) => setTimeout(r, 300))
      setStep('starting')
      await new Promise((r) => setTimeout(r, 300))

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

  const isGenerating = step === 'writing' || step === 'rendering' || step === 'starting'

  const stepStatus = (s: 'writing' | 'rendering' | 'starting') => {
    const order = ['writing', 'rendering', 'starting']
    const current = order.indexOf(step)
    const target = order.indexOf(s)
    if (current > target) return 'done'
    if (current === target) return 'active'
    return 'pending'
  }

  return (
    <div className="ai-panel" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ai-panel-card">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>✨ AI Guided Meditation</h2>

        {!apiKey && (
          <div className="ai-no-key">
            <p>Add your OpenAI API key in Settings to use AI Meditation.</p>
            <button className="soft-button" onClick={onOpenSettings}>⚙ Open Settings</button>
          </div>
        )}

        {apiKey && !isGenerating && step !== 'error' && (
          <>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
              What do you want to meditate on?
              <textarea
                className="ai-prompt-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. meditate on abundance, help me sleep deeply, relax from stress…"
                rows={3}
                disabled={isGenerating}
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

        {isGenerating && (
          <ul className="ai-step-indicator">
            {(['writing', 'rendering', 'starting'] as const).map((s, i) => {
              const labels = ['Writing your meditation…', 'Rendering voice…', 'Starting session…']
              const status = stepStatus(s)
              return (
                <li key={s} className={`ai-step ai-step--${status}`}>
                  <span className="ai-step-icon">
                    {status === 'done' ? '✓' : status === 'active' ? '●' : `${i + 1}`}
                  </span>
                  {labels[i]}
                </li>
              )
            })}
          </ul>
        )}

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
