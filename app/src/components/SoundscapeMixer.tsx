import { SOUND_LAYERS, SOUNDSCAPE_SCENES } from '../engine/soundscapeMixer'
import type { LayerGains, SoundLayerId } from '../engine/soundscapeMixer'
import { DEFAULT_GAINS } from '../engine/soundscapeMixer'

interface SoundscapeMixerProps {
  gains: LayerGains
  onChange: (gains: LayerGains) => void
  disabled?: boolean
  activeSceneId?: string
  onSceneChange?: (sceneId: string) => void
}

export function SoundscapeMixer({ gains, onChange, disabled, activeSceneId, onSceneChange }: SoundscapeMixerProps) {
  const handleSceneClick = (sceneId: string) => {
    const scene = SOUNDSCAPE_SCENES.find(s => s.id === sceneId)
    if (!scene) return
    const newGains: LayerGains = { ...DEFAULT_GAINS }
    for (const [id, val] of Object.entries(scene.gains)) {
      newGains[id as SoundLayerId] = val as number
    }
    onChange(newGains)
    onSceneChange?.(sceneId)
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
