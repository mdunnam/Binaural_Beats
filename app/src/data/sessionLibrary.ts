export type SessionCard = {
  id: string
  emoji: string
  goal: string
  label: string
  description: string
  duration: number        // suggested minutes
  carrier: number         // Hz
  beat: number            // Hz
  noiseType: 'none' | 'white' | 'pink' | 'brown' | 'blue' | 'violet'
  noiseVolume: number     // 0-1
  padEnabled: boolean
  tier: 'free' | 'pro'
}

export const SESSION_LIBRARY: SessionCard[] = [
  {
    id: 'deep-sleep',
    emoji: '🌙',
    goal: 'Sleep',
    label: 'Deep Sleep',
    description: 'Delta waves for deep, restorative sleep',
    duration: 60,
    carrier: 174,
    beat: 2,
    noiseType: 'brown',
    noiseVolume: 0.18,
    padEnabled: true,
    tier: 'free',
  },
  {
    id: 'focus-flow',
    emoji: '⚡',
    goal: 'Focus',
    label: 'Focus Flow',
    description: 'Beta waves for sharp concentration',
    duration: 45,
    carrier: 741,
    beat: 16,
    noiseType: 'pink',
    noiseVolume: 0.1,
    padEnabled: false,
    tier: 'free',
  },
  {
    id: 'deep-relax',
    emoji: '🌊',
    goal: 'Relax',
    label: 'Deep Relax',
    description: 'Alpha waves to melt away tension',
    duration: 30,
    carrier: 396,
    beat: 10,
    noiseType: 'brown',
    noiseVolume: 0.12,
    padEnabled: true,
    tier: 'free',
  },
  {
    id: 'meditation',
    emoji: '🧘',
    goal: 'Meditate',
    label: 'Deep Meditation',
    description: 'Theta waves for inner stillness',
    duration: 30,
    carrier: 432,
    beat: 6,
    noiseType: 'pink',
    noiseVolume: 0.08,
    padEnabled: true,
    tier: 'free',
  },
  {
    id: 'creative-flow',
    emoji: '🎨',
    goal: 'Create',
    label: 'Creative Flow',
    description: 'Alpha-theta for open, generative thinking',
    duration: 30,
    carrier: 852,
    beat: 8,
    noiseType: 'pink',
    noiseVolume: 0.08,
    padEnabled: true,
    tier: 'pro',
  },
  {
    id: 'lucid-dream',
    emoji: '✨',
    goal: 'Dream',
    label: 'Lucid Dream',
    description: 'Theta-delta for hypnagogic states',
    duration: 45,
    carrier: 432,
    beat: 4,
    noiseType: 'brown',
    noiseVolume: 0.1,
    padEnabled: true,
    tier: 'pro',
  },
  {
    id: 'morning-energy',
    emoji: '☀️',
    goal: 'Energy',
    label: 'Morning Energy',
    description: 'Beta activation to start the day sharp',
    duration: 20,
    carrier: 417,
    beat: 18,
    noiseType: 'pink',
    noiseVolume: 0.08,
    padEnabled: false,
    tier: 'pro',
  },
  {
    id: 'stress-reset',
    emoji: '💆',
    goal: 'Reset',
    label: 'Stress Reset',
    description: 'Alpha waves to clear mental clutter',
    duration: 15,
    carrier: 396,
    beat: 10,
    noiseType: 'brown',
    noiseVolume: 0.12,
    padEnabled: true,
    tier: 'free',
  },
]
