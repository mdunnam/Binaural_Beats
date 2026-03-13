import type { MusicTrack } from '../engine/musicPlayer'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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
      <p className="music-attribution">Tracks by Seth_Makes_Sounds · CC0 via Freesound</p>
    </div>
  )
}
