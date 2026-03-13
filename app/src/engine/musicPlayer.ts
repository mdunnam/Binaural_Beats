export type MusicTrack = {
  id: string
  title: string
  artist: string
  file: string  // path relative to BASE_URL
  duration: number  // seconds
}

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: '668377', title: 'Lofi Beat',           artist: 'Seth_Makes_Sounds', file: 'music/lofi-beat-song-thing.mp3',  duration: 174 },
  { id: '666721', title: 'Dusty Lofi',           artist: 'Seth_Makes_Sounds', file: 'music/dusty-lofi-song.mp3',       duration: 128 },
  { id: '685302', title: 'Real Chill Beat',      artist: 'Seth_Makes_Sounds', file: 'music/real-chill-beat.mp3',       duration: 170 },
  { id: '659278', title: 'Lofi Guitar',          artist: 'Seth_Makes_Sounds', file: 'music/lofi-guitar-beat.mp3',      duration: 97  },
  { id: '691837', title: 'Easy Going',           artist: 'Seth_Makes_Sounds', file: 'music/easy-going-loop.mp3',       duration: 188 },
  { id: '709779', title: 'Chill Piano',          artist: 'Seth_Makes_Sounds', file: 'music/chill-lofi-piano.mp3',      duration: 126 },
  { id: '672038', title: 'Soul Beat',            artist: 'Seth_Makes_Sounds', file: 'music/soul-beat.mp3',             duration: 151 },
  { id: '716499', title: 'Laid Back Electronic', artist: 'Seth_Makes_Sounds', file: 'music/laid-back-electronic.mp3',  duration: 64  },
]

export type MusicPlayer = {
  context: AudioContext
  source: AudioBufferSourceNode | null
  gainNode: GainNode
  destination: AudioNode
  currentTrackId: string | null
  startedAt: number
  offsetAt: number
}

export async function createMusicPlayer(
  destination: AudioNode,
  context: AudioContext,
  volume: number,
): Promise<MusicPlayer> {
  const gainNode = context.createGain()
  gainNode.gain.value = Math.max(0, volume)
  gainNode.connect(destination)

  return {
    context,
    source: null,
    gainNode,
    destination,
    currentTrackId: null,
    startedAt: 0,
    offsetAt: 0,
  }
}

export async function playTrack(
  player: MusicPlayer,
  track: MusicTrack,
  baseUrl: string,
  onEnded?: () => void,
): Promise<void> {
  // Stop existing source
  if (player.source) {
    player.source.onended = null
    try { player.source.stop() } catch { /* ignore */ }
    try { player.source.disconnect() } catch { /* ignore */ }
    player.source = null
  }

  const url = `${baseUrl}${track.file}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await player.context.decodeAudioData(arrayBuffer)

  const source = player.context.createBufferSource()
  source.buffer = audioBuffer
  source.loop = false
  source.connect(player.gainNode)

  player.source = source
  player.currentTrackId = track.id
  player.startedAt = player.context.currentTime
  player.offsetAt = 0

  source.onended = () => {
    if (player.source === source) {
      player.source = null
      player.currentTrackId = null
    }
    onEnded?.()
  }

  source.start(0)
}

export function stopMusicPlayer(player: MusicPlayer, fadeTime = 0.3): void {
  if (!player.source) return
  const src = player.source
  player.source = null
  player.currentTrackId = null

  const ctx = player.context
  const now = ctx.currentTime

  if (fadeTime > 0) {
    player.gainNode.gain.cancelScheduledValues(now)
    player.gainNode.gain.setValueAtTime(player.gainNode.gain.value, now)
    player.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeTime)
    setTimeout(() => {
      src.onended = null
      try { src.stop() } catch { /* ignore */ }
      try { src.disconnect() } catch { /* ignore */ }
    }, Math.ceil(fadeTime * 1000) + 50)
  } else {
    src.onended = null
    try { src.stop() } catch { /* ignore */ }
    try { src.disconnect() } catch { /* ignore */ }
  }
}

export function setMusicVolume(player: MusicPlayer, volume: number): void {
  const now = player.context.currentTime
  player.gainNode.gain.cancelScheduledValues(now)
  player.gainNode.gain.setTargetAtTime(Math.max(0, volume), now, 0.05)
}
