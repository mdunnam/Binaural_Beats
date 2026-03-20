import { useState } from 'react'
import type { Journey, JourneyStage } from '../engine/journeyEngine'
import { beatToColor } from '../engine/journeyEngine'
import { SOUNDSCAPE_SCENES } from '../engine/soundscapeMixer'
import { generateJourney } from '../ai/journeyComposer'
import type { JourneyIntent as _JourneyIntent } from '../ai/journeyComposer'

export const BUILT_IN_JOURNEYS: Journey[] = [
  {
    id: 'sleep-descent',
    name: 'Sleep Descent',
    stages: [
      { id: 'sd-1', label: 'Wind Down',   carrier: 396, beat: 14, wobbleRate: 0.4, durationMinutes: 5,  soundsceneId: 'rain',   color: '#e8b84b' },
      { id: 'sd-2', label: 'Alpha Gate',  carrier: 432, beat: 9,  wobbleRate: 0.3, durationMinutes: 10, soundsceneId: 'rain',   color: '#3e8f72' },
      { id: 'sd-3', label: 'Theta Drift', carrier: 528, beat: 6,  wobbleRate: 0.2, durationMinutes: 10, soundsceneId: 'rain',   color: '#5b9bd5' },
      { id: 'sd-4', label: 'Deep Delta',  carrier: 174, beat: 2,  wobbleRate: 0.1, durationMinutes: 5,  soundsceneId: 'rain',   color: '#7b68ee' },
    ],
  },
  {
    id: 'focus-ramp',
    name: 'Focus Ramp',
    stages: [
      { id: 'fr-1', label: 'Clear',   carrier: 396, beat: 10, wobbleRate: 0.4, durationMinutes: 5,  soundsceneId: 'forest', color: '#3e8f72' },
      { id: 'fr-2', label: 'Sharp',   carrier: 396, beat: 14, wobbleRate: 0.6, durationMinutes: 10, soundsceneId: 'forest', color: '#e8b84b' },
      { id: 'fr-3', label: 'Peak',    carrier: 528, beat: 18, wobbleRate: 0.8, durationMinutes: 10, soundsceneId: 'forest', color: '#e05a3a' },
      { id: 'fr-4', label: 'Sustain', carrier: 528, beat: 18, wobbleRate: 0.6, durationMinutes: 5,  soundsceneId: 'forest', color: '#e05a3a' },
    ],
  },
  {
    id: 'deep-meditate',
    name: 'Deep Meditate',
    stages: [
      { id: 'dm-1', label: 'Arrive',  carrier: 528, beat: 10, wobbleRate: 0.3,  durationMinutes: 5,  soundsceneId: 'cave', color: '#3e8f72' },
      { id: 'dm-2', label: 'Settle',  carrier: 528, beat: 7,  wobbleRate: 0.2,  durationMinutes: 10, soundsceneId: 'cave', color: '#5b9bd5' },
      { id: 'dm-3', label: 'Deepen',  carrier: 528, beat: 4,  wobbleRate: 0.15, durationMinutes: 15, soundsceneId: 'cave', color: '#5b9bd5' },
      { id: 'dm-4', label: 'Release', carrier: 174, beat: 2,  wobbleRate: 0.1,  durationMinutes: 10, soundsceneId: 'cave', color: '#7b68ee' },
    ],
  },
  {
    id: 'morning-rise',
    name: 'Morning Rise',
    stages: [
      { id: 'mr-1', label: 'Wake',     carrier: 396, beat: 6,  wobbleRate: 0.2, durationMinutes: 5, soundsceneId: 'forest', color: '#5b9bd5' },
      { id: 'mr-2', label: 'Emerge',   carrier: 528, beat: 10, wobbleRate: 0.4, durationMinutes: 5, soundsceneId: 'forest', color: '#3e8f72' },
      { id: 'mr-3', label: 'Activate', carrier: 741, beat: 18, wobbleRate: 0.6, durationMinutes: 5, soundsceneId: 'forest', color: '#e8b84b' },
      { id: 'mr-4', label: 'Peak',     carrier: 852, beat: 40, wobbleRate: 0.8, durationMinutes: 5, soundsceneId: 'forest', color: '#e05a3a' },
    ],
  },
]

type JourneyBuilderProps = {
  isRunning: boolean
  journey: Journey | null
  setJourney: (j: Journey | null) => void
  activeStageIndex: number
  setCarrier: (v: number) => void
  setBeat: (v: number) => void
  setWobbleRate: (v: number) => void
  setSoundsceneId: (id: string) => void
  apiKey: string
}

function newStage(): JourneyStage {
  return {
    id: crypto.randomUUID(),
    label: 'New Stage',
    carrier: 432,
    beat: 10,
    wobbleRate: 0.3,
    durationMinutes: 5,
    soundsceneId: 'rain',
    color: beatToColor(10),
  }
}

export function JourneyBuilder({
  isRunning,
  journey,
  setJourney,
  activeStageIndex,
  setCarrier,
  setBeat,
  setWobbleRate,
  setSoundsceneId,
  apiKey,
}: JourneyBuilderProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [presetsOpen, setPresetsOpen] = useState(true)

  // AI panel state
  const [aiGoal, setAiGoal] = useState('')
  const [aiDuration, setAiDuration] = useState(30)
  const [aiStages, setAiStages] = useState(4)
  const [aiStyle, setAiStyle] = useState<'gentle' | 'balanced' | 'deep'>('balanced')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(true)

  const stages = journey?.stages ?? []
  const totalMinutes = stages.reduce((s, st) => s + st.durationMinutes, 0)

  const handleGenerateJourney = async () => {
    if (!aiGoal.trim() || !apiKey) return
    setAiLoading(true)
    setAiError(null)
    try {
      const generated = await generateJourney(
        { goal: aiGoal, durationMinutes: aiDuration, stageCount: aiStages, style: aiStyle },
        apiKey,
      )
      setJourney(generated)
      setSelectedIdx(null)
      setAiGoal('')
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const updateStage = (idx: number, patch: Partial<JourneyStage>) => {
    if (!journey) return
    const next = journey.stages.map((s, i) => {
      if (i !== idx) return s
      const updated = { ...s, ...patch }
      // Auto-update color when beat changes
      if (patch.beat !== undefined) updated.color = beatToColor(patch.beat)
      return updated
    })
    setJourney({ ...journey, stages: next })
  }

  const addStage = () => {
    const base = journey ?? { id: crypto.randomUUID(), name: 'My Journey', stages: [] }
    const ns = newStage()
    setJourney({ ...base, stages: [...base.stages, ns] })
    setSelectedIdx(base.stages.length)
  }

  const deleteStage = (idx: number) => {
    if (!journey) return
    const next = journey.stages.filter((_, i) => i !== idx)
    setJourney({ ...journey, stages: next })
    setSelectedIdx(null)
  }

  const previewStage = (stage: JourneyStage) => {
    setCarrier(stage.carrier)
    setBeat(stage.beat)
    setWobbleRate(stage.wobbleRate)
    setSoundsceneId(stage.soundsceneId)
  }

  const selectedStage = selectedIdx !== null ? stages[selectedIdx] : null

  return (
    <div className="journey-builder">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div className="journey-section-label" style={{ margin: 0 }}>🗺 Journey Builder</div>
        <button className="soft-button" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={addStage}>
          + New Stage
        </button>
      </div>

      {/* Total time */}
      {stages.length > 0 && (
        <div className="journey-total-time">Total: {totalMinutes} min</div>
      )}

      {/* Timeline */}
      {stages.length > 0 ? (
        <div className="journey-timeline" style={{ position: 'relative' }}>
          {stages.map((stage, idx) => {
            const flexBasis = totalMinutes > 0 ? `${(stage.durationMinutes / totalMinutes) * 100}%` : '100px'
            const isActive = idx === activeStageIndex
            const isSelected = idx === selectedIdx
            return (
              <div
                key={stage.id}
                className={`journey-stage-card${isActive ? ' journey-stage-card--active' : ''}${isSelected ? ' journey-stage-card--selected' : ''}`}
                style={{ background: stage.color, flexBasis, flexGrow: 1 }}
                onClick={() => setSelectedIdx(idx === selectedIdx ? null : idx)}
              >
                <span className="journey-stage-label">{stage.label}</span>
                <span className="journey-stage-hz">{stage.beat} Hz</span>
                <span className="journey-stage-dur">{stage.durationMinutes} min</span>
                {!isRunning && (
                  <button
                    className="journey-stage-delete"
                    onClick={(e) => { e.stopPropagation(); deleteStage(idx) }}
                    title="Delete stage"
                  >×</button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="journey-timeline" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '80px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No stages yet — pick a preset below or click <strong>+ New Stage</strong>
        </div>
      )}

      {/* Stage Editor */}
      {selectedStage !== null && selectedIdx !== null && (
        <div className="journey-editor">
          <div className="journey-section-label" style={{ marginBottom: '0.5rem' }}>Edit Stage</div>
          <div className="journey-editor-row">
            <label>Label
              <input
                className="text-input"
                type="text"
                value={selectedStage.label}
                onChange={(e) => updateStage(selectedIdx, { label: e.target.value })}
              />
            </label>
            <label>Duration (min)
              <input
                className="text-input"
                type="number"
                min={1} max={60}
                value={selectedStage.durationMinutes}
                onChange={(e) => updateStage(selectedIdx, { durationMinutes: Math.max(1, Math.min(60, Number(e.target.value))) })}
              />
            </label>
          </div>
          <div className="journey-editor-row">
            <label>Carrier (Hz)
              <input
                className="text-input"
                type="number"
                min={40} max={1200}
                value={selectedStage.carrier}
                onChange={(e) => updateStage(selectedIdx, { carrier: Number(e.target.value) })}
              />
            </label>
            <label>Beat (Hz)
              <input
                className="text-input"
                type="number"
                min={0} max={40} step={0.1}
                value={selectedStage.beat}
                onChange={(e) => updateStage(selectedIdx, { beat: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="journey-editor-row">
            <label>LFO Rate (Hz)
              <input
                className="text-input"
                type="number"
                min={0} max={12} step={0.01}
                value={selectedStage.wobbleRate}
                onChange={(e) => updateStage(selectedIdx, { wobbleRate: Number(e.target.value) })}
              />
            </label>
            <label>Soundscape
              <select
                className="text-input"
                value={selectedStage.soundsceneId}
                onChange={(e) => updateStage(selectedIdx, { soundsceneId: e.target.value })}
              >
                {SOUNDSCAPE_SCENES.map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="soft-button" onClick={() => previewStage(selectedStage)} disabled={!isRunning}>
              🔊 Preview
            </button>
            <button className="soft-button soft-button--danger" onClick={() => deleteStage(selectedIdx)}>
              Delete Stage
            </button>
          </div>
          {!isRunning && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.4rem 0 0' }}>Start a session to preview this stage live.</p>
          )}
        </div>
      )}

      {/* AI Journey Designer */}
      <div className="journey-ai-panel">
        <button
          className="journey-ai-header"
          style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: 0 }}
          onClick={() => setAiOpen(o => !o)}
        >
          <span className="journey-ai-title">✨ AI Journey Designer</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{aiOpen ? '▾' : '▸'}</span>
        </button>
        {aiOpen && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', gap: '0.35rem' }}>
              What do you want to achieve?
              <textarea
                className="journey-ai-textarea"
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
                placeholder={'e.g. "Fall into deep sleep", "Focus for a coding session"'}
                rows={2}
              />
            </label>

            <div className="journey-ai-options">
              <label style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-label)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Duration
                <select
                  className="text-input"
                  value={aiDuration}
                  onChange={(e) => setAiDuration(Number(e.target.value))}
                >
                  {[10, 20, 30, 45, 60].map(m => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </label>
              <label style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-label)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Stages
                <select
                  className="text-input"
                  value={aiStages}
                  onChange={(e) => setAiStages(Number(e.target.value))}
                >
                  {[3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-label)' }}>Style</span>
                <div className="seg-control">
                  {(['gentle', 'balanced', 'deep'] as const).map(s => (
                    <button
                      key={s}
                      className={aiStyle === s ? 'active' : ''}
                      onClick={() => setAiStyle(s)}
                      type="button"
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!apiKey && (
              <p className="journey-ai-no-key">Add your OpenAI API key in Settings to use AI generation</p>
            )}

            {aiLoading ? (
              <div className="journey-ai-loading">
                <span className="ai-step-ellipsis">⋯</span>
                <span>Designing your journey…</span>
              </div>
            ) : (
              <button
                className="journey-ai-generate-btn"
                onClick={handleGenerateJourney}
                disabled={!aiGoal.trim() || !apiKey || aiLoading}
                type="button"
              >
                ✨ Generate Journey
              </button>
            )}

            {aiError && (
              <div className="journey-ai-error">{aiError}</div>
            )}
          </div>
        )}
      </div>

      {/* Presets */}
      <div style={{ marginTop: '0.75rem' }}>
        <button
          className="journey-section-label"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0 }}
          onClick={() => setPresetsOpen(o => !o)}
        >
          {presetsOpen ? '▾' : '▸'} Prebuilt Journeys
        </button>
        {presetsOpen && (
          <div className="journey-presets">
            {BUILT_IN_JOURNEYS.map(j => (
              <button
                key={j.id}
                className="journey-preset-btn"
                onClick={() => { setJourney({ ...j }); setSelectedIdx(null) }}
              >
                {j.name}
              </button>
            ))}
            {journey && (
              <button
                className="journey-preset-btn"
                style={{ background: 'rgba(224,92,92,0.15)', color: 'var(--danger)', border: '1px solid rgba(224,92,92,0.3)' }}
                onClick={() => { setJourney(null); setSelectedIdx(null) }}
              >
                ✕ Clear Journey
              </button>
            )}
          </div>
        )}
      </div>

      {journey && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.6rem', background: 'var(--accent-light)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
          ✅ <strong>{journey.name}</strong> loaded — will run automatically when you start a session.
        </p>
      )}
    </div>
  )
}
