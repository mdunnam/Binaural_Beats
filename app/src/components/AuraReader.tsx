import { useState, useRef, useCallback } from 'react'
import { analyzeImagePixels, buildAuraProfile, assessAuraQuality, AuraProfile, AuraQualityResult, TuningStep } from '../lib/auraAnalyzer'
import { AuraTuning } from './AuraTuning'

interface AuraReaderProps {
  onStartSession: (carrier: number, beat: number, soundscape: string, label: string) => void
  onStartTuning: (steps: TuningStep[]) => void
}

type Phase = 'idle' | 'loading' | 'result'

export function AuraReader({ onStartSession, onStartTuning }: AuraReaderProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [profile, setProfile] = useState<AuraProfile | null>(null)
  const [quality, setQuality] = useState<AuraQualityResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const analyzeFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setPhase('loading')
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    const img = new Image()
    img.onload = () => {
      // Small delay for dramatic effect
      setTimeout(() => {
        const analysis = analyzeImagePixels(img)
        const result = buildAuraProfile(analysis)
        const qualityResult = assessAuraQuality(result)
        setProfile(result)
        setQuality(qualityResult)
        setPhase('result')
        URL.revokeObjectURL(url)
      }, 1800)
    }
    img.src = url
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) analyzeFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) analyzeFile(file)
  }

  function reset() {
    setPhase('idle')
    setProfile(null)
    setQuality(null)
    setPreviewUrl(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="aura-reader">
      <div className="aura-reader-header">
        <h2 className="aura-reader-title">✨ Aura Reading</h2>
        <p className="aura-reader-sub">Drop a photo and discover your frequency</p>
      </div>

      {phase === 'idle' && (
        <div
          className={`aura-drop-zone ${dragOver ? 'aura-drop-zone--over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="aura-drop-icon">🔮</div>
          <div className="aura-drop-text">Drop a photo here</div>
          <div className="aura-drop-sub">or tap to browse — selfie, artwork, anything</div>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>
      )}

      {phase === 'loading' && (
        <div className="aura-loading">
          {previewUrl && <img src={previewUrl} className="aura-preview-img" alt="Analyzing" />}
          <div className="aura-loading-orb" />
          <div className="aura-loading-text">Reading your aura…</div>
          <div className="aura-loading-sub">Analyzing color frequencies</div>
        </div>
      )}

      {phase === 'result' && profile && (
        <div className="aura-result">
          {/* Card */}
          <div className="aura-card" style={{ background: profile.auraGradient }}>
            <div className="aura-card-orb" style={{ background: profile.auraColor }} />
            <div className="aura-card-name">{profile.auraName}</div>
            <div className="aura-card-hz">{profile.carrier} Hz · {profile.beat} Hz beat</div>
            <div className="aura-card-state">{profile.brainwaveState} Wave</div>
          </div>

          {/* Description */}
          <p className="aura-description">{profile.description}</p>

          {/* Stats */}
          <div className="aura-stats">
            <div className="aura-stat">
              <span className="aura-stat-label">Carrier</span>
              <span className="aura-stat-value">{profile.carrier} Hz</span>
            </div>
            <div className="aura-stat">
              <span className="aura-stat-label">Beat</span>
              <span className="aura-stat-value">{profile.beat} Hz</span>
            </div>
            <div className="aura-stat">
              <span className="aura-stat-label">State</span>
              <span className="aura-stat-value">{profile.brainwaveState}</span>
            </div>
            <div className="aura-stat">
              <span className="aura-stat-label">Energy</span>
              <span className="aura-stat-value">{Math.round(profile.energy * 100)}%</span>
            </div>
          </div>

          {/* Actions */}
          <div className="aura-actions">
            <button
              className="soft-button soft-button--accent"
              onClick={() => onStartSession(
                profile.sessionPreset.carrier,
                profile.sessionPreset.beat,
                profile.sessionPreset.soundscape,
                profile.sessionPreset.label
              )}
            >
              🎧 Start Aura Session
            </button>
            <button className="soft-button" onClick={reset}>
              Try Another
            </button>
          </div>

          {quality && (
            <AuraTuning
              profile={profile}
              assessment={quality}
              onStartTuning={onStartTuning}
            />
          )}
        </div>
      )}
    </div>
  )
}
