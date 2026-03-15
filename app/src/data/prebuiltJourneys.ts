import type { StudioJourney, StudioScene, StudioLayer } from '../types'

function mkLayer(
  type: StudioLayer['type'],
  label: string,
  volume: number,
  settings: Record<string, unknown> = {}
): StudioLayer {
  return {
    id: `${type}-${Math.random().toString(36).slice(2)}`,
    type,
    enabled: true,
    volume,
    label,
    settings,
  }
}

function mkScene(name: string, durationMinutes: number, layers: StudioLayer[]): StudioScene {
  return { id: Math.random().toString(36).slice(2), name, durationMinutes, crossfadeSec: 30, layers }
}

// ── 1. Deep Sleep Descent ──────────────────────────────────────────────────
const deepSleepDescent: StudioJourney = {
  id: 'prebuilt-deep-sleep-descent',
  name: 'Deep Sleep Descent',
  scenes: [
    mkScene('Settling Down', 15, [
      mkLayer('carrier', 'Carrier 174 Hz', 0.7, { hz: 174 }),
      mkLayer('beat', 'Beat 10 Hz (alpha)', 0.7, { hz: 10 }),
      mkLayer('noise', 'Pink Noise', 0.12, { noiseType: 'pink' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('Drifting', 15, [
      mkLayer('carrier', 'Carrier 174 Hz', 0.7, { hz: 174 }),
      mkLayer('beat', 'Beat 6 Hz (theta)', 0.7, { hz: 6 }),
      mkLayer('noise', 'Brown Noise', 0.15, { noiseType: 'brown' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('Deep Dive', 20, [
      mkLayer('carrier', 'Carrier 174 Hz', 0.7, { hz: 174 }),
      mkLayer('beat', 'Beat 3 Hz (delta)', 0.7, { hz: 3 }),
      mkLayer('noise', 'Brown Noise', 0.18, { noiseType: 'brown' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('Delta Hold', 10, [
      mkLayer('carrier', 'Carrier 174 Hz', 0.7, { hz: 174 }),
      mkLayer('beat', 'Beat 2 Hz (delta)', 0.7, { hz: 2 }),
      mkLayer('noise', 'Brown Noise', 0.18, { noiseType: 'brown' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
  ],
}

// ── 2. Morning Activation ──────────────────────────────────────────────────
const morningActivation: StudioJourney = {
  id: 'prebuilt-morning-activation',
  name: 'Morning Activation',
  scenes: [
    mkScene('Wake Up', 5, [
      mkLayer('carrier', 'Carrier 417 Hz', 0.7, { hz: 417 }),
      mkLayer('beat', 'Beat 14 Hz (beta)', 0.7, { hz: 14 }),
      mkLayer('noise', 'Pink Noise', 0.08, { noiseType: 'pink' }),
    ]),
    mkScene('Energize', 10, [
      mkLayer('carrier', 'Carrier 417 Hz', 0.7, { hz: 417 }),
      mkLayer('beat', 'Beat 18 Hz (high beta)', 0.7, { hz: 18 }),
      mkLayer('noise', 'Pink Noise', 0.1, { noiseType: 'pink' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('Focus Lock', 5, [
      mkLayer('carrier', 'Carrier 741 Hz', 0.7, { hz: 741 }),
      mkLayer('beat', 'Beat 14 Hz', 0.7, { hz: 14 }),
      mkLayer('noise', 'Pink Noise', 0.08, { noiseType: 'pink' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
  ],
}

// ── 3. Creative Flow ───────────────────────────────────────────────────────
const creativeFlow: StudioJourney = {
  id: 'prebuilt-creative-flow',
  name: 'Creative Flow',
  scenes: [
    mkScene('Open Mind', 10, [
      mkLayer('carrier', 'Carrier 852 Hz', 0.7, { hz: 852 }),
      mkLayer('beat', 'Beat 10 Hz (alpha)', 0.7, { hz: 10 }),
      mkLayer('noise', 'Pink Noise', 0.1, { noiseType: 'pink' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('Flow State', 15, [
      mkLayer('carrier', 'Carrier 852 Hz', 0.7, { hz: 852 }),
      mkLayer('beat', 'Beat 7 Hz (theta)', 0.7, { hz: 7 }),
      mkLayer('noise', 'Pink Noise', 0.08, { noiseType: 'pink' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('Integration', 5, [
      mkLayer('carrier', 'Carrier 852 Hz', 0.7, { hz: 852 }),
      mkLayer('beat', 'Beat 10 Hz', 0.7, { hz: 10 }),
      mkLayer('noise', 'Pink Noise', 0.1, { noiseType: 'pink' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
  ],
}

// ── 4. Stress Reset ────────────────────────────────────────────────────────
const stressReset: StudioJourney = {
  id: 'prebuilt-stress-reset',
  name: 'Stress Reset',
  scenes: [
    mkScene('Decompression', 8, [
      mkLayer('carrier', 'Carrier 396 Hz', 0.7, { hz: 396 }),
      mkLayer('beat', 'Beat 10 Hz (alpha)', 0.7, { hz: 10 }),
      mkLayer('noise', 'Brown Noise', 0.12, { noiseType: 'brown' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('Release', 7, [
      mkLayer('carrier', 'Carrier 396 Hz', 0.7, { hz: 396 }),
      mkLayer('beat', 'Beat 7 Hz (theta)', 0.7, { hz: 7 }),
      mkLayer('noise', 'Brown Noise', 0.15, { noiseType: 'brown' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
  ],
}

// ── 5. Deep Meditation ─────────────────────────────────────────────────────
const deepMeditation: StudioJourney = {
  id: 'prebuilt-deep-meditation',
  name: 'Deep Meditation',
  scenes: [
    mkScene('Grounding', 10, [
      mkLayer('carrier', 'Carrier 432 Hz', 0.7, { hz: 432 }),
      mkLayer('beat', 'Beat 8 Hz (alpha)', 0.7, { hz: 8 }),
      mkLayer('noise', 'Pink Noise', 0.08, { noiseType: 'pink' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('Theta Descent', 20, [
      mkLayer('carrier', 'Carrier 432 Hz', 0.7, { hz: 432 }),
      mkLayer('beat', 'Beat 6 Hz (theta)', 0.7, { hz: 6 }),
      mkLayer('noise', 'Pink Noise', 0.06, { noiseType: 'pink' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('Deep Theta', 10, [
      mkLayer('carrier', 'Carrier 432 Hz', 0.7, { hz: 432 }),
      mkLayer('beat', 'Beat 4 Hz (theta/delta)', 0.7, { hz: 4 }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
  ],
}

// ── 6. Focus Sprint ────────────────────────────────────────────────────────
const focusSprint: StudioJourney = {
  id: 'prebuilt-focus-sprint',
  name: 'Focus Sprint',
  scenes: [
    mkScene('Ramp Up', 5, [
      mkLayer('carrier', 'Carrier 741 Hz', 0.7, { hz: 741 }),
      mkLayer('beat', 'Beat 14 Hz (beta)', 0.7, { hz: 14 }),
      mkLayer('noise', 'Pink Noise', 0.1, { noiseType: 'pink' }),
    ]),
    mkScene('Sprint Zone', 20, [
      mkLayer('carrier', 'Carrier 741 Hz', 0.7, { hz: 741 }),
      mkLayer('beat', 'Beat 16 Hz (beta)', 0.7, { hz: 16 }),
      mkLayer('noise', 'Pink Noise', 0.08, { noiseType: 'pink' }),
    ]),
  ],
}

// ── 7. Lucid Dream Induction ───────────────────────────────────────────────
const lucidDreamInduction: StudioJourney = {
  id: 'prebuilt-lucid-dream-induction',
  name: 'Lucid Dream Induction',
  scenes: [
    mkScene('Sleep Entry', 15, [
      mkLayer('carrier', 'Carrier 432 Hz', 0.7, { hz: 432 }),
      mkLayer('beat', 'Beat 6 Hz (theta)', 0.7, { hz: 6 }),
      mkLayer('noise', 'Brown Noise', 0.1, { noiseType: 'brown' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('Hypnagogic', 20, [
      mkLayer('carrier', 'Carrier 432 Hz', 0.7, { hz: 432 }),
      mkLayer('beat', 'Beat 4 Hz (theta/delta)', 0.7, { hz: 4 }),
      mkLayer('noise', 'Brown Noise', 0.12, { noiseType: 'brown' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('REM Layer', 10, [
      mkLayer('carrier', 'Carrier 432 Hz', 0.7, { hz: 432 }),
      mkLayer('beat', 'Beat 3 Hz (delta)', 0.7, { hz: 3 }),
      mkLayer('noise', 'Brown Noise', 0.1, { noiseType: 'brown' }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
  ],
}

// ── 8. Astral Exploration ──────────────────────────────────────────────────
const astralExploration: StudioJourney = {
  id: 'prebuilt-astral-exploration',
  name: 'Astral Exploration',
  scenes: [
    mkScene('Departure', 20, [
      mkLayer('carrier', 'Carrier 963 Hz', 0.7, { hz: 963 }),
      mkLayer('beat', 'Beat 7 Hz (theta)', 0.7, { hz: 7 }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
    mkScene('Sustained Journey', 40, [
      mkLayer('carrier', 'Carrier 963 Hz', 0.7, { hz: 963 }),
      mkLayer('beat', 'Beat 6 Hz (theta)', 0.7, { hz: 6 }),
      mkLayer('pad', 'Pad', 0.5, {}),
    ]),
  ],
}

// ── Exported library ───────────────────────────────────────────────────────
export const PREBUILT_JOURNEYS: StudioJourney[] = [
  deepSleepDescent,
  morningActivation,
  creativeFlow,
  stressReset,
  deepMeditation,
  focusSprint,
  lucidDreamInduction,
  astralExploration,
]

export const JOURNEY_EMOJIS: Record<string, string> = {
  'prebuilt-deep-sleep-descent': '🌙',
  'prebuilt-morning-activation': '☀️',
  'prebuilt-creative-flow': '🎨',
  'prebuilt-stress-reset': '🌊',
  'prebuilt-deep-meditation': '🧘',
  'prebuilt-focus-sprint': '⚡',
  'prebuilt-lucid-dream-induction': '✨',
  'prebuilt-astral-exploration': '🔮',
}
