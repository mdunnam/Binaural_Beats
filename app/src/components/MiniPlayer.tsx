import { PlayerTab } from './PlayerTab'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface MiniPlayerProps {
  isRunning: boolean
  ambientRunning: boolean
  carrier: number
  beat: number
  remainingSeconds: number
  sessionTotalSeconds: number
  soundsceneId: string
  volume: number
  setVolume: (v: number) => void
  binauralVolume: number
  setBinauralVolume: (v: number) => void
  noiseVolume: number
  setNoiseVolume: (v: number) => void
  voiceVolume: number
  setVoiceVolume: (v: number) => void
  voiceReverb: number
  setVoiceReverb: (v: number) => void
  analyserNode: AnalyserNode | null
  voiceObjectUrl: string | null
  onToggle: () => void
  setCarrier: (v: number) => void
  setBeat: (v: number) => void
  setWobbleRate: (v: number) => void
  isExpanded: boolean
  onToggleExpand: () => void
  onOpenVisual: () => void
}

function getBrainwaveLabel(beat: number): string {
  if (beat < 4) return 'Delta'
  if (beat < 8) return 'Theta'
  if (beat < 14) return 'Alpha'
  if (beat < 30) return 'Beta'
  return 'Gamma'
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function MiniPlayer(props: MiniPlayerProps) {
  const {
    isExpanded, onToggleExpand, onOpenVisual,
    isRunning, ambientRunning, carrier, beat, remainingSeconds, volume, setVolume, onToggle,
    sessionTotalSeconds, soundsceneId,
    binauralVolume, setBinauralVolume,
    noiseVolume, setNoiseVolume,
    voiceVolume, setVoiceVolume,
    voiceReverb, setVoiceReverb,
    analyserNode, voiceObjectUrl,
    setCarrier, setBeat, setWobbleRate,
  } = props

  const brainwaveLabel = getBrainwaveLabel(beat)
  const timerDisplay = formatTimer(remainingSeconds)

  const playerTabProps = {
    isRunning, carrier, beat, remainingSeconds, sessionTotalSeconds,
    soundsceneId, volume, setVolume, binauralVolume, setBinauralVolume,
    noiseVolume, setNoiseVolume, voiceVolume, setVoiceVolume,
    voiceReverb, setVoiceReverb, analyserNode, voiceObjectUrl,
    onToggle, setCarrier, setBeat, setWobbleRate,
  }

  return (
    <div className={`mini-player${isExpanded ? ' mini-player--expanded' : ''}`}>

      {/* Expanded content comes first in DOM so the bar doesn't overlap it */}
      {isExpanded && (
        <div className="mini-player-expanded-content">
          <div className="mini-player-visualize-row">
            <button
              className="mini-player-collapse-top"
              onClick={onToggleExpand}
              aria-label="Collapse player"
              title="Collapse player"
            >
              ▼ Close
            </button>
            <button
              className="mini-player-visualize-btn"
              onClick={onOpenVisual}
            >
              Visualize 👁
            </button>
          </div>
          <PlayerTab {...playerTabProps} />
        </div>
      )}

      {/* Bar always at bottom */}
      <div className="mini-player-bar">
        <div className="mini-player-info">
          {ambientRunning && !isRunning ? (
            <span className="mini-player-hz">🌊 Ambient</span>
          ) : (
            <>
              <span className="mini-player-hz">{carrier.toFixed(0)} Hz</span>
              <span className="mini-player-sep">·</span>
              <span className="mini-player-hz">{beat.toFixed(1)} Hz</span>
              <span className="mini-player-sep">·</span>
              <span className="mini-player-state">{brainwaveLabel}</span>
              <span className="mini-player-sep">·</span>
              <span className="mini-player-timer">{timerDisplay}</span>
            </>
          )}
        </div>

        <button
          className={`mini-player-play-btn${isRunning ? ' mini-player-play-btn--active' : ''}`}
          onClick={onToggle}
          title={isRunning ? 'Stop Session' : 'Start Session'}
          aria-label={isRunning ? 'Stop Session' : 'Start Session'}
        >
          {isRunning ? '■' : '▶'}
        </button>

        <div className="mini-player-vol-wrap" title="Master Volume">
          <input
            type="range"
            className="mini-player-vol-slider"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            aria-label="Master volume"
          />
        </div>

        <button
          className="mini-player-expand-btn"
          onClick={onToggleExpand}
          title={isExpanded ? 'Collapse player' : 'Expand player'}
          aria-label={isExpanded ? 'Collapse player' : 'Expand player'}
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

    </div>
  )
}
