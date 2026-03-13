import type { MusicTrack, MusicEQBands } from '../engine/musicPlayer'
import { DEFAULT_EQ } from '../engine/musicPlayer'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatEQValue(val: number): string {
  if (val === 0) return '0 dB'
  return `${val > 0 ? '+' : ''}${val.toFixed(1)} dB`
}

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
}: MusicTabProps) {
  const currentTrack = tracks.find(t => t.id === currentTrackId) ?? null

  const handlePlayPause = () => {
    if (isPlaying) {
      onStop()
    } else if (currentTrack) {
      onPlay(currentTrack)
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

  return (
    <div className="music-tab">
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
          disabled={duration === 0}
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
