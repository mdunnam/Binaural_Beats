import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SequencerStage = {
  id: string
  label: string
  beatHz: number
  carrierHz: number
  durationMin: number
  rampSec: number
}

export type SequencerTabProps = {
  isRunning: boolean
  onStartSequence: (stages: SequencerStage[]) => void
  onStop: () => void
  onBeatUpdate: (hz: number) => void
  onCarrierUpdate: (hz: number) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'liminal-sequencer-stages'

const BRAINWAVE_PRESETS = [
  { label: 'Delta', hz: 2,  color: '#7b68ee' },
  { label: 'Theta', hz: 6,  color: '#5b9bd5' },
  { label: 'Alpha', hz: 10, color: '#3e8f72' },
  { label: 'Beta',  hz: 18, color: '#e8b84b' },
  { label: 'Gamma', hz: 40, color: '#e05a3a' },
]

const SOLFEGGIO_PRESETS = [174, 396, 528, 741, 963]

const DEFAULT_STAGES: SequencerStage[] = [
  { id: 'stage-1', label: 'Beta Focus',  beatHz: 18, carrierHz: 396, durationMin: 5,  rampSec: 0   },
  { id: 'stage-2', label: 'Alpha Ease',  beatHz: 10, carrierHz: 528, durationMin: 10, rampSec: 90  },
  { id: 'stage-3', label: 'Theta Drift', beatHz: 6,  carrierHz: 528, durationMin: 15, rampSec: 120 },
  { id: 'stage-4', label: 'Delta Deep',  beatHz: 2,  carrierHz: 174, durationMin: 20, rampSec: 180 },
]

function getBandColor(hz: number): string {
  if (hz <= 3.5)  return '#7b68ee' // Delta
  if (hz <= 7.5)  return '#5b9bd5' // Theta
  if (hz <= 14)   return '#3e8f72' // Alpha
  if (hz <= 30)   return '#e8b84b' // Beta
  return '#e05a3a'                  // Gamma
}

function getBandName(hz: number): string {
  if (hz <= 3.5)  return 'Delta'
  if (hz <= 7.5)  return 'Theta'
  if (hz <= 14)   return 'Alpha'
  if (hz <= 30)   return 'Beta'
  return 'Gamma'
}

function generateId(): string {
  return `stage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function loadStages(): SequencerStage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as SequencerStage[]
  } catch { /* ignore */ }
  return DEFAULT_STAGES
}

function saveStages(stages: SequencerStage[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stages)) } catch { /* ignore */ }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Playback state type
// ---------------------------------------------------------------------------
type PlaybackState = {
  phase: 'ramp' | 'hold'
  stageIndex: number
  phaseElapsedSec: number
  phaseTotalSec: number
  prevBeat: number
  targetBeat: number
} | null

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SequencerTab({ isRunning, onStartSequence, onStop, onBeatUpdate, onCarrierUpdate }: SequencerTabProps) {
  const [stages, setStages] = useState<SequencerStage[]>(() => loadStages())
  const [playing, setPlaying] = useState(false)
  const [playbackState, setPlaybackState] = useState<PlaybackState>(null)

  // Refs for playback engine
  const stagesRef = useRef(stages)
  const intervalRef = useRef<number | null>(null)
  const playbackRef = useRef<PlaybackState>(null)

  useEffect(() => { stagesRef.current = stages }, [stages])
  useEffect(() => { saveStages(stages) }, [stages])

  // If parent stops, stop our playback too
  useEffect(() => {
    if (!isRunning && playing) {
      stopPlayback()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  const stopPlayback = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    playbackRef.current = null
    setPlaybackRef(null)
    setPlaying(false)
    onStop()
  }, [onStop])

  function setPlaybackRef(state: PlaybackState) {
    playbackRef.current = state
    setPlaybackState(state)
  }

  const startPlayback = useCallback(() => {
    const s = stagesRef.current
    if (s.length === 0) return

    // Start audio
    onStartSequence(s)
    onCarrierUpdate(s[0].carrierHz)
    onBeatUpdate(s[0].beatHz)

    // Initial state: first stage starts in hold (rampSec is always 0 for first)
    const firstState: PlaybackState = {
      phase: 'hold',
      stageIndex: 0,
      phaseElapsedSec: 0,
      phaseTotalSec: s[0].durationMin * 60,
      prevBeat: s[0].beatHz,
      targetBeat: s[0].beatHz,
    }
    playbackRef.current = firstState
    setPlaybackState(firstState)
    setPlaying(true)

    const TICK_MS = 100
    intervalRef.current = window.setInterval(() => {
      const cur = playbackRef.current
      if (!cur) return

      const st = stagesRef.current
      const stage = st[cur.stageIndex]
      const next = cur.phaseElapsedSec + TICK_MS / 1000

      if (next < cur.phaseTotalSec) {
        // Still in current phase
        if (cur.phase === 'ramp') {
          const t = next / cur.phaseTotalSec
          const hz = lerp(cur.prevBeat, cur.targetBeat, t)
          onBeatUpdate(hz)
        }
        const updated: PlaybackState = { ...cur, phaseElapsedSec: next }
        playbackRef.current = updated
        setPlaybackState(updated)
      } else {
        // Phase complete
        if (cur.phase === 'ramp') {
          // Transition to hold
          onBeatUpdate(stage.beatHz)
          onCarrierUpdate(stage.carrierHz)
          const holdState: PlaybackState = {
            phase: 'hold',
            stageIndex: cur.stageIndex,
            phaseElapsedSec: 0,
            phaseTotalSec: stage.durationMin * 60,
            prevBeat: stage.beatHz,
            targetBeat: stage.beatHz,
          }
          playbackRef.current = holdState
          setPlaybackState(holdState)
        } else {
          // Hold complete - advance to next stage
          const nextIndex = cur.stageIndex + 1
          if (nextIndex >= st.length) {
            // Sequence finished
            if (intervalRef.current !== null) {
              window.clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            playbackRef.current = null
            setPlaybackState(null)
            setPlaying(false)
            onStop()
            return
          }

          const nextStage = st[nextIndex]
          if (nextStage.rampSec > 0) {
            // Start ramp into next stage
            const rampState: PlaybackState = {
              phase: 'ramp',
              stageIndex: nextIndex,
              phaseElapsedSec: 0,
              phaseTotalSec: nextStage.rampSec,
              prevBeat: stage.beatHz,
              targetBeat: nextStage.beatHz,
            }
            playbackRef.current = rampState
            setPlaybackState(rampState)
          } else {
            // No ramp - jump straight to hold
            onBeatUpdate(nextStage.beatHz)
            onCarrierUpdate(nextStage.carrierHz)
            const holdState: PlaybackState = {
              phase: 'hold',
              stageIndex: nextIndex,
              phaseElapsedSec: 0,
              phaseTotalSec: nextStage.durationMin * 60,
              prevBeat: nextStage.beatHz,
              targetBeat: nextStage.beatHz,
            }
            playbackRef.current = holdState
            setPlaybackState(holdState)
          }
        }
      }
    }, TICK_MS)
  }, [onStartSequence, onBeatUpdate, onCarrierUpdate, onStop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Stage editing helpers
  // ---------------------------------------------------------------------------
  function updateStage(id: string, patch: Partial<SequencerStage>) {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function addStage() {
    setStages(prev => [...prev, {
      id: generateId(),
      label: 'Alpha Ease',
      beatHz: 10,
      carrierHz: 528,
      durationMin: 15,
      rampSec: 30,
    }])
  }

  function deleteStage(id: string) {
    setStages(prev => {
      const next = prev.filter(s => s.id !== id)
      if (next.length > 0) next[0] = { ...next[0], rampSec: 0 }
      return next
    })
  }

  function moveStage(id: string, dir: -1 | 1) {
    setStages(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      // Ensure first stage has no ramp
      arr[0] = { ...arr[0], rampSec: 0 }
      return arr
    })
  }

  // ---------------------------------------------------------------------------
  // Timeline computation
  // ---------------------------------------------------------------------------
  const totalSec = stages.reduce((acc, s, i) => acc + (i > 0 ? s.rampSec : 0) + s.durationMin * 60, 0)
  const totalMin = Math.round(totalSec / 60)

  // Build segments for timeline
  type Segment = { key: string; widthPct: number; color: string; isRamp: boolean; fromColor?: string; toColor?: string }
  const segments: Segment[] = []
  stages.forEach((stage, i) => {
    const prev = stages[i - 1]
    if (i > 0 && stage.rampSec > 0 && prev) {
      segments.push({
        key: `${stage.id}-ramp`,
        widthPct: (stage.rampSec / totalSec) * 100,
        color: '',
        isRamp: true,
        fromColor: getBandColor(prev.beatHz),
        toColor: getBandColor(stage.beatHz),
      })
    }
    const holdSec = stage.durationMin * 60
    segments.push({
      key: `${stage.id}-hold`,
      widthPct: (holdSec / totalSec) * 100,
      color: getBandColor(stage.beatHz),
      isRamp: false,
    })
  })

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  function renderPlaybackStatus() {
    if (!playing || !playbackState) return null
    const stage = stages[playbackState.stageIndex]
    if (!stage) return null
    const remaining = playbackState.phaseTotalSec - playbackState.phaseElapsedSec
    return (
      <div className="seq-playback-status">
        {playbackState.phase === 'ramp' ? (
          <span>Ramping → <strong>{stage.label}</strong> ({fmtTime(remaining)} left)</span>
        ) : (
          <span>Holding <strong>{stage.label}</strong> ({fmtTime(remaining)} left)</span>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="tab-sections">
      {/* Header */}
      <div className="section-block">
        <div className="section-title">Stage Sequencer</div>
        <div className="section-card">
          <p className="control-hint">
            Design a brainwave journey. Stages play in order with smooth ramps between frequencies.
            Total: <strong>{totalMin} min</strong>
          </p>

          {/* Playback controls */}
          <div className="seq-controls">
            {!playing ? (
              <button
                className="start-button"
                onClick={startPlayback}
                disabled={stages.length === 0}
              >
                ▶ Play Sequence
              </button>
            ) : (
              <button className="start-button start-button--active" onClick={stopPlayback}>
                ■ Stop
              </button>
            )}
          </div>

          {renderPlaybackStatus()}
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="section-block">
        <div className="section-title">Timeline</div>
        <div className="section-card">
          {totalSec > 0 && (
            <div className="seq-timeline-wrap">
              <div className="seq-timeline-bar">
                {segments.map(seg => (
                  <div
                    key={seg.key}
                    className="seq-timeline-seg"
                    style={{
                      width: `${seg.widthPct}%`,
                      background: seg.isRamp
                        ? `linear-gradient(to right, ${seg.fromColor}, ${seg.toColor})`
                        : seg.color,
                    }}
                  />
                ))}
              </div>
              <div className="seq-timeline-labels">
                {stages.map((stage, i) => {
                  // Position at center of hold block
                  let offsetSec = 0
                  stages.forEach((s, j) => {
                    if (j < i) offsetSec += (j > 0 ? s.rampSec : 0) + s.durationMin * 60
                    if (j === i) offsetSec += stage.rampSec
                  })
                  const holdSec = stage.durationMin * 60
                  const centerPct = ((offsetSec + holdSec / 2) / totalSec) * 100
                  return (
                    <span
                      key={stage.id}
                      className="seq-timeline-label"
                      style={{ left: `${centerPct}%` }}
                    >
                      {getBandName(stage.beatHz)}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          <div className="seq-timeline-total">Total: {totalMin} min</div>
        </div>
      </div>

      {/* Stage list */}
      <div className="section-block">
        <div className="section-title">Stages</div>

        {stages.map((stage, i) => {
          const isActive = playing && playbackState?.stageIndex === i
          const bandColor = getBandColor(stage.beatHz)
          return (
            <div
              key={stage.id}
              className="section-card seq-stage-card"
              style={{
                borderLeft: isActive ? `3px solid ${bandColor}` : '3px solid transparent',
              }}
            >
              {/* Color band strip */}
              <div className="seq-stage-band" style={{ background: bandColor }} />

              {/* Stage header */}
              <div className="seq-stage-header">
                <input
                  className="text-input seq-stage-label-input"
                  value={stage.label}
                  onChange={e => updateStage(stage.id, { label: e.target.value })}
                  placeholder="Stage name"
                />
                <div className="seq-stage-header-actions">
                  <button
                    className="soft-button seq-move-btn"
                    disabled={i === 0}
                    onClick={() => moveStage(stage.id, -1)}
                    title="Move up"
                  >↑</button>
                  <button
                    className="soft-button seq-move-btn"
                    disabled={i === stages.length - 1}
                    onClick={() => moveStage(stage.id, 1)}
                    title="Move down"
                  >↓</button>
                  <button
                    className="soft-button soft-button--danger seq-delete-btn"
                    onClick={() => deleteStage(stage.id)}
                    title="Delete stage"
                  >✕</button>
                </div>
              </div>

              {/* Brainwave presets */}
              <div className="seq-preset-group">
                <span className="section-label">Brainwave</span>
                <div className="seq-preset-btns">
                  {BRAINWAVE_PRESETS.map(p => (
                    <button
                      key={p.label}
                      className={`seq-preset-btn ${stage.beatHz === p.hz ? 'seq-preset-btn--active' : ''}`}
                      style={{ '--preset-color': p.color } as React.CSSProperties}
                      onClick={() => updateStage(stage.id, { beatHz: p.hz, label: stage.label === 'Alpha Ease' || DEFAULT_STAGES.some(d => d.label === stage.label) ? `${p.label} ${p.label === 'Delta' ? 'Deep' : p.label === 'Theta' ? 'Drift' : p.label === 'Alpha' ? 'Ease' : p.label === 'Beta' ? 'Focus' : 'Peak'}` : stage.label })}
                    >
                      {p.label}<br /><small>{p.hz} Hz</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* Beat Hz slider */}
              <label className="seq-slider-label">
                Beat Frequency: <strong>{stage.beatHz.toFixed(1)} Hz</strong> — {getBandName(stage.beatHz)}
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={0.1}
                  value={stage.beatHz}
                  onChange={e => updateStage(stage.id, { beatHz: Number(e.target.value) })}
                />
              </label>

              {/* Carrier Hz presets */}
              <div className="seq-preset-group">
                <span className="section-label">Carrier (Solfeggio)</span>
                <div className="seq-preset-btns seq-carrier-btns">
                  {SOLFEGGIO_PRESETS.map(hz => (
                    <button
                      key={hz}
                      className={`seq-preset-btn ${stage.carrierHz === hz ? 'seq-preset-btn--active seq-preset-btn--carrier-active' : ''}`}
                      onClick={() => updateStage(stage.id, { carrierHz: hz })}
                    >
                      {hz}
                    </button>
                  ))}
                </div>
                <span className="seq-carrier-display">{stage.carrierHz} Hz</span>
              </div>

              {/* Duration slider */}
              <label className="seq-slider-label">
                Duration: <strong>{stage.durationMin} min</strong>
                <input
                  type="range"
                  min={1}
                  max={60}
                  step={1}
                  value={stage.durationMin}
                  onChange={e => updateStage(stage.id, { durationMin: Number(e.target.value) })}
                />
              </label>

              {/* Ramp slider (hidden for first stage) */}
              {i > 0 && (
                <label className="seq-slider-label">
                  Ramp into this stage: <strong>{stage.rampSec}s</strong>
                  <input
                    type="range"
                    min={0}
                    max={300}
                    step={5}
                    value={stage.rampSec}
                    onChange={e => updateStage(stage.id, { rampSec: Number(e.target.value) })}
                  />
                </label>
              )}
            </div>
          )
        })}

        <button className="soft-button seq-add-btn" onClick={addStage}>
          + Add Stage
        </button>
      </div>
    </div>
  )
}
