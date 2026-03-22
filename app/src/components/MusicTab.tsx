import { useRef, useState } from 'react'
import type { MusicTrack, MusicEQBands } from '../engine/musicPlayer'
import { DEFAULT_EQ } from '../engine/musicPlayer'
import { detectBpm } from '../engine/bpmDetector'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatEQValue(val: number): string {
  if (val === 0) return '0 dB'
  return `${val > 0 ? '+' : ''}${val.toFixed(1)} dB`
}

const MAX_TAPS = 8
const TAP_RESET_MS = 3000  // reset tap history if gap > 3 s

export type MusicTabProps = {
  tracks: MusicTrack[]
  currentTrackId: string | null
  isPlaying: boolean
  volume: number
  onSetVolume: (v: number) => void
  onPlay: (track: MusicTrack) => void
  onStop: () => void
  onNext: () => void
  onPrev: () => void
  shuffle: boolean
  onToggleShuffle: () => void
  eq: MusicEQBands
  onSetEQ: (bands: MusicEQBands) => void
  position: number
  duration: number
  onSeek: (seconds: number) => void
  // Song Import
  importedTrack: MusicTrack | null
  importedBuffer: AudioBuffer | null
  onImportFile: (file: File) => void
  onPlayImported: () => void
  onClearImported: () => void
  // Tap Tempo
  onSyncBpm: (bpm: number) => void
}

export function MusicTab({
  tracks,
  currentTrackId,
  isPlaying,
  volume,
  onSetVolume,
  onPlay,
  onStop,
  onNext,
  onPrev,
  shuffle,
  onToggleShuffle,
  eq,
  onSetEQ,
  position,
  duration,
  onSeek,
  importedTrack,
  importedBuffer,
  onImportFile,
  onPlayImported,
  onClearImported,
  onSyncBpm,
}: MusicTabProps) {
  const currentTrack = [...tracks, ...(importedTrack ? [importedTrack] : [])].find(t => t.id === currentTrackId) ?? null

  const handlePlayPause = () => {
    if (isPlaying) {
      onStop()
    } else if (currentTrack) {
      if (currentTrack.id === 'imported') onPlayImported()
      else onPlay(currentTrack)
    } else if (tracks.length > 0) {
      onPlay(tracks[0])
    }
  }

  const EQ_BANDS: { key: keyof MusicEQBands; label: string }[] = [
    { key: 'sub',      label: 'Sub' },
    { key: 'bass',     label: 'Bass' },
    { key: 'mid',      label: 'Mid' },
    { key: 'presence', label: 'Pres' },
    { key: 'air',      label: 'Air' },
  ]

  // ── Song Import ─────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a|opus)$/i)) return
    onImportFile(file)
  }

  // ── Tap Tempo ────────────────────────────────────────────────────────────────
  const [tapTimes, setTapTimes] = useState<number[]>([])
  const tapBpm = (() => {
    if (tapTimes.length < 2) return null
    const intervals: number[] = []
    for (let i = 1; i < tapTimes.length; i++) intervals.push(tapTimes[i] - tapTimes[i - 1])
    const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length
    return Math.round(60000 / avgMs)
  })()

  const handleTap = () => {
    const now = Date.now()
    setTapTimes(prev => {
      const filtered = prev.filter(t => now - t < TAP_RESET_MS)
      return [...filtered, now].slice(-MAX_TAPS)
    })
  }

  const handleTapReset = () => setTapTimes([])

  // ── Auto BPM Detection ───────────────────────────────────────────────────────
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null)
  const [detecting, setDetecting] = useState(false)

  const handleAutoDetect = () => {
    if (!importedBuffer || detecting) return
    setDetecting(true)
    setDetectedBpm(null)
    // Run in a microtask so the loading state renders first
    setTimeout(() => {
      const bpm = detectBpm(importedBuffer)
      setDetectedBpm(bpm)
      setDetecting(false)
    }, 0)
  }

  // Active BPM — prefer tap (more recent user intent) over auto-detected
  const activeBpm = tapBpm ?? detectedBpm

  return (
    <div className="music-tab">

      {/* ── Song Import ─────────────────────────────────────────────────────── */}
      <div className="music-import-section">
        <div className="music-import-header">
          <span className="music-eq-title">Import Track</span>
          {importedTrack && (
            <button className="music-eq-reset" onClick={onClearImported}>Clear</button>
          )}
        </div>
        {importedTrack ? (
          <div className="music-import-loaded">
            <span className="music-import-loaded-name">♪ {importedTrack.title}</span>
            <span className="music-import-loaded-dur">{formatDuration(importedTrack.duration)}</span>
            <button
              className={`music-ctrl-btn music-ctrl-btn--play music-import-play-btn${currentTrackId === 'imported' && isPlaying ? ' music-ctrl-btn--active' : ''}`}
              onClick={() => { if (currentTrackId === 'imported' && isPlaying) onStop(); else onPlayImported() }}
            >
              {currentTrackId === 'imported' && isPlaying ? '■' : '▶'}
            </button>
          </div>
        ) : (
          <div
            className={`music-import-drop${dragOver ? ' music-import-drop--over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="music-import-drop-icon">⊕</span>
            <span className="music-import-drop-text">Drop audio file or click to browse</span>
            <span className="music-import-drop-hint">MP3, WAV, OGG, FLAC, AAC</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.opus"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Now Playing */}
      <div className="music-now-playing">
        <div className="music-now-playing-label">Now Playing</div>
        {currentTrack ? (
          <>
            <div className="music-now-playing-title">♪ {currentTrack.title}</div>
            <div className="music-now-playing-meta">
              {currentTrack.artist} · {formatDuration(currentTrack.duration)}
            </div>
          </>
        ) : (
          <div className="music-now-playing-title music-now-playing-idle">Select a track to play</div>
        )}
      </div>

      {/* Seek Bar */}
      <div className="music-seek-row">
        <span className="music-seek-time">{formatDuration(position)}</span>
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 1}
          step={1}
          value={position}
          onChange={e => onSeek(Number(e.target.value))}
          className="music-seek-slider"
          aria-label="Seek"
          disabled={duration === 0 || currentTrackId === 'imported'}
        />
        <span className="music-seek-time">{formatDuration(duration)}</span>
      </div>

      {/* Controls */}
      <div className="music-controls">
        <button className="music-ctrl-btn" onClick={onPrev} title="Previous" aria-label="Previous track">◀◀</button>
        <button className="music-ctrl-btn music-ctrl-btn--play" onClick={handlePlayPause} title={isPlaying ? 'Stop' : 'Play'} aria-label={isPlaying ? 'Stop' : 'Play'}>
          {isPlaying ? '■' : '▶'}
        </button>
        <button className="music-ctrl-btn" onClick={onNext} title="Next" aria-label="Next track">▶▶</button>
        <button
          className={`music-ctrl-btn music-ctrl-btn--shuffle${shuffle ? ' music-ctrl-btn--shuffle-on' : ''}`}
          onClick={onToggleShuffle}
          title="Shuffle"
          aria-label="Toggle shuffle"
        >
          ⇀ shuffle
        </button>
      </div>

      {/* Volume */}
      <div className="music-volume-row">
        <span className="music-volume-label">Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={e => onSetVolume(Number(e.target.value))}
          className="music-volume-slider"
          aria-label="Music volume"
        />
        <span className="music-volume-pct">{Math.round(volume * 100)}%</span>
      </div>

      {/* EQ */}
      <div className="music-eq-section">
        <div className="music-eq-header">
          <span className="music-eq-title">EQ</span>
          <button
            className="music-eq-reset"
            onClick={() => onSetEQ({ ...DEFAULT_EQ })}
            title="Reset EQ"
          >
            Reset
          </button>
        </div>
        {EQ_BANDS.map(({ key, label }) => (
          <div key={key} className="music-eq-row">
            <span className="music-eq-label">{label}</span>
            <input
              type="range"
              min={-12}
              max={12}
              step={0.1}
              value={eq[key]}
              onChange={e => onSetEQ({ ...eq, [key]: Number(e.target.value) })}
              className="music-eq-slider"
              aria-label={`${label} EQ`}
            />
            <span className="music-eq-value">{formatEQValue(eq[key])}</span>
          </div>
        ))}
      </div>

      {/* ── Tap Tempo / Auto BPM ──────────────────────────────────────────────── */}
      <div className="music-tap-section">
        <div className="music-eq-header">
          <span className="music-eq-title">BPM</span>
          {tapTimes.length > 0 && (
            <button className="music-eq-reset" onClick={() => { handleTapReset(); setDetectedBpm(null) }}>Reset</button>
          )}
        </div>
        <div className="music-tap-row">
          <button className="music-tap-btn" onClick={handleTap} aria-label="Tap tempo">
            Tap
          </button>
          {importedBuffer && (
            <button
              className={`music-auto-detect-btn${detecting ? ' music-auto-detect-btn--loading' : ''}`}
              onClick={handleAutoDetect}
              disabled={detecting}
              title="Auto-detect BPM from imported track"
            >
              {detecting ? 'Detecting…' : 'Auto-detect'}
            </button>
          )}
          <div className="music-tap-bpm">
            {activeBpm !== null ? (
              <>
                <span className="music-tap-bpm-value">{activeBpm}</span>
                <span className="music-tap-bpm-label">BPM</span>
                {tapBpm === null && detectedBpm !== null && (
                  <span className="music-tap-bpm-source"> auto</span>
                )}
              </>
            ) : (
              <span className="music-tap-bpm-idle">
                {tapTimes.length === 1 ? 'Keep tapping…' : 'Tap or auto-detect'}
              </span>
            )}
          </div>
          {activeBpm !== null && (
            <button
              className="soft-button music-tap-sync-btn"
              onClick={() => onSyncBpm(activeBpm)}
              title="Sync binaural beat frequency to BPM"
            >
              Sync to Beat
            </button>
          )}
        </div>
        {activeBpm !== null && (
          <p className="music-tap-hint">
            Beat will be set to {(activeBpm / 60).toFixed(2)} Hz (1 cycle per music beat)
          </p>
        )}
      </div>

      {/* Track List */}
      <div className="music-track-list">
        {tracks.map(track => (
          <div
            key={track.id}
            className={`music-track-row${track.id === currentTrackId ? ' music-track-row--active' : ''}`}
            onClick={() => onPlay(track)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onPlay(track) }}
            aria-label={`Play ${track.title}`}
          >
            <span className="music-track-indicator">{track.id === currentTrackId && isPlaying ? '▶' : ''}</span>
            <span className="music-track-title">{track.title}</span>
            <span className="music-track-duration">{formatDuration(track.duration)}</span>
          </div>
        ))}
      </div>

      {/* Attribution */}
      <p className="music-attribution">Tracks by Seth_Makes_Sounds & Andrewkn · CC0 via Freesound</p>
    </div>
  )
}
