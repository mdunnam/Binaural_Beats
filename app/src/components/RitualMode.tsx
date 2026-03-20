import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import type { IconProps } from './Icons'
import { IconMeditate, IconWave, IconPalette, IconMoon, IconSparkle } from './Icons'

export type RitualIntention = {
  id: string
  label: string
  tagline: string
  carrier: number
  beat: number
  noiseType: 'none' | 'pink' | 'brown'
  noiseVolume: number
  soundsceneId: string | undefined
  color: string
  Icon: React.FC<IconProps>
}

export const RITUAL_INTENTIONS: RitualIntention[] = [
  {
    id: 'stillness',
    label: 'Stillness',
    tagline: 'Deep inner quiet. No agenda.',
    carrier: 432,
    beat: 4,
    noiseType: 'brown',
    noiseVolume: 0.06,
    soundsceneId: undefined,
    color: '#5b9bd5',
    Icon: IconMeditate,
  },
  {
    id: 'ceremony',
    label: 'Ceremony',
    tagline: 'Sacred space. Intentional presence.',
    carrier: 432,
    beat: 7,
    noiseType: 'none',
    noiseVolume: 0,
    soundsceneId: undefined,
    color: '#9b59b6',
    Icon: IconMoon,
  },
  {
    id: 'release',
    label: 'Release',
    tagline: 'Let go of tension and mental clutter.',
    carrier: 396,
    beat: 10,
    noiseType: 'pink',
    noiseVolume: 0.08,
    soundsceneId: 'rain',
    color: '#3e8f72',
    Icon: IconWave,
  },
  {
    id: 'creation',
    label: 'Creation',
    tagline: 'Open channel for creative flow.',
    carrier: 852,
    beat: 8,
    noiseType: 'pink',
    noiseVolume: 0.06,
    soundsceneId: undefined,
    color: '#f4c430',
    Icon: IconPalette,
  },
]

type Props = {
  isRunning: boolean
  onStart: (intention: RitualIntention) => void
  onStop: () => void
}

export function RitualMode({ isRunning, onStart, onStop }: Props) {
  const [selected, setSelected] = useState<RitualIntention>(RITUAL_INTENTIONS[0])
  const [immersive, setImmersive] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Exit immersive if session stops externally
  useEffect(() => {
    if (!isRunning && immersive) setImmersive(false)
  }, [isRunning, immersive])

  const enterRitual = () => {
    setImmersive(true)
    onStart(selected)
    containerRef.current?.requestFullscreen?.().catch(() => {})
  }

  const exitRitual = () => {
    setImmersive(false)
    onStop()
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }

  const showControls = () => {
    setControlsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2500)
  }

  if (immersive) {
    return (
      <div
        ref={containerRef}
        className="ritual-immersive"
        onMouseMove={showControls}
        onTouchStart={showControls}
      >
        <div
          className="ritual-orb"
          style={{ '--ritual-color': selected.color } as React.CSSProperties}
        />
        <div className="ritual-center">
          <selected.Icon size={52} style={{ color: selected.color, opacity: 0.75 }} />
          <div className="ritual-immersive-label">{selected.label}</div>
          <div className="ritual-immersive-tagline">{selected.tagline}</div>
        </div>
        <div className={`ritual-controls${controlsVisible ? ' ritual-controls--visible' : ''}`}>
          <button className="ritual-exit-btn" onClick={exitRitual}>Exit Ritual</button>
        </div>
      </div>
    )
  }

  return (
    <div className="ritual-mode">

      {/* Header */}
      <div className="sleep-header">
        <div className="sleep-moon" style={{ color: '#9b59b6' }}><IconSparkle size={36} /></div>
        <h2 className="sleep-title">Ritual Mode</h2>
        <p className="sleep-subtitle">Immersive, intentional sessions. Choose your focus and enter the space.</p>
      </div>

      <div className="sleep-section">
        <span className="section-label">Set your intention</span>
        <div className="ritual-intentions">
          {RITUAL_INTENTIONS.map(intention => (
            <button
              key={intention.id}
              className={`ritual-intention-card${selected.id === intention.id ? ' ritual-intention-card--active' : ''}`}
              style={{ '--ritual-color': intention.color } as React.CSSProperties}
              onClick={() => setSelected(intention)}
            >
              <intention.Icon size={28} style={{ color: intention.color }} />
              <span className="ritual-card-label">{intention.label}</span>
              <span className="ritual-card-tagline">{intention.tagline}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sleep-section sleep-params">
        <div className="sleep-param"><span>Carrier</span><strong>{selected.carrier} Hz</strong></div>
        <div className="sleep-param"><span>Beat frequency</span><strong>{selected.beat} Hz</strong></div>
        <div className="sleep-param">
          <span>Noise</span>
          <strong>{selected.noiseType === 'none' ? 'None — pure silence' : selected.noiseType.charAt(0).toUpperCase() + selected.noiseType.slice(1)}</strong>
        </div>
        {selected.soundsceneId && (
          <div className="sleep-param">
            <span>Soundscape</span>
            <strong>{selected.soundsceneId.charAt(0).toUpperCase() + selected.soundsceneId.slice(1)}</strong>
          </div>
        )}
      </div>

      <button className="ritual-start-btn" onClick={enterRitual}>
        Enter Ritual
      </button>

      <p className="sleep-note">
        Ritual mode goes fullscreen. Move the mouse or tap the screen to reveal controls. Press Esc to exit at any time.
      </p>
    </div>
  )
}
