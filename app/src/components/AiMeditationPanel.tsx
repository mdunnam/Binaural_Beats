import { useEffect, useRef, useState } from 'react'
import { generateMeditation, VOICE_OPTIONS, DEFAULT_FEMALE_VOICE, DEFAULT_MALE_VOICE } from '../ai/meditationComposer'
import type { TtsVoice, VoiceGender } from '../ai/meditationComposer'
import { saveSession, listSessions, deleteSession, getSessionBlob, migrateFromLocalStorage } from '../ai/savedSessions'
import type { SavedSession } from '../ai/savedSessions'
import type { NoiseType } from '../types'
import { WaveformPlayer } from './WaveformPlayer'

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
  apiKey: string
  onOpenSettings: () => void
}

type Step = 'idle' | 'writing' | 'rendering' | 'starting' | 'error'
type Intensity = 'gentle' | 'balanced' | 'deep'
type Soundscape = 'auto' | 'rain' | 'ocean' | 'forest' | 'space' | 'silence'

const DURATION_OPTIONS = [
  { value: 5,  label: '5 min',  cost: '~$0.03' },
  { value: 10, label: '10 min', cost: '~$0.06' },
  { value: 15, label: '15 min', cost: '~$0.09' },
  { value: 20, label: '20 min', cost: '~$0.12' },
  { value: 30, label: '30 min', cost: '~$0.18' },
  { value: 45, label: '45 min', cost: '~$0.27' },
  { value: 60, label: '60 min', cost: '~$0.36' },
]

const SOUNDSCAPE_OPTIONS: { value: Soundscape; icon: string; label: string }[] = [
  { value: 'rain',    icon: '🌧',  label: 'Rain'    },
  { value: 'ocean',   icon: '🌊',  label: 'Ocean'   },
  { value: 'forest',  icon: '🌲',  label: 'Forest'  },
  { value: 'space',   icon: '🌌',  label: 'Space'   },
  { value: 'silence', icon: '◯',   label: 'Silence' },
  { value: 'auto',    icon: '✨',  label: 'Auto'    },
]

// ---------------------------------------------------------------------------
// Loading messages
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
    return () => { if (timerRef.current !== null) window.clearInterval(timerRef.current) }
  }, [step, intervalMs])
  if (!step) return ''
  return LOADING_MESSAGES[step][idx % LOADING_MESSAGES[step].length]
}

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
    if (step === 'idle' || step === 'error') { setProgress(0); return }
    const activeStep = step as 'writing' | 'rendering' | 'starting'
    const [start, end] = STEP_PROGRESS[activeStep]
    setProgress(start)
    timerRef.current = window.setInterval(() => {
      setProgress((p) => {
        const remaining = end - p
        const increment = Math.max(0.3, remaining * 0.04)
        return Math.min(end, p + increment)
      })
    }, 150)
    return () => { if (timerRef.current !== null) window.clearInterval(timerRef.current) }
  }, [step])
  return progress
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AiMeditationPanel({ onSessionReady, apiKey, onOpenSettings }: AiMeditationPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(15)
  const [gender, setGender] = useState<VoiceGender>('female')
  const [voice, setVoice] = useState<TtsVoice>(DEFAULT_FEMALE_VOICE)
  const [intensity, setIntensity] = useState<Intensity>('balanced')
  const [soundscape, setSoundscape] = useState<Soundscape>('auto')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const [savedList, setSavedList] = useState<SavedSession[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [previewBlobs, setPreviewBlobs] = useState<Record<string, Blob | null>>({})
  const [previewLoading, setPreviewLoading] = useState<Record<string, boolean>>({})

  const activeLoadingStep = (step === 'writing' || step === 'rendering' || step === 'starting') ? step : null
  const rotatingMessage = useRotatingMessage(activeLoadingStep)
  const progress = useAnimatedProgress(step)
  const isGenerating = step === 'writing' || step === 'rendering' || step === 'starting'

  const refreshSaved = () => { void listSessions().then(setSavedList) }

  useEffect(() => {
    void migrateFromLocalStorage().then(() => refreshSaved())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleShowSaved = () => {
    void listSessions().then((list) => { setSavedList(list); setShowSaved(true) })
  }

  // When gender changes, reset voice to that gender's default
  const handleGenderChange = (g: VoiceGender) => {
    setGender(g)
    setVoice(g === 'female' ? DEFAULT_FEMALE_VOICE : DEFAULT_MALE_VOICE)
  }

  const filteredVoices = VOICE_OPTIONS.filter((v) => v.gender === gender)
  const selectedDuration = DURATION_OPTIONS.find((d) => d.value === duration) ?? DURATION_OPTIONS[2]

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setError('')
    setStep('writing')
    try {
      const result = await generateMeditation(prompt, apiKey, { durationMinutes: duration, voice, intensity, soundscape })
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
      setStep('idle')
      // Save session
      await saveSession(prompt, { voice, intensity, soundscape, durationMinutes: duration }, result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setStep('error')
    }
  }

  const handlePlaySaved = async (session: SavedSession) => {
    const blob = await getSessionBlob(session.id)
    if (!blob) { alert('Audio not found for this session.'); return }
    const config: AiMeditationConfig = {
      carrier: session.carrier,
      beat: session.beat,
      noiseType: session.noiseType as NoiseType,
      noiseVolume: session.noiseVolume,
      padEnabled: session.padEnabled,
      sessionMinutes: session.durationMinutes,
      audioBlob: blob,
      theme: session.theme,
      script: session.script,
    }
    onSessionReady(config)
    setShowSaved(false)
  }

  const handleDeleteSaved = (id: string) => {
    void deleteSession(id).then(() => refreshSaved())
  }

  const handleTogglePreview = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (previewBlobs[id] !== undefined) return // already loaded
    setPreviewLoading((prev) => ({ ...prev, [id]: true }))
    const blob = await getSessionBlob(id)
    setPreviewBlobs((prev) => ({ ...prev, [id]: blob ?? null }))
    setPreviewLoading((prev) => ({ ...prev, [id]: false }))
  }

  const stepStatus = (s: 'writing' | 'rendering' | 'starting') => {
    const order = ['writing', 'rendering', 'starting']
    const current = order.indexOf(step)
    const target = order.indexOf(s)
    if (current > target) return 'done'
    if (current === target) return 'active'
    return 'pending'
  }

  const savedCount = savedList.length

  return (
    <div className="ai-panel-inline">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>✨ AI Guided Meditation</h2>
          {!isGenerating && step === 'idle' && !showSaved && (
            <button
              className="soft-button"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem', position: 'relative' }}
              onClick={handleShowSaved}
            >
              📚 Saved
              {savedCount > 0 && <span className="ai-saved-count-badge">{savedCount}</span>}
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

        {/* Saved sessions view */}
        {apiKey && step === 'idle' && showSaved && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>📚 Saved Meditations</h3>
              <button className="soft-button" style={{ fontSize: '0.85rem' }} onClick={() => setShowSaved(false)}>← Back</button>
            </div>
            {savedList.length === 0 ? (
              <p style={{ opacity: 0.6, textAlign: 'center', padding: '1rem 0' }}>No saved sessions yet.</p>
            ) : (
              <div className="ai-saved-list">
                {savedList.slice().reverse().map((session) => {
                  const isExpanded = expandedId === session.id
                  const blob = previewBlobs[session.id]
                  const loading = previewLoading[session.id]
                  const previewLabel = `${session.theme} · ${session.durationMinutes} min · ${session.voice}`
                  return (
                  <div key={session.id} className="ai-saved-card">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>"{session.prompt}"</div>
                      <div className="ai-saved-meta">
                        {session.theme} · {session.durationMinutes} min
                      </div>
                      <div className="ai-saved-meta">
                        {session.voice} · {session.intensity.charAt(0).toUpperCase() + session.intensity.slice(1)} · {session.soundscape.charAt(0).toUpperCase() + session.soundscape.slice(1)} &nbsp;·&nbsp; {formatDate(session.savedAt)}
                      </div>
                      {isExpanded && (
                        <div className="ai-saved-preview">
                          {loading && <div className="ai-saved-preview-loading">Loading audio…</div>}
                          {!loading && blob && <WaveformPlayer blob={blob} label={previewLabel} />}
                          {!loading && blob === null && <div className="ai-saved-preview-loading">Audio not found.</div>}
                        </div>
                      )}
                    </div>
                    <div className="ai-saved-actions">
                      <button className="soft-button" style={{ fontSize: '0.85rem' }} onClick={() => void handlePlaySaved(session)}>▶ Launch Session</button>
                      <button className="soft-button" style={{ fontSize: '0.85rem' }} onClick={() => void handleTogglePreview(session.id)}>
                        {isExpanded ? '▲ Hide' : '▼ Preview'}
                      </button>
                      <button className="soft-button" style={{ fontSize: '0.85rem', color: 'var(--danger)' }} onClick={() => handleDeleteSaved(session.id)}>🗑</button>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Idle form */}
        {apiKey && step === 'idle' && !showSaved && (
          <>
            {/* Prompt */}
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

            {/* Intensity */}
            <div className="ai-intensity-row">
              <span className="ai-option-label">Intensity</span>
              <div className="ai-segmented">
                {(['gentle', 'balanced', 'deep'] as Intensity[]).map((lvl) => (
                  <button
                    key={lvl}
                    className={`ai-seg-btn${intensity === lvl ? ' ai-seg-btn--active' : ''}`}
                    onClick={() => setIntensity(lvl)}
                  >
                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Soundscape */}
            <div className="ai-soundscape-row">
              <span className="ai-option-label">Background</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {SOUNDSCAPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`ai-soundscape-btn${soundscape === opt.value ? ' ai-soundscape-btn--active' : ''}`}
                    onClick={() => setSoundscape(opt.value)}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration + Voice row */}
            <div className="ai-options-row">

              {/* Duration */}
              <div className="ai-option-group">
                <span className="ai-option-label">Duration</span>
                <div className="ai-segmented">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      className={`ai-seg-btn${duration === d.value ? ' ai-seg-btn--active' : ''}`}
                      onClick={() => setDuration(d.value)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <span className="ai-cost-note">Est. API cost: {selectedDuration.cost}</span>
              </div>

              {/* Voice gender toggle */}
              <div className="ai-option-group">
                <span className="ai-option-label">Voice</span>
                <div className="ai-gender-toggle">
                  <button
                    className={`ai-gender-btn${gender === 'female' ? ' ai-gender-btn--active' : ''}`}
                    onClick={() => handleGenderChange('female')}
                  >♀ Female</button>
                  <button
                    className={`ai-gender-btn${gender === 'male' ? ' ai-gender-btn--active' : ''}`}
                    onClick={() => handleGenderChange('male')}
                  >♂ Male</button>
                </div>
                {/* Voice picker */}
                <div className="ai-voice-grid">
                  {filteredVoices.map((v) => (
                    <button
                      key={v.voice}
                      className={`ai-voice-btn${voice === v.voice ? ' ai-voice-btn--active' : ''}`}
                      onClick={() => setVoice(v.voice)}
                      title={v.description}
                    >
                      <span className="ai-voice-name">{v.label}</span>
                      <span className="ai-voice-desc">{v.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="ai-generate-btn" onClick={() => void handleGenerate()} disabled={!prompt.trim()}>
                Generate &amp; Start Session
              </button>
            </div>
          </>
        )}

        {/* Generating */}
        {isGenerating && (
          <div className="ai-generating">
            <div className="ai-progress-track">
              <div className="ai-progress-fill" style={{ width: `${progress.toFixed(1)}%` }} />
            </div>
            <div className="ai-rotating-message">{rotatingMessage}</div>
            <ul className="ai-step-indicator">
              {(['writing', 'rendering', 'starting'] as const).map((s, i) => {
                const labels = ['Writing your meditation', 'Rendering voice', 'Starting session']
                const status = stepStatus(s)
                return (
                  <li key={s} className={`ai-step ai-step--${status}`}>
                    <span className="ai-step-icon">{status === 'done' ? '✓' : status === 'active' ? '●' : `${i + 1}`}</span>
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
            </div>
          </div>
        )}

    </div>
  )
}
