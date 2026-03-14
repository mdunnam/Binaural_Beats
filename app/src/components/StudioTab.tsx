import { useEffect, useRef, useState, useCallback } from 'react'
import type { StudioLayer, StudioLayerType, StudioScene } from '../types'
import { SOUNDSCAPE_SCENES, SOUND_LAYERS } from '../engine/soundscapeMixer'
import { LaneEditor } from './AutomationEditor'

const STUDIO_SCENES_KEY = 'liminal-studio-scenes'
const STUDIO_JOURNEYS_KEY = 'liminal-studio-journeys'

type SavedJourney = {
  id: string
  name: string
  scenes: StudioScene[]
  savedAt: number
}

const LAYER_ICONS: Record<StudioLayerType, string> = {
  carrier: '〜',
  beat: '🔁',
  soundscape: '🌿',
  noise: '🌫',
  pad: '🎹',
  music: '🎵',
}

const SOLFEGGIO_HZ = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963]
const BRAINWAVE_PRESETS = [
  { label: 'Delta', hz: 2 },
  { label: 'Theta', hz: 6 },
  { label: 'Alpha', hz: 10 },
  { label: 'Beta', hz: 18 },
  { label: 'Gamma', hz: 40 },
]
const NOISE_TYPES = ['white', 'pink', 'brown', 'blue', 'violet']

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function defaultLayer(type: StudioLayerType, firstTrackId: string): StudioLayer {
  const base = { id: uid(), type, enabled: true, volume: 0.15 }
  switch (type) {
    case 'carrier':    return { ...base, label: 'Carrier',    settings: { hz: 432 } }
    case 'beat':       return { ...base, label: 'Beat',       settings: { hz: 6, wobbleRate: 0.4 } }
    case 'soundscape': return { ...base, label: 'Soundscape', settings: { sceneId: 'forest', layerGains: {} } }
    case 'noise':      return { ...base, label: 'Noise',      settings: { type: 'pink' } }
    case 'pad':        return { ...base, label: 'Pad',        settings: { waveform: 'sine', reverbMix: 0.5, breatheRate: 0.1 } }
    case 'music':      return { ...base, label: 'Music',      settings: { trackId: firstTrackId, shuffle: false } }
  }
}

/** Build a descriptive sub-label for a layer header */
function layerSubLabel(layer: StudioLayer, musicTracks: MusicTrack[]): string {
  switch (layer.type) {
    case 'carrier': {
      const hz = (layer.settings.hz as number) ?? 432
      return `${hz % 1 === 0 ? hz : hz.toFixed(1)} Hz`
    }
    case 'beat': {
      const hz = (layer.settings.hz as number) ?? 6
      return `${hz % 1 === 0 ? hz : hz.toFixed(2)} Hz`
    }
    case 'soundscape': {
      const sceneId = (layer.settings.sceneId as string) ?? 'forest'
      const scene = SOUNDSCAPE_SCENES.find(s => s.id === sceneId)
      return scene ? scene.label : sceneId
    }
    case 'noise': {
      const t = (layer.settings.type as string) ?? 'pink'
      return t.charAt(0).toUpperCase() + t.slice(1)
    }
    case 'pad': {
      const w = (layer.settings.waveform as string) ?? 'sine'
      return w.charAt(0).toUpperCase() + w.slice(1)
    }
    case 'music': {
      const trackId = layer.settings.trackId as string
      const track = musicTracks.find(t => t.id === trackId)
      return track ? track.title : 'No track'
    }
  }
}

// ── Quick-start presets ──
type Preset = { emoji: string; label: string; layers: Omit<StudioLayer, 'id'>[] }

const QUICK_PRESETS: Preset[] = [
  {
    emoji: '🧠', label: 'Focus',
    layers: [
      { type: 'carrier', enabled: true, volume: 0.15, label: 'Carrier', settings: { hz: 432 } },
      { type: 'beat',    enabled: true, volume: 0.15, label: 'Beat',    settings: { hz: 14, wobbleRate: 0.4 } },
      { type: 'noise',   enabled: true, volume: 0.08, label: 'Noise',   settings: { type: 'pink' } },
    ],
  },
  {
    emoji: '😴', label: 'Sleep',
    layers: [
      { type: 'carrier',    enabled: true, volume: 0.15, label: 'Carrier',    settings: { hz: 174 } },
      { type: 'beat',       enabled: true, volume: 0.15, label: 'Beat',       settings: { hz: 2, wobbleRate: 0.2 } },
      { type: 'soundscape', enabled: true, volume: 0.18, label: 'Soundscape', settings: { sceneId: 'rain', layerGains: {} } },
    ],
  },
  {
    emoji: '🧘', label: 'Relax',
    layers: [
      { type: 'carrier',    enabled: true, volume: 0.15, label: 'Carrier',    settings: { hz: 528 } },
      { type: 'beat',       enabled: true, volume: 0.15, label: 'Beat',       settings: { hz: 6, wobbleRate: 0.3 } },
      { type: 'soundscape', enabled: true, volume: 0.18, label: 'Soundscape', settings: { sceneId: 'forest', layerGains: {} } },
      { type: 'pad',        enabled: true, volume: 0.10, label: 'Pad',        settings: { waveform: 'sine', reverbMix: 0.6, breatheRate: 0.1 } },
    ],
  },
  {
    emoji: '⚡', label: 'Energy',
    layers: [
      { type: 'carrier', enabled: true, volume: 0.15, label: 'Carrier', settings: { hz: 528 } },
      { type: 'beat',    enabled: true, volume: 0.15, label: 'Beat',    settings: { hz: 40, wobbleRate: 0.5 } },
      { type: 'noise',   enabled: true, volume: 0.08, label: 'Noise',   settings: { type: 'white' } },
    ],
  },
]

type MusicTrack = { id: string; title: string; artist: string; duration: number }

type StudioTabProps = {
  isRunning: boolean
  onPreview: (layers: StudioLayer[]) => void
  onStop: () => void
  onLiveUpdate: (layers: StudioLayer[]) => void
  musicTracks: MusicTrack[]
}

export function StudioTab({ isRunning, onPreview, onStop, onLiveUpdate, musicTracks }: StudioTabProps) {
  const [layers, setLayers] = useState<StudioLayer[]>([
    { id: '1', type: 'carrier', enabled: true, volume: 0.15, label: 'Carrier', settings: { hz: 432 } },
    { id: '2', type: 'beat',    enabled: true, volume: 0.15, label: 'Beat',    settings: { hz: 6, wobbleRate: 0.4 } },
  ])
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null)
  const [expandedAdvancedId, setExpandedAdvancedId] = useState<string | null>(null)
  const [sceneName, setSceneName] = useState('My Scene')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [crossfadeSec, setCrossfadeSec] = useState(10)
  const [savedScenes, setSavedScenes] = useState<StudioScene[]>([])
  const [journeyScenes, setJourneyScenes] = useState<StudioScene[]>([])
  const [journeyName, setJourneyName] = useState('My Journey')
  const [savedJourneys, setSavedJourneys] = useState<SavedJourney[]>([])
  const [journeySavedFlag, setJourneySavedFlag] = useState(false)
  const [savedFlag, setSavedFlag] = useState(false)

  // Journey playback state
  const [activeJourneyIdx, setActiveJourneyIdx] = useState<number | null>(null)
  const [journeyCountdown, setJourneyCountdown] = useState<number | null>(null)
  const journeyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const journeyCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // keep a ref to current journeyScenes so timeout callbacks have fresh data
  const journeyScenesRef = useRef<StudioScene[]>(journeyScenes)
  useEffect(() => { journeyScenesRef.current = journeyScenes }, [journeyScenes])

  // Drag-to-reorder state
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
    dragIndexRef.current = idx
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    const from = dragIndexRef.current
    if (from === null || from === dropIdx) { setDragOverIdx(null); return }
    setJourneyScenes(js => {
      const next = [...js]
      const [moved] = next.splice(from, 1)
      next.splice(dropIdx, 0, moved)
      return next
    })
    dragIndexRef.current = null
    setDragOverIdx(null)
  }, [setJourneyScenes])

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null
    setDragOverIdx(null)
  }, [])

  // Load scenes from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STUDIO_SCENES_KEY)
      if (raw) setSavedScenes(JSON.parse(raw) as StudioScene[])
      const rawJ = localStorage.getItem(STUDIO_JOURNEYS_KEY)
      if (rawJ) setSavedJourneys(JSON.parse(rawJ) as SavedJourney[])
    } catch { /* ignore */ }
  }, [])

  // Live-update debounced
  useEffect(() => {
    if (!isRunning) return
    const id = window.setTimeout(() => onLiveUpdate(layers), 200)
    return () => window.clearTimeout(id)
  }, [isRunning, layers]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop journey timers when audio stops externally
  useEffect(() => {
    if (!isRunning && activeJourneyIdx !== null) {
      clearJourneyTimers()
      setActiveJourneyIdx(null)
      setJourneyCountdown(null)
    }
  }, [isRunning]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => clearJourneyTimers(), [])

  function clearJourneyTimers() {
    if (journeyTimerRef.current) { clearTimeout(journeyTimerRef.current); journeyTimerRef.current = null }
    if (journeyCountdownRef.current) { clearInterval(journeyCountdownRef.current); journeyCountdownRef.current = null }
  }

  function scheduleNextScene(idx: number) {
    const scenes = journeyScenesRef.current
    if (idx >= scenes.length) {
      // Journey complete
      setActiveJourneyIdx(null)
      setJourneyCountdown(null)
      clearJourneyTimers()
      return
    }
    const scene = scenes[idx]
    const durationMs = scene.durationMinutes * 60 * 1000
    let remaining = scene.durationMinutes * 60

    // Countdown ticker
    clearJourneyTimers()
    setJourneyCountdown(remaining)
    journeyCountdownRef.current = setInterval(() => {
      remaining -= 1
      setJourneyCountdown(remaining)
    }, 1000)

    journeyTimerRef.current = setTimeout(() => {
      if (journeyCountdownRef.current) { clearInterval(journeyCountdownRef.current); journeyCountdownRef.current = null }
      const nextIdx = idx + 1
      const nextScenes = journeyScenesRef.current
      if (nextIdx < nextScenes.length) {
        setActiveJourneyIdx(nextIdx)
        onLiveUpdate(nextScenes[nextIdx].layers)
        scheduleNextScene(nextIdx)
      } else {
        setActiveJourneyIdx(null)
        setJourneyCountdown(null)
        clearJourneyTimers()
      }
    }, durationMs)
  }

  // ── Layer helpers ──
  function updateLayer(id: string, patch: Partial<StudioLayer>) {
    setLayers(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))
  }
  function updateSettings(id: string, patch: Record<string, unknown>) {
    setLayers(ls => ls.map(l => l.id === id ? { ...l, settings: { ...l.settings, ...patch } } : l))
  }
  function updateLayerAutomation(id: string, patch: Partial<NonNullable<StudioLayer['automation']>>) {
    setLayers(ls => ls.map(l => l.id === id ? { ...l, automation: { ...l.automation, ...patch } } : l))
  }
  function deleteLayer(id: string) {
    setLayers(ls => ls.filter(l => l.id !== id))
  }
  function addLayer(type: StudioLayerType) {
    const firstTrackId = musicTracks[0]?.id ?? ''
    setLayers(ls => [...ls, defaultLayer(type, firstTrackId)])
  }
  function applyPreset(preset: Preset) {
    setLayers(preset.layers.map(l => ({ ...l, id: uid() })))
  }

  // ── Scene helpers ──
  function saveScene() {
    const scene: StudioScene = {
      id: uid(),
      name: sceneName.trim() || 'Scene',
      durationMinutes,
      crossfadeSec,
      layers: JSON.parse(JSON.stringify(layers)) as StudioLayer[],
    }
    const next = [...savedScenes, scene]
    setSavedScenes(next)
    localStorage.setItem(STUDIO_SCENES_KEY, JSON.stringify(next))
    setSavedFlag(true)
    setTimeout(() => setSavedFlag(false), 1500)
  }

  function loadScene(scene: StudioScene) {
    setLayers(JSON.parse(JSON.stringify(scene.layers)) as StudioLayer[])
    setSceneName(scene.name)
    setDurationMinutes(scene.durationMinutes)
    setCrossfadeSec(scene.crossfadeSec)
  }

  // ── Journey helpers ──
  function addToJourney(scene: StudioScene) {
    setJourneyScenes(js => [...js, { ...scene, id: uid() }])
  }
  function removeJourneyScene(idx: number) {
    setJourneyScenes(js => js.filter((_, i) => i !== idx))
  }
  function updateJourneyCrossfade(idx: number, val: number) {
    setJourneyScenes(js => js.map((s, i) => i === idx ? { ...s, crossfadeSec: val } : s))
  }
  function playJourney() {
    if (journeyScenes.length === 0) return
    clearJourneyTimers()
    const first = journeyScenes[0]
    setActiveJourneyIdx(0)
    onPreview(first.layers)
    scheduleNextScene(0)
  }
  function stopJourney() {
    clearJourneyTimers()
    setActiveJourneyIdx(null)
    setJourneyCountdown(null)
    onStop()
  }
  function saveJourney() {
    if (journeyScenes.length === 0) return
    const entry: SavedJourney = {
      id: uid(),
      name: journeyName.trim() || 'Journey',
      scenes: JSON.parse(JSON.stringify(journeyScenes)) as StudioScene[],
      savedAt: Date.now(),
    }
    const next = [...savedJourneys, entry]
    setSavedJourneys(next)
    localStorage.setItem(STUDIO_JOURNEYS_KEY, JSON.stringify(next))
    setJourneySavedFlag(true)
    setTimeout(() => setJourneySavedFlag(false), 1500)
  }
  function loadJourney(j: SavedJourney) {
    setJourneyScenes(JSON.parse(JSON.stringify(j.scenes)) as StudioScene[])
    setJourneyName(j.name)
  }
  function deleteJourney(id: string) {
    const next = savedJourneys.filter(j => j.id !== id)
    setSavedJourneys(next)
    localStorage.setItem(STUDIO_JOURNEYS_KEY, JSON.stringify(next))
  }

  function formatCountdown(secs: number): string {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const journeyPlaying = activeJourneyIdx !== null

  return (
    <div className="studio-tab">
      {/* Header */}
      <div className="studio-layer-header" style={{ cursor: 'default', background: 'none', padding: 0 }}>
        <span style={{ flex: 1, fontSize: '1.1rem', fontWeight: 700 }}>Session Builder</span>
        {isRunning && (
          <span className="sp-live-badge">
            <span className="sp-live-dot" />
            Live
          </span>
        )}
        {isRunning
          ? <button className="soft-button" style={{ padding: '0.3rem 0.9rem', fontSize: '0.83rem' }} onClick={journeyPlaying ? stopJourney : onStop}>■ Stop</button>
          : <button className="soft-button" style={{ padding: '0.3rem 0.9rem', fontSize: '0.83rem' }} onClick={() => onPreview(layers)}>▶ Preview</button>
        }
      </div>

      <div className="tab-sections">

      <div className="section-block">
        <div className="section-title">Quick Start</div>
        <div className="section-card" style={{ padding: '0.5rem' }}>
          <div className="studio-presets-row">
            {QUICK_PRESETS.map(preset => (
              <button key={preset.label} className="studio-preset-btn" onClick={() => applyPreset(preset)}>
                {preset.emoji} {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section-block">
        <div className="section-title">Layers</div>
        <div className="section-card" style={{ padding: '0.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {layers.map(layer => (
          <div key={layer.id} className={`studio-layer-card${!layer.enabled ? ' studio-layer-card--disabled' : ''}`}>
            <div className="studio-layer-header" onClick={() => setExpandedLayerId(id => id === layer.id ? null : layer.id)}>
              <span className="studio-layer-drag">⠿</span>
              <span className="studio-layer-icon">{LAYER_ICONS[layer.type]}</span>
              <span className="studio-layer-label">
                {layer.label}
                <span className="studio-layer-sublabel"> · {layerSubLabel(layer, musicTracks)}</span>
              </span>
              <div className="studio-layer-vol-wrap" onClick={e => e.stopPropagation()}>
                <input
                  className="studio-layer-vol"
                  type="range" min={0} max={1} step={0.01}
                  value={layer.volume}
                  onChange={e => updateLayer(layer.id, { volume: Number(e.target.value) })}
                />
              </div>
              <input
                className="studio-layer-toggle"
                type="checkbox"
                checked={layer.enabled}
                onClick={e => e.stopPropagation()}
                onChange={e => updateLayer(layer.id, { enabled: e.target.checked })}
              />
              <button className="studio-layer-delete" onClick={e => { e.stopPropagation(); deleteLayer(layer.id) }}>✕</button>
              <button className="studio-layer-expand">{expandedLayerId === layer.id ? '▲' : '▼'}</button>
            </div>

            {expandedLayerId === layer.id && (
              <div className="studio-layer-settings">
                {layer.type === 'carrier' && (
                  <>
                    <label>
                      Carrier Hz ({((layer.settings.hz as number) ?? 432).toFixed(1)})
                      <input type="range" min={40} max={1200} step={0.1}
                        value={(layer.settings.hz as number) ?? 432}
                        onChange={e => updateSettings(layer.id, { hz: Number(e.target.value) })}
                      />
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {SOLFEGGIO_HZ.map(hz => (
                        <button key={hz} className="studio-add-btn"
                          onClick={() => updateSettings(layer.id, { hz })}>
                          {hz}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {layer.type === 'beat' && (
                  <>
                    <label>
                      Beat Hz ({((layer.settings.hz as number) ?? 6).toFixed(2)})
                      <input type="range" min={0} max={40} step={0.01}
                        value={(layer.settings.hz as number) ?? 6}
                        onChange={e => updateSettings(layer.id, { hz: Number(e.target.value) })}
                      />
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {BRAINWAVE_PRESETS.map(b => (
                        <button key={b.label} className="studio-add-btn"
                          onClick={() => updateSettings(layer.id, { hz: b.hz })}>
                          {b.label} {b.hz}Hz
                        </button>
                      ))}
                    </div>
                    <label>
                      Wobble Rate ({((layer.settings.wobbleRate as number) ?? 0.4).toFixed(2)} Hz)
                      <input type="range" min={0} max={4} step={0.01}
                        value={(layer.settings.wobbleRate as number) ?? 0.4}
                        onChange={e => updateSettings(layer.id, { wobbleRate: Number(e.target.value) })}
                      />
                    </label>
                  </>
                )}
                {layer.type === 'soundscape' && (
                  <>
                    <label>
                      Scene
                      <select value={(layer.settings.sceneId as string) ?? 'forest'}
                        onChange={e => {
                          const sceneId = e.target.value
                          const scene = SOUNDSCAPE_SCENES.find(s => s.id === sceneId)
                          const gains: Record<string, number> = {}
                          if (scene) {
                            Object.entries(scene.gains).forEach(([id, v]) => { gains[id] = v as number })
                          }
                          updateSettings(layer.id, { sceneId, layerGains: gains })
                        }}>
                        {SOUNDSCAPE_SCENES.filter(s => s.id !== 'custom').map(s => (
                          <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
                        ))}
                      </select>
                    </label>
                    {SOUND_LAYERS.map(sl => {
                      const gains = (layer.settings.layerGains as Record<string, number>) ?? {}
                      const val = gains[sl.id] ?? 0
                      return (
                        <label key={sl.id}>
                          {sl.emoji} {sl.label} ({val.toFixed(2)})
                          <input type="range" min={0} max={1} step={0.01}
                            value={val}
                            onChange={e => {
                              const prev = (layer.settings.layerGains as Record<string, number>) ?? {}
                              updateSettings(layer.id, { layerGains: { ...prev, [sl.id]: Number(e.target.value) }, sceneId: 'custom' })
                            }}
                          />
                        </label>
                      )
                    })}
                  </>
                )}
                {layer.type === 'noise' && (
                  <label>
                    Noise Type
                    <div className="seg-control">
                      {NOISE_TYPES.map(t => (
                        <button key={t} type="button"
                          className={(layer.settings.type as string) === t ? 'active' : ''}
                          onClick={() => updateSettings(layer.id, { type: t })}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </label>
                )}
                {layer.type === 'pad' && (
                  <>
                    <label>
                      Waveform
                      <div className="seg-control">
                        {(['sine', 'triangle'] as const).map(w => (
                          <button key={w} type="button"
                            className={(layer.settings.waveform as string) === w ? 'active' : ''}
                            onClick={() => updateSettings(layer.id, { waveform: w })}>
                            {w.charAt(0).toUpperCase() + w.slice(1)}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label>
                      Reverb Mix ({((layer.settings.reverbMix as number) ?? 0.5).toFixed(2)})
                      <input type="range" min={0} max={1} step={0.01}
                        value={(layer.settings.reverbMix as number) ?? 0.5}
                        onChange={e => updateSettings(layer.id, { reverbMix: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      Breathe Rate ({((layer.settings.breatheRate as number) ?? 0.1).toFixed(2)} Hz)
                      <input type="range" min={0.05} max={0.5} step={0.01}
                        value={(layer.settings.breatheRate as number) ?? 0.1}
                        onChange={e => updateSettings(layer.id, { breatheRate: Number(e.target.value) })}
                      />
                    </label>
                  </>
                )}
                {layer.type === 'music' && (
                  <>
                    <label>
                      Track
                      <select value={(layer.settings.trackId as string) ?? ''}
                        onChange={e => updateSettings(layer.id, { trackId: e.target.value })}>
                        {musicTracks.map(t => (
                          <option key={t.id} value={t.id}>{t.title} — {t.artist}</option>
                        ))}
                      </select>
                    </label>
                    <label className="toggle-row">
                      <input type="checkbox"
                        checked={(layer.settings.shuffle as boolean) ?? false}
                        onChange={e => updateSettings(layer.id, { shuffle: e.target.checked })}
                      />
                      Shuffle
                    </label>
                  </>
                )}
                {/* Advanced automation lane */}
                <button
                  className="studio-advanced-toggle"
                  onClick={() => setExpandedAdvancedId(id => id === layer.id ? null : layer.id)}
                >
                  Advanced {expandedAdvancedId === layer.id ? '▲' : '▾'}
                </button>
                {expandedAdvancedId === layer.id && (
                  <div className="studio-advanced-panel">
                    {layer.type === 'beat' ? (
                      <>
                        <LaneEditor
                          config={{ key: 'beatFrequency', label: 'Beat Frequency over Session', min: 0, max: 40, unit: ' Hz' }}
                          points={layer.automation?.beatFrequency ?? []}
                          onChange={(pts) => updateLayerAutomation(layer.id, { beatFrequency: pts })}
                          sessionMinutes={durationMinutes}
                        />
                        <LaneEditor
                          config={{ key: 'filterCutoff', label: 'Filter Cutoff over Session', min: 20, max: 20000, unit: ' Hz' }}
                          points={layer.automation?.filterCutoff ?? []}
                          onChange={(pts) => updateLayerAutomation(layer.id, { filterCutoff: pts })}
                          sessionMinutes={durationMinutes}
                        />
                      </>
                    ) : (
                      <>
                        <LaneEditor
                          config={{ key: 'volume', label: 'Volume over Session', min: 0, max: 1, unit: '' }}
                          points={layer.automation?.volume ?? []}
                          onChange={(pts) => updateLayerAutomation(layer.id, { volume: pts })}
                          sessionMinutes={durationMinutes}
                        />
                        <LaneEditor
                          config={{ key: 'filterCutoff', label: 'Filter Cutoff over Session', min: 20, max: 20000, unit: ' Hz' }}
                          points={layer.automation?.filterCutoff ?? []}
                          onChange={(pts) => updateLayerAutomation(layer.id, { filterCutoff: pts })}
                          sessionMinutes={durationMinutes}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Layer row */}
      <div className="studio-add-row">
        {(['carrier', 'beat', 'soundscape', 'noise', 'pad', 'music'] as StudioLayerType[]).map(type => (
          <button key={type} className="studio-add-btn" onClick={() => addLayer(type)}>
            + {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
        </div>
      </div>

      <div className="section-block">
        <div className="section-title">Scenes</div>
        <div className="section-card">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="studio-scene-row">
          <input
            type="text"
            className="text-input"
            value={sceneName}
            onChange={e => setSceneName(e.target.value)}
            placeholder="Scene name"
          />
          <button className="soft-button" onClick={saveScene} style={{ whiteSpace: 'nowrap' }}>
            {savedFlag ? '✓ Saved!' : '💾 Save Scene'}
          </button>
        </div>
        <label>
          Duration: {durationMinutes} min
          <input type="range" min={1} max={180} step={1} value={durationMinutes}
            onChange={e => setDurationMinutes(Number(e.target.value))} />
        </label>
        <label>
          Crossfade: {crossfadeSec} sec
          <input type="range" min={0} max={60} step={1} value={crossfadeSec}
            onChange={e => setCrossfadeSec(Number(e.target.value))} />
        </label>

        {savedScenes.length > 0 && (
          <div className="studio-saved-scenes">
            {savedScenes.map(scene => (
              <div key={scene.id} className="studio-scene-card">
                <span className="studio-scene-card-name">{scene.name}</span>
                <span className="studio-scene-card-meta">{scene.durationMinutes}m · {scene.crossfadeSec}s fade</span>
                <button className="studio-journey-btn" onClick={() => loadScene(scene)}>✏️ Load</button>
                <button className="studio-journey-btn" onClick={() => addToJourney(scene)}>Add to Journey +</button>
              </div>
            ))}
          </div>
        )}
      </div>
        </div>
      </div>

      <div className="section-block">
        <div className="section-title">Journey</div>
        <div className="section-card">
      {journeyScenes.length > 0 && (
        <div className="studio-journey-list">
          {journeyScenes.map((scene, idx) => (
            <div
              key={scene.id}
              className={`studio-journey-scene${activeJourneyIdx === idx ? ' studio-journey-scene--active' : ''}${dragOverIdx === idx ? ' studio-journey-scene--dragover' : ''}`}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
            >
              <span className="studio-journey-drag-handle" title="Drag to reorder">⠿</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', minWidth: '1.2rem' }}>{idx + 1}.</span>
              <span className="studio-journey-scene-name">{scene.name}</span>
              <span className="studio-journey-scene-meta">{scene.durationMinutes}m</span>
              {activeJourneyIdx === idx && journeyCountdown !== null && (
                <span className="studio-journey-countdown">{formatCountdown(journeyCountdown)}</span>
              )}
              <input
                type="number"
                min={0} max={60} step={1}
                value={scene.crossfadeSec}
                style={{ width: '3.5rem', fontSize: '0.78rem' }}
                onChange={e => updateJourneyCrossfade(idx, Number(e.target.value))}
                title="Crossfade sec"
              />
              <button className="studio-journey-btn" onClick={() => removeJourneyScene(idx)}>✕</button>
            </div>
          ))}
        </div>
      )}
      {journeyScenes.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Save scenes above and add them to the Journey queue.
        </p>
      )}

      {/* Journey save row */}
      {journeyScenes.length > 0 && (
        <div className="studio-scene-row" style={{ marginTop: '0.5rem' }}>
          <input
            type="text"
            className="text-input"
            value={journeyName}
            onChange={e => setJourneyName(e.target.value)}
            placeholder="Journey name"
          />
          <button className="soft-button" onClick={saveJourney} style={{ whiteSpace: 'nowrap' }}>
            {journeySavedFlag ? '✓ Saved!' : '💾 Save Journey'}
          </button>
        </div>
      )}

      {/* Saved journeys list */}
      {savedJourneys.length > 0 && (
        <div className="studio-saved-scenes" style={{ marginTop: '0.4rem' }}>
          {savedJourneys.map(j => (
            <div key={j.id} className="studio-scene-card">
              <span className="studio-scene-card-name">{j.name}</span>
              <span className="studio-scene-card-meta">{j.scenes.length} scenes</span>
              <button className="studio-journey-btn" onClick={() => loadJourney(j)}>Load</button>
              <button className="studio-journey-btn" onClick={() => deleteJourney(j.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="studio-actions" style={{ marginTop: '0.5rem' }}>
        {journeyPlaying
          ? <button className="soft-button soft-button--danger" onClick={stopJourney}>■ Stop Journey</button>
          : <button className="soft-button" onClick={playJourney} disabled={journeyScenes.length === 0}>▶ Play Journey</button>
        }
        <button className="soft-button soft-button--danger" onClick={() => { stopJourney(); setJourneyScenes([]) }} disabled={journeyScenes.length === 0}>
          ✕ Clear Journey
        </button>
      </div>
        </div>
      </div>

      </div>{/* tab-sections */}
    </div>
  )
}
