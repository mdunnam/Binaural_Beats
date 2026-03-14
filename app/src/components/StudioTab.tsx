import { useEffect, useState } from 'react'
import type { StudioLayer, StudioLayerType, StudioScene } from '../types'
import { SOUNDSCAPE_SCENES, SOUND_LAYERS } from '../engine/soundscapeMixer'

const STUDIO_SCENES_KEY = 'liminal-studio-scenes'

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
  const [sceneName, setSceneName] = useState('My Scene')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [crossfadeSec, setCrossfadeSec] = useState(10)
  const [savedScenes, setSavedScenes] = useState<StudioScene[]>([])
  const [journeyScenes, setJourneyScenes] = useState<StudioScene[]>([])
  const [savedFlag, setSavedFlag] = useState(false)

  // Load scenes from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STUDIO_SCENES_KEY)
      if (raw) setSavedScenes(JSON.parse(raw) as StudioScene[])
    } catch { /* ignore */ }
  }, [])

  // Live-update debounced
  useEffect(() => {
    if (!isRunning) return
    const id = window.setTimeout(() => onLiveUpdate(layers), 200)
    return () => window.clearTimeout(id)
  }, [isRunning, layers]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Layer helpers ──
  function updateLayer(id: string, patch: Partial<StudioLayer>) {
    setLayers(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))
  }
  function updateSettings(id: string, patch: Record<string, unknown>) {
    setLayers(ls => ls.map(l => l.id === id ? { ...l, settings: { ...l.settings, ...patch } } : l))
  }
  function deleteLayer(id: string) {
    setLayers(ls => ls.filter(l => l.id !== id))
  }
  function addLayer(type: StudioLayerType) {
    const firstTrackId = musicTracks[0]?.id ?? ''
    setLayers(ls => [...ls, defaultLayer(type, firstTrackId)])
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

  // ── Journey helpers ──
  function addToJourney(scene: StudioScene) {
    setJourneyScenes(js => [...js, { ...scene, id: uid() }])
  }
  function moveJourneyScene(idx: number, dir: -1 | 1) {
    const next = [...journeyScenes]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setJourneyScenes(next)
  }
  function removeJourneyScene(idx: number) {
    setJourneyScenes(js => js.filter((_, i) => i !== idx))
  }
  function updateJourneyCrossfade(idx: number, val: number) {
    setJourneyScenes(js => js.map((s, i) => i === idx ? { ...s, crossfadeSec: val } : s))
  }
  function playJourney() {
    if (journeyScenes.length === 0) return
    const first = journeyScenes[0]
    onPreview(first.layers)
    // TODO: queue remaining scenes — future enhancement
  }

  return (
    <div className="studio-tab">
      {/* Header */}
      <div className="studio-layer-header" style={{ cursor: 'default', background: 'none', padding: 0 }}>
        <span style={{ flex: 1, fontSize: '1.1rem', fontWeight: 700 }}>Studio</span>
        {isRunning && (
          <span className="sp-live-badge">
            <span className="sp-live-dot" />
            Live
          </span>
        )}
        {isRunning
          ? <button className="soft-button" style={{ padding: '0.3rem 0.9rem', fontSize: '0.83rem' }} onClick={onStop}>■ Stop</button>
          : <button className="soft-button" style={{ padding: '0.3rem 0.9rem', fontSize: '0.83rem' }} onClick={() => onPreview(layers)}>▶ Preview</button>
        }
      </div>

      {/* Layer stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {layers.map(layer => (
          <div key={layer.id} className={`studio-layer-card${!layer.enabled ? ' studio-layer-card--disabled' : ''}`}>
            <div className="studio-layer-header" onClick={() => setExpandedLayerId(id => id === layer.id ? null : layer.id)}>
              <span className="studio-layer-drag">⠿</span>
              <span className="studio-layer-icon">{LAYER_ICONS[layer.type]}</span>
              <span className="studio-layer-label">{layer.label}</span>
              <input
                className="studio-layer-vol"
                type="range" min={0} max={1} step={0.01}
                value={layer.volume}
                onClick={e => e.stopPropagation()}
                onChange={e => updateLayer(layer.id, { volume: Number(e.target.value) })}
              />
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
                          // Auto-populate layerGains from the selected scene definition
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

      {/* Scenes section */}
      <div className="studio-section-title">Scenes</div>
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
                <button className="studio-journey-btn" onClick={() => addToJourney(scene)}>Add to Journey +</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Journey section */}
      <div className="studio-section-title">Journey</div>
      {journeyScenes.length > 0 && (
        <div className="studio-journey-list">
          {journeyScenes.map((scene, idx) => (
            <div key={scene.id} className="studio-journey-scene">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', minWidth: '1.2rem' }}>{idx + 1}.</span>
              <span className="studio-journey-scene-name">{scene.name}</span>
              <span className="studio-journey-scene-meta">{scene.durationMinutes}m</span>
              <input
                type="number"
                min={0} max={60} step={1}
                value={scene.crossfadeSec}
                style={{ width: '3.5rem', fontSize: '0.78rem' }}
                onChange={e => updateJourneyCrossfade(idx, Number(e.target.value))}
                title="Crossfade sec"
              />
              <button className="studio-journey-btn" onClick={() => moveJourneyScene(idx, -1)} disabled={idx === 0}>▲</button>
              <button className="studio-journey-btn" onClick={() => moveJourneyScene(idx, 1)} disabled={idx === journeyScenes.length - 1}>▼</button>
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
      <div className="studio-actions" style={{ marginTop: '0.5rem' }}>
        <button className="soft-button" onClick={playJourney} disabled={journeyScenes.length === 0}>
          ▶ Play Journey
        </button>
        <button className="soft-button soft-button--danger" onClick={() => setJourneyScenes([])} disabled={journeyScenes.length === 0}>
          ✕ Clear Journey
        </button>
      </div>
    </div>
  )
}
