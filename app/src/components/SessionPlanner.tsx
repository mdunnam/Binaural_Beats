import { useState, useEffect } from 'react'
import type { SessionPlan } from '../types'

const SESSION_PLAN_STORAGE_KEY = 'liminal-session-plans'

type MusicTrackInfo = { id: string; title: string; artist: string; duration: number }
type SoundscapeScene = { id: string; label: string }
type BrainwavePreset = { label: string; beat: number; carrier: number }

type SessionPlannerProps = {
  carrier: number
  beat: number
  noiseType: string
  noiseVolume: number
  soundsceneId: string
  padEnabled: boolean
  padVolume: number
  musicTrackId: string | null
  musicVolume: number
  musicTracks: MusicTrackInfo[]
  soundscapeScenes: SoundscapeScene[]
  brainwavePresets: BrainwavePreset[]
  isRunning: boolean
  onPreview: (plan: SessionPlan) => void
  onStop: () => void
  onLiveUpdate: (plan: SessionPlan) => void
  onSave: (plan: SessionPlan) => void
}

const BUILT_IN_TEMPLATES: SessionPlan[] = [
  {
    name: 'Deep Sleep',
    totalMinutes: 60,
    crossfadeSec: 10,
    fadeInSec: 10,
    fadeOutSec: 20,
    music: { enabled: true, trackIds: ['chill-piano'], volume: 0.5 },
    soundscape: { enabled: true, sceneId: 'ocean', volume: 0.6 },
    binaural: { enabled: true, carrier: 174, beatStart: 2, beatEnd: 1, volume: 0.15 },
    noise: { enabled: true, type: 'brown', volume: 0.2 },
    pad: { enabled: true, volume: 0.15 },
  },
  {
    name: 'Focus Sprint',
    totalMinutes: 25,
    crossfadeSec: 5,
    fadeInSec: 4,
    fadeOutSec: 6,
    music: { enabled: false, trackIds: [], volume: 0.5 },
    soundscape: { enabled: true, sceneId: 'forest', volume: 0.5 },
    binaural: { enabled: true, carrier: 528, beatStart: 18, beatEnd: 18, volume: 0.15 },
    noise: { enabled: true, type: 'white', volume: 0.12 },
    pad: { enabled: false, volume: 0.15 },
  },
  {
    name: 'Deep Meditation',
    totalMinutes: 40,
    crossfadeSec: 8,
    fadeInSec: 8,
    fadeOutSec: 15,
    music: { enabled: true, trackIds: ['wandering'], volume: 0.45 },
    soundscape: { enabled: true, sceneId: 'cave', volume: 0.55 },
    binaural: { enabled: true, carrier: 432, beatStart: 6, beatEnd: 3, volume: 0.15 },
    noise: { enabled: false, type: 'pink', volume: 0.14 },
    pad: { enabled: true, volume: 0.15 },
  },
]

function loadSavedPlans(): SessionPlan[] {
  try {
    const raw = localStorage.getItem(SESSION_PLAN_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SessionPlan[]
  } catch {
    return []
  }
}

function savePlansToStorage(plans: SessionPlan[]): void {
  localStorage.setItem(SESSION_PLAN_STORAGE_KEY, JSON.stringify(plans))
}

function layerIcons(plan: SessionPlan): string {
  const icons: string[] = []
  if (plan.music.enabled) icons.push('🎵')
  if (plan.soundscape.enabled) icons.push('🌊')
  if (plan.binaural.enabled) icons.push('🧠')
  if (plan.noise.enabled) icons.push('📢')
  if (plan.pad.enabled) icons.push('🎹')
  return icons.join(' ')
}

export function SessionPlanner({
  carrier,
  beat,
  noiseType,
  noiseVolume,
  soundsceneId,
  padEnabled,
  padVolume,
  musicTrackId,
  musicVolume,
  musicTracks,
  soundscapeScenes,
  brainwavePresets,
  isRunning,
  onPreview,
  onStop,
  onLiveUpdate,
  onSave,
}: SessionPlannerProps) {
  const [name, setName] = useState('My Session')
  const [totalMinutes, setTotalMinutes] = useState(30)
  const [crossfadeSec, setCrossfadeSec] = useState(10)
  const [fadeInSec, setFadeInSec] = useState(5)
  const [fadeOutSec, setFadeOutSec] = useState(10)

  // Music
  const [musicEnabled, setMusicEnabled] = useState(musicTrackId !== null)
  const [musicTrack, setMusicTrack] = useState(musicTrackId ?? (musicTracks[0]?.id ?? ''))
  const [musicVol, setMusicVol] = useState(musicVolume)

  // Soundscape
  const [soundscapeEnabled, setSoundscapeEnabled] = useState(soundsceneId !== 'off')
  const [sceneId, setSceneId] = useState(soundsceneId !== 'off' ? soundsceneId : (soundscapeScenes[1]?.id ?? 'ocean'))
  const [soundscapeVol, setSoundscapeVol] = useState(0.6)

  // Binaural
  const [binauralEnabled, setBinauralEnabled] = useState(true)
  const [binCarrier, setBinCarrier] = useState(carrier)
  const [beatStartIdx, setBeatStartIdx] = useState(() => {
    const idx = brainwavePresets.findIndex(p => p.beat === beat)
    return idx >= 0 ? idx : 0
  })
  const [beatEndIdx, setBeatEndIdx] = useState(() => {
    const idx = brainwavePresets.findIndex(p => p.beat === beat)
    return idx >= 0 ? idx : 0
  })
  const [binVol, setBinVol] = useState(0.15)

  // Noise
  const [noiseEnabled, setNoiseEnabled] = useState(noiseType !== 'none')
  const [selectedNoise, setSelectedNoise] = useState(noiseType !== 'none' ? noiseType : 'pink')
  const [noiseVol, setNoiseVol] = useState(noiseVolume)

  // Pad
  const [padEnabledLocal, setPadEnabledLocal] = useState(padEnabled)
  const [padVol, setPadVol] = useState(padVolume)

  const [savedPlans, setSavedPlans] = useState<SessionPlan[]>([])

  useEffect(() => {
    setSavedPlans(loadSavedPlans())
  }, [])

  const buildPlan = (): SessionPlan => ({
    name: name.trim() || 'My Session',
    totalMinutes,
    crossfadeSec,
    fadeInSec,
    fadeOutSec,
    music: { enabled: musicEnabled, trackIds: musicTrack ? [musicTrack] : [], volume: musicVol },
    soundscape: { enabled: soundscapeEnabled, sceneId, volume: soundscapeVol },
    binaural: {
      enabled: binauralEnabled,
      carrier: binCarrier,
      beatStart: brainwavePresets[beatStartIdx]?.beat ?? beat,
      beatEnd: brainwavePresets[beatEndIdx]?.beat ?? beat,
      volume: binVol,
    },
    noise: { enabled: noiseEnabled, type: selectedNoise, volume: noiseVol },
    pad: { enabled: padEnabledLocal, volume: padVol },
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const plan = buildPlan()
    const existing = loadSavedPlans()
    const idx = existing.findIndex(p => p.name === plan.name)
    const updated = [...existing]
    if (idx >= 0) updated[idx] = plan; else updated.push(plan)
    savePlansToStorage(updated)
    setSavedPlans(updated)
    onSave(plan)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  const handlePlay = () => {
    onPreview(buildPlan())
  }

  // Debounced live-update while session is running
  useEffect(() => {
    if (!isRunning) return
    const id = window.setTimeout(() => onLiveUpdate(buildPlan()), 200)
    return () => window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, musicEnabled, musicTrack, musicVol, soundscapeEnabled, sceneId, soundscapeVol,
      binauralEnabled, binCarrier, beatStartIdx, beatEndIdx, binVol,
      noiseEnabled, selectedNoise, noiseVol, padEnabledLocal, padVol])

  const loadPlan = (plan: SessionPlan) => {
    setName(plan.name)
    setTotalMinutes(plan.totalMinutes)
    setCrossfadeSec(plan.crossfadeSec)
    setFadeInSec(plan.fadeInSec)
    setFadeOutSec(plan.fadeOutSec)
    setMusicEnabled(plan.music.enabled)
    if (plan.music.trackIds[0]) setMusicTrack(plan.music.trackIds[0])
    setMusicVol(plan.music.volume)
    setSoundscapeEnabled(plan.soundscape.enabled)
    setSceneId(plan.soundscape.sceneId)
    setSoundscapeVol(plan.soundscape.volume)
    setBinauralEnabled(plan.binaural.enabled)
    setBinCarrier(plan.binaural.carrier)
    const si = brainwavePresets.findIndex(p => p.beat === plan.binaural.beatStart)
    if (si >= 0) setBeatStartIdx(si)
    const ei = brainwavePresets.findIndex(p => p.beat === plan.binaural.beatEnd)
    if (ei >= 0) setBeatEndIdx(ei)
    setBinVol(plan.binaural.volume)
    setNoiseEnabled(plan.noise.enabled)
    setSelectedNoise(plan.noise.type)
    setNoiseVol(plan.noise.volume)
    setPadEnabledLocal(plan.pad.enabled)
    setPadVol(plan.pad.volume)
  }

  const deletePlan = (planName: string) => {
    const updated = savedPlans.filter(p => p.name !== planName)
    setSavedPlans(updated)
    savePlansToStorage(updated)
  }

  const noiseTypes = ['white', 'pink', 'brown', 'blue', 'violet']

  return (
    <div className="session-planner">
      {isRunning && (
        <div className="sp-live-badge">
          <span className="sp-live-dot" />
          Live
        </div>
      )}
      {/* Section 1: Session Info */}
      <div className="sp-section">
        <div className="sp-section-title">📋 Session Info</div>
        <div className="sp-row">
          <label>Session Name</label>
          <input
            className="text-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Session"
          />
        </div>
        <div className="sp-row">
          <label>Duration ({totalMinutes} min)</label>
          <input type="range" min={5} max={180} step={5} value={totalMinutes}
            onChange={e => setTotalMinutes(Number(e.target.value))} />
        </div>
        <div className="sp-row">
          <label>Crossfade ({crossfadeSec} sec)</label>
          <input type="range" min={0} max={60} step={1} value={crossfadeSec}
            onChange={e => setCrossfadeSec(Number(e.target.value))} />
        </div>
        <div className="sp-row-pair">
          <div className="sp-row">
            <label>Fade In ({fadeInSec} sec)</label>
            <input type="range" min={0} max={60} step={1} value={fadeInSec}
              onChange={e => setFadeInSec(Number(e.target.value))} />
          </div>
          <div className="sp-row">
            <label>Fade Out ({fadeOutSec} sec)</label>
            <input type="range" min={0} max={60} step={1} value={fadeOutSec}
              onChange={e => setFadeOutSec(Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Section 2: Layers */}
      <div className="sp-section">
        <div className="sp-section-title">🎚 Layers</div>

        {/* Music Layer */}
        <div className="sp-layer">
          <div className="sp-layer-header">
            <label className="sp-toggle-label">
              <input type="checkbox" checked={musicEnabled} onChange={e => setMusicEnabled(e.target.checked)} />
              🎵 Music
            </label>
          </div>
          {musicEnabled && (
            <div className="sp-layer-body">
              <div className="sp-row">
                <label>Track</label>
                <select className="text-input" value={musicTrack} onChange={e => setMusicTrack(e.target.value)}>
                  {musicTracks.length === 0
                    ? <option value="">No tracks available</option>
                    : musicTracks.map(t => (
                      <option key={t.id} value={t.id}>{t.title} — {t.artist}</option>
                    ))
                  }
                </select>
              </div>
              <div className="sp-row">
                <label>Volume ({Math.round(musicVol * 100)}%)</label>
                <input type="range" min={0} max={1} step={0.01} value={musicVol}
                  onChange={e => setMusicVol(Number(e.target.value))} />
              </div>
            </div>
          )}
        </div>

        {/* Soundscape Layer */}
        <div className="sp-layer">
          <div className="sp-layer-header">
            <label className="sp-toggle-label">
              <input type="checkbox" checked={soundscapeEnabled} onChange={e => setSoundscapeEnabled(e.target.checked)} />
              🌊 Soundscape
            </label>
          </div>
          {soundscapeEnabled && (
            <div className="sp-layer-body">
              <div className="sp-row">
                <label>Scene</label>
                <select className="text-input" value={sceneId} onChange={e => setSceneId(e.target.value)}>
                  {soundscapeScenes.filter(s => s.id !== 'off').map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="sp-row">
                <label>Volume ({Math.round(soundscapeVol * 100)}%)</label>
                <input type="range" min={0} max={1} step={0.01} value={soundscapeVol}
                  onChange={e => setSoundscapeVol(Number(e.target.value))} />
              </div>
            </div>
          )}
        </div>

        {/* Binaural Layer */}
        <div className="sp-layer">
          <div className="sp-layer-header">
            <label className="sp-toggle-label">
              <input type="checkbox" checked={binauralEnabled} onChange={e => setBinauralEnabled(e.target.checked)} />
              🧠 Binaural
            </label>
          </div>
          {binauralEnabled && (
            <div className="sp-layer-body">
              <div className="sp-row">
                <label>Carrier (Hz)</label>
                <input type="number" className="text-input text-input--number" min={40} max={1200}
                  value={binCarrier} onChange={e => setBinCarrier(Number(e.target.value))} />
              </div>
              <div className="sp-row">
                <label>Beat Start</label>
                <select className="text-input" value={beatStartIdx}
                  onChange={e => setBeatStartIdx(Number(e.target.value))}>
                  {brainwavePresets.map((p, i) => (
                    <option key={i} value={i}>{p.label} ({p.beat} Hz)</option>
                  ))}
                </select>
              </div>
              <div className="sp-row">
                <label>Beat End</label>
                <select className="text-input" value={beatEndIdx}
                  onChange={e => setBeatEndIdx(Number(e.target.value))}>
                  {brainwavePresets.map((p, i) => (
                    <option key={i} value={i}>{p.label} ({p.beat} Hz)</option>
                  ))}
                </select>
              </div>
              {beatStartIdx !== beatEndIdx && (
                <p className="sp-hint">If Beat End differs from Start, frequency will ramp over the session</p>
              )}
              <div className="sp-row">
                <label>Volume ({Math.round(binVol * 100)}%)</label>
                <input type="range" min={0} max={1} step={0.01} value={binVol}
                  onChange={e => setBinVol(Number(e.target.value))} />
              </div>
            </div>
          )}
        </div>

        {/* Noise Layer */}
        <div className="sp-layer">
          <div className="sp-layer-header">
            <label className="sp-toggle-label">
              <input type="checkbox" checked={noiseEnabled} onChange={e => setNoiseEnabled(e.target.checked)} />
              📢 Noise
            </label>
          </div>
          {noiseEnabled && (
            <div className="sp-layer-body">
              <div className="sp-row">
                <label>Type</label>
                <div className="seg-control">
                  {noiseTypes.map(t => (
                    <button key={t} type="button"
                      className={selectedNoise === t ? 'active' : ''}
                      onClick={() => setSelectedNoise(t)}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sp-row">
                <label>Volume ({Math.round(noiseVol * 100)}%)</label>
                <input type="range" min={0} max={1} step={0.01} value={noiseVol}
                  onChange={e => setNoiseVol(Number(e.target.value))} />
              </div>
            </div>
          )}
        </div>

        {/* Pad Layer */}
        <div className="sp-layer">
          <div className="sp-layer-header">
            <label className="sp-toggle-label">
              <input type="checkbox" checked={padEnabledLocal} onChange={e => setPadEnabledLocal(e.target.checked)} />
              🎹 Pad Synth
            </label>
          </div>
          {padEnabledLocal && (
            <div className="sp-layer-body">
              <div className="sp-row">
                <label>Volume ({Math.round(padVol * 100)}%)</label>
                <input type="range" min={0} max={1} step={0.01} value={padVol}
                  onChange={e => setPadVol(Number(e.target.value))} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Action Buttons */}
      <div className="sp-actions">
        <button className="soft-button" onClick={handleSave}>
          {saved ? '✓ Saved!' : '💾 Create Preset'}
        </button>
        {isRunning ? (
          <>
            <button className="soft-button" onClick={onStop}>■ Stop</button>
            <button className="soft-button start-button" onClick={() => onLiveUpdate(buildPlan())}>↻ Apply</button>
          </>
        ) : (
          <button className="soft-button start-button" onClick={handlePlay}>▶ Preview</button>
        )}
      </div>

      {/* Section 4: Saved Presets */}
      <div className="sp-section">
        <div className="sp-section-title">📦 Session Presets</div>

        {/* Built-in Templates */}
        <div className="sp-preset-group-label">Built-in Templates</div>
        <div className="sp-presets-list">
          {BUILT_IN_TEMPLATES.map(template => (
            <div key={template.name} className="sp-preset-card sp-preset-card--template">
              <div className="sp-preset-name">{template.name}</div>
              <div className="sp-preset-meta">{template.totalMinutes} min · {layerIcons(template)}</div>
              <button className="soft-button sp-preset-load" onClick={() => loadPlan(template)}>Load</button>
            </div>
          ))}
        </div>

        {/* User Saved Plans */}
        {savedPlans.length > 0 && (<>
          <div className="sp-preset-group-label" style={{ marginTop: '1rem' }}>Saved Presets</div>
          <div className="sp-presets-list">
            {savedPlans.map(plan => (
              <div key={plan.name} className="sp-preset-card">
                <div className="sp-preset-name">{plan.name}</div>
                <div className="sp-preset-meta">{plan.totalMinutes} min · {layerIcons(plan)}</div>
                <div className="sp-preset-actions">
                  <button className="soft-button sp-preset-load" onClick={() => loadPlan(plan)}>Load</button>
                  <button className="soft-button soft-button--danger sp-preset-del" onClick={() => deletePlan(plan.name)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </div>
  )
}
