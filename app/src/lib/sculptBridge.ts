// ZBrush sculpt bridge — polls local companion service
// Non-destructive: pure data layer, no audio engine imports

export interface SculptState {
  pressure: number        // 0–1
  speed: number           // 0–1
  brushSize: number       // 0–1
  brushType: 'clay' | 'smooth' | 'inflate' | 'pinch' | 'standard' | 'dam_standard' | 'move' | 'snake_hook'
  intensity: number       // 0–1
  symmetry: boolean
  subdivLevel: number     // 1–7
  strokesPerSecond: number
  idle: boolean
}

export const DEFAULT_SCULPT_STATE: SculptState = {
  pressure: 0,
  speed: 0,
  brushSize: 0.5,
  brushType: 'standard',
  intensity: 0.5,
  symmetry: false,
  subdivLevel: 1,
  strokesPerSecond: 0,
  idle: true,
}

const BRIDGE_URL = 'http://127.0.0.1:7842/sculpt-state'

export async function fetchSculptState(): Promise<SculptState | null> {
  try {
    const res = await fetch(BRIDGE_URL, { signal: AbortSignal.timeout(150) })
    if (!res.ok) return null
    return await res.json() as SculptState
  } catch {
    return null
  }
}

// Map sculpt state to audio parameter targets
export interface AudioTargets {
  carrier: number    // Hz
  beat: number       // Hz
  volume: number     // 0–1
  binauralVolume: number
  noiseVolume: number
}

export interface BridgeMapping {
  // Flow State mode mappings
  pressureToVolume: boolean      // pressure controls master volume
  speedToBeat: boolean           // stroke speed modulates beat frequency
  brushSizeToCarrier: boolean    // brush size modulates carrier
  idleFadeToAmbient: boolean     // idle → fade to ambient
  brushTypeToState: boolean      // brush type influences brainwave state
}

export const DEFAULT_MAPPING: BridgeMapping = {
  pressureToVolume: true,
  speedToBeat: true,
  brushSizeToCarrier: false,
  idleFadeToAmbient: true,
  brushTypeToState: true,
}

// Brush type → suggested beat frequency
export function brushTypeToBeat(brushType: SculptState['brushType']): number {
  const map: Record<SculptState['brushType'], number> = {
    clay:        14,   // Beta — building up, energized
    inflate:     16,   // High beta — assertive
    snake_hook:  18,   // High beta — dynamic movement
    standard:    12,   // Beta — focused
    dam_standard: 10,  // Alpha — precise, calm
    pinch:        8,   // Alpha — detail, calm focus
    move:         6,   // Theta — fluid, creative
    smooth:       4,   // Theta/Delta — relaxed, polishing
  }
  return map[brushType] ?? 10
}

export function computeAudioTargets(
  state: SculptState,
  mapping: BridgeMapping,
  baseCarrier: number,
  baseBeat: number,
): AudioTargets {
  let carrier = baseCarrier
  let beat = baseBeat
  let binauralVolume = 0.7
  let noiseVolume = 0.3

  const isSculpting = !state.idle && state.speed > 0.05

  // Only change beat/carrier when actively sculpting — not at idle
  if (isSculpting) {
    if (mapping.brushTypeToState) {
      beat = brushTypeToBeat(state.brushType)
    }

    if (mapping.speedToBeat && state.speed > 0) {
      // Fast strokes push beat up slightly
      beat = beat + (state.speed * 4)
      beat = Math.min(Math.max(beat, 1), 40)
    }

    if (mapping.brushSizeToCarrier) {
      // Large brush = lower carrier, small brush = higher
      carrier = baseCarrier + ((0.5 - state.brushSize) * 100)
      carrier = Math.min(Math.max(carrier, 80), 500)
    }
  }

  if (mapping.idleFadeToAmbient && state.idle) {
    // Idle: fade binaural slightly, keep soundscape
    binauralVolume *= 0.5
    noiseVolume = Math.min(noiseVolume + 0.2, 0.8)
  }

  return { carrier, beat, volume: 0.7, binauralVolume, noiseVolume }
}
