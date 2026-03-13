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
  { id: '680134', title: 'Fuzzy Lofi Synth',    artist: 'Seth_Makes_Sounds', file: 'music/fuzzy-lofi-synth.mp3',       duration: 133 },
  { id: '670039', title: 'Chill Background',     artist: 'Seth_Makes_Sounds', file: 'music/chill-background-music.mp3', duration: 150 },
  { id: '679187', title: 'Aesthetic Lofi',       artist: 'Seth_Makes_Sounds', file: 'music/aesthetic-lofi-loop.mp3',    duration: 160 },
  { id: '455855', title: 'Wandering',            artist: 'Andrewkn',          file: 'music/wandering-ambient.mp3',      duration: 290 },
  { id: '827922', title: 'Ambient Pad Piano',    artist: 'Andrewkn',          file: 'music/ambient-pad-piano.mp3',      duration: 96  },
]

export type MusicEQBands = {
  sub: number       // 60Hz  lowshelf  ±12dB
  bass: number      // 200Hz peaking   ±12dB
  mid: number       // 1000Hz peaking  ±12dB
  presence: number  // 4000Hz peaking  ±12dB
  air: number       // 12000Hz highshelf ±12dB
}

export const DEFAULT_EQ: MusicEQBands = { sub: 0, bass: 0, mid: 0, presence: 0, air: 0 }

export type MusicPlayer = {
  context: AudioContext
  source: AudioBufferSourceNode | null
  gainNode: GainNode
  eqNodes: BiquadFilterNode[]  // [sub, bass, mid, presence, air]
  destination: AudioNode
  currentTrackId: string | null
  startedAt: number
  offsetAt: number
  audioBuffer: AudioBuffer | null
}

export async function createMusicPlayer(
  destination: AudioNode,
  context: AudioContext,
  volume: number,
): Promise<MusicPlayer> {
  const gainNode = context.createGain()
  gainNode.gain.value = Math.max(0, volume)

  // Create 5-band EQ
  const subFilter = context.createBiquadFilter()
  subFilter.type = 'lowshelf'
  subFilter.frequency.value = 60
  subFilter.gain.value = 0

  const bassFilter = context.createBiquadFilter()
  bassFilter.type = 'peaking'
  bassFilter.frequency.value = 200
  bassFilter.Q.value = 1.0
  bassFilter.gain.value = 0

  const midFilter = context.createBiquadFilter()
  midFilter.type = 'peaking'
  midFilter.frequency.value = 1000
  midFilter.Q.value = 1.0
  midFilter.gain.value = 0

  const presenceFilter = context.createBiquadFilter()
  presenceFilter.type = 'peaking'
  presenceFilter.frequency.value = 4000
  presenceFilter.Q.value = 1.0
  presenceFilter.gain.value = 0

  const airFilter = context.createBiquadFilter()
  airFilter.type = 'highshelf'
  airFilter.frequency.value = 12000
  airFilter.gain.value = 0

  const eqNodes = [subFilter, bassFilter, midFilter, presenceFilter, airFilter]

  // Chain: gainNode → eq[0] → eq[1] → eq[2] → eq[3] → eq[4] → destination
  gainNode.connect(eqNodes[0])
  eqNodes[0].connect(eqNodes[1])
  eqNodes[1].connect(eqNodes[2])
  eqNodes[2].connect(eqNodes[3])
  eqNodes[3].connect(eqNodes[4])
  eqNodes[4].connect(destination)

  return {
    context,
    source: null,
    gainNode,
    eqNodes,
    destination,
    currentTrackId: null,
    startedAt: 0,
    offsetAt: 0,
    audioBuffer: null,
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

  let audioBuffer: AudioBuffer
  if (player.audioBuffer && player.currentTrackId === track.id) {
    audioBuffer = player.audioBuffer
  } else {
    const url = `${baseUrl}${track.file}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    audioBuffer = await player.context.decodeAudioData(arrayBuffer)
    player.audioBuffer = audioBuffer
  }

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

export function getMusicPosition(player: MusicPlayer): number {
  if (!player.source || player.startedAt === 0) return player.offsetAt
  const pos = player.offsetAt + (player.context.currentTime - player.startedAt)
  // clamp to 0 and some reasonable max (we don't always know duration here)
  return Math.max(0, pos)
}

export async function seekMusicTo(
  player: MusicPlayer,
  track: MusicTrack,
  offsetSeconds: number,
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

  let audioBuffer: AudioBuffer
  if (player.audioBuffer && player.currentTrackId === track.id) {
    audioBuffer = player.audioBuffer
  } else {
    const url = `${baseUrl}${track.file}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    audioBuffer = await player.context.decodeAudioData(arrayBuffer)
    player.audioBuffer = audioBuffer
    player.currentTrackId = track.id
  }

  const clampedOffset = Math.max(0, Math.min(offsetSeconds, audioBuffer.duration))

  const source = player.context.createBufferSource()
  source.buffer = audioBuffer
  source.loop = false
  source.connect(player.gainNode)

  player.source = source
  player.currentTrackId = track.id
  player.startedAt = player.context.currentTime
  player.offsetAt = clampedOffset

  source.onended = () => {
    if (player.source === source) {
      player.source = null
      player.currentTrackId = null
    }
    onEnded?.()
  }

  source.start(0, clampedOffset)
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

export function setMusicEQ(player: MusicPlayer, bands: MusicEQBands): void {
  player.eqNodes[0].gain.value = bands.sub
  player.eqNodes[1].gain.value = bands.bass
  player.eqNodes[2].gain.value = bands.mid
  player.eqNodes[3].gain.value = bands.presence
  player.eqNodes[4].gain.value = bands.air
}
