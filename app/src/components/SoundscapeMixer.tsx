import { useRef, useState, useEffect } from 'react'
import { SOUND_LAYERS, SOUNDSCAPE_SCENES } from '../engine/soundscapeMixer'
import type { LayerGains, SoundLayerId } from '../engine/soundscapeMixer'
import { DEFAULT_GAINS } from '../engine/soundscapeMixer'

interface SoundscapeMixerProps {
  gains: LayerGains
  onChange: (gains: LayerGains) => void
  disabled?: boolean
  activeSceneId?: string
  onSceneChange?: (sceneId: string) => void
  crossfadeDuration?: number
}

export function SoundscapeMixer({
  gains,
  onChange,
  disabled,
  activeSceneId,
  onSceneChange,
  crossfadeDuration = 3000,
}: SoundscapeMixerProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  // Keep a ref to current gains so interval closures have fresh data
  const gainsRef = useRef<LayerGains>(gains)
  useEffect(() => { gainsRef.current = gains }, [gains])

  const animateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const morphIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Animate drift ---
  const scheduleNextDrift = (active: boolean) => {
    if (!active) return
    const delay = 4000 + Math.random() * 4000 // 4–8s
    animateTimerRef.current = setTimeout(() => {
      const current = gainsRef.current
      const layerIds = SOUND_LAYERS.map(l => l.id)
      // Pick 1–2 random layers
      const shuffled = [...layerIds].sort(() => Math.random() - 0.5)
      const count = Math.random() < 0.5 ? 1 : 2
      const picked = shuffled.slice(0, count)
      const updated = { ...current }
      for (const id of picked) {
        const delta = (Math.random() * 0.1 + 0.05) * (Math.random() < 0.5 ? 1 : -1)
        updated[id] = Math.min(1, Math.max(0, current[id] + delta))
      }
      onChange(updated)
      scheduleNextDrift(true)
    }, delay)
  }

  const stopAnimate = () => {
    if (animateTimerRef.current !== null) {
      clearTimeout(animateTimerRef.current)
      animateTimerRef.current = null
    }
  }

  const toggleAnimate = () => {
    if (isAnimating) {
      stopAnimate()
      setIsAnimating(false)
    } else {
      setIsAnimating(true)
      scheduleNextDrift(true)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimate()
      if (morphIntervalRef.current !== null) clearInterval(morphIntervalRef.current)
    }
  }, [])

  // Stop animate when disabled
  useEffect(() => {
    if (disabled && isAnimating) {
      stopAnimate()
      setIsAnimating(false)
    }
  }, [disabled])

  // --- Scene crossfade ---
  const handleSceneClick = (sceneId: string) => {
    const scene = SOUNDSCAPE_SCENES.find(s => s.id === sceneId)
    if (!scene) return

    const targetGains: LayerGains = { ...DEFAULT_GAINS }
    for (const [id, val] of Object.entries(scene.gains)) {
      targetGains[id as SoundLayerId] = val as number
    }

    // Check if anything is playing
    const currentGains = gainsRef.current
    const isPlaying = Object.values(currentGains).some(v => v > 0)

    // Clear any in-progress morph
    if (morphIntervalRef.current !== null) {
      clearInterval(morphIntervalRef.current)
      morphIntervalRef.current = null
    }

    if (!isPlaying) {
      // Silent — hard cut
      onChange(targetGains)
      onSceneChange?.(sceneId)
      return
    }

    // Crossfade over crossfadeDuration ms at ~30fps
    const intervalMs = 33
    const steps = Math.round(crossfadeDuration / intervalMs)
    let step = 0
    const startGains = { ...currentGains }

    morphIntervalRef.current = setInterval(() => {
      step++
      const t = Math.min(step / steps, 1)
      const intermediate: LayerGains = {} as LayerGains
      for (const id of SOUND_LAYERS.map(l => l.id)) {
        intermediate[id] = startGains[id] + (targetGains[id] - startGains[id]) * t
      }
      onChange(intermediate)
      if (t >= 1) {
        clearInterval(morphIntervalRef.current!)
        morphIntervalRef.current = null
        onSceneChange?.(sceneId)
      }
    }, intervalMs)
  }

  const handleSlider = (id: SoundLayerId, value: number) => {
    const newGains = { ...gains, [id]: value }
    onChange(newGains)
    onSceneChange?.('custom')
  }

  return (
    <div className="soundscape-mixer">
      <div className="soundscape-scenes">
        {SOUNDSCAPE_SCENES.map(scene => (
          <button
            key={scene.id}
            type="button"
            className={`soundscape-scene-btn${activeSceneId === scene.id ? ' soundscape-scene-btn--active' : ''}`}
            onClick={() => handleSceneClick(scene.id)}
            disabled={disabled}
          >
            {scene.emoji} {scene.label}
          </button>
        ))}
        <button
          type="button"
          className={`soundscape-scene-btn soundscape-animate-btn${isAnimating ? ' soundscape-animate-btn--active' : ''}`}
          onClick={toggleAnimate}
          disabled={disabled}
          title={isAnimating ? 'Stop drift animation' : 'Animate sound layers with organic drift'}
        >
          {isAnimating ? '⏹ Stop' : '✨ Animate'}
        </button>
      </div>

      {SOUND_LAYERS.map(layer => (
        <div key={layer.id} className="soundscape-layer-row">
          <span className="soundscape-layer-icon">{layer.emoji}</span>
          <span className="soundscape-layer-label">{layer.label}</span>
          <input
            type="range"
            className="soundscape-layer-slider"
            min={0}
            max={1}
            step={0.01}
            value={gains[layer.id]}
            disabled={disabled}
            onChange={e => handleSlider(layer.id, Number(e.target.value))}
          />
          <span className="soundscape-layer-pct">{Math.round(gains[layer.id] * 100)}%</span>
        </div>
      ))}
    </div>
  )
}
