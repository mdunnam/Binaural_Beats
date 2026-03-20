import { useState } from 'react'
import type React from 'react'
import { FocusMode } from './FocusMode'
import { SleepMode } from './SleepMode'
import { LucidDreamMode } from './LucidDreamMode'
import { RitualMode } from './RitualMode'
import { VisualTab } from './VisualTab'
import type { RitualIntention } from './RitualMode'
import { IconLightning, IconMoon, IconSparkle, IconMeditate } from './Icons'
import type { IconProps } from './Icons'

type ModeId = 'focus' | 'sleep' | 'lucid' | 'ritual'

const MODES: { id: ModeId; label: string; desc: string; Icon: React.FC<IconProps>; color: string }[] = [
  { id: 'focus',  label: 'Focus',       desc: 'Beta-driven deep work',       Icon: IconLightning, color: '#f4c430' },
  { id: 'sleep',  label: 'Sleep',       desc: 'Guided descent to delta',      Icon: IconMoon,      color: '#5b9bd5' },
  { id: 'lucid',  label: 'Lucid Dream', desc: 'REM-cycle theta journey',      Icon: IconSparkle,   color: '#7b68ee' },
  { id: 'ritual', label: 'Ritual',      desc: 'Immersive intentional space',  Icon: IconMeditate,  color: '#9b59b6' },
]

type Props = {
  isRunning: boolean
  remainingSeconds: number
  sessionTotalSeconds: number
  activeStageIndex: number
  carrier: number
  beat: number
  analyser: AnalyserNode | null
  onStartFocus: (minutes: number) => void
  onStartSleep: (hours: number) => void
  onStartLucid: (hours: number) => void
  onStartRitual: (intention: RitualIntention) => void
  onStop: () => void
}

export function ModesTab({
  isRunning, remainingSeconds, sessionTotalSeconds, activeStageIndex,
  carrier, beat, analyser,
  onStartFocus, onStartSleep, onStartLucid, onStartRitual, onStop,
}: Props) {
  const [activeMode, setActiveMode] = useState<ModeId>('focus')
  const [vizOpen, setVizOpen] = useState(false)

  return (
    <div className="modes-tab">

      {/* ── Mode picker ────────────────────────────────────────────────────── */}
      <div className="modes-picker">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`modes-card${activeMode === m.id ? ' modes-card--active' : ''}`}
            style={{ '--mode-color': m.color } as React.CSSProperties}
            onClick={() => setActiveMode(m.id)}
          >
            <m.Icon size={18} style={{ color: m.color }} />
            <span className="modes-card-label">{m.label}</span>
            <span className="modes-card-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* ── Active mode content ────────────────────────────────────────────── */}
      {activeMode === 'focus' && (
        <FocusMode
          isRunning={isRunning}
          remainingSeconds={remainingSeconds}
          activeStageIndex={activeStageIndex}
          onStart={onStartFocus}
          onStop={onStop}
        />
      )}
      {activeMode === 'sleep' && (
        <SleepMode
          isRunning={isRunning}
          remainingSeconds={remainingSeconds}
          sessionTotalSeconds={sessionTotalSeconds}
          activeStageIndex={activeStageIndex}
          onStart={onStartSleep}
          onStop={onStop}
        />
      )}
      {activeMode === 'lucid' && (
        <LucidDreamMode
          isRunning={isRunning}
          remainingSeconds={remainingSeconds}
          activeStageIndex={activeStageIndex}
          onStart={onStartLucid}
          onStop={onStop}
        />
      )}
      {activeMode === 'ritual' && (
        <RitualMode
          isRunning={isRunning}
          onStart={onStartRitual}
          onStop={onStop}
        />
      )}

      {/* ── Collapsible visualization ──────────────────────────────────────── */}
      <div className="modes-viz-section">
        <button className="modes-viz-toggle" onClick={() => setVizOpen(v => !v)}>
          <span>Visualization</span>
          <span className={`modes-viz-chevron${vizOpen ? ' modes-viz-chevron--open' : ''}`}>▾</span>
        </button>
        {vizOpen && (
          <VisualTab
            carrier={carrier}
            beat={beat}
            isRunning={isRunning}
            analyser={analyser}
          />
        )}
      </div>

    </div>
  )
}
