// Aura Analyzer — image → frequency profile
// Non-destructive: pure data, no audio engine imports

export interface AuraProfile {
  dominantHue: number        // 0–360
  warmth: number             // 0–1 (0=cool/blue, 1=warm/red-orange)
  brightness: number         // 0–1
  saturation: number         // 0–1
  energy: number             // 0–1 (derived from contrast + saturation)
  carrier: number            // Hz
  beat: number               // Hz
  auraName: string           // e.g. "Indigo Theta"
  auraColor: string          // CSS color for the card
  auraGradient: string       // CSS gradient for card background
  description: string        // one-line description
  brainwaveState: string     // e.g. "Theta", "Alpha", "Beta"
  sessionPreset: {
    carrier: number
    beat: number
    soundscape: string
    label: string
  }
}

// Extract pixel data from image via canvas
export function analyzeImagePixels(img: HTMLImageElement): {
  avgR: number; avgG: number; avgB: number;
  avgH: number; avgS: number; avgL: number;
  brightness: number; contrast: number; warmth: number;
} {
  const canvas = document.createElement('canvas')
  const MAX = 100
  const scale = Math.min(MAX / img.width, MAX / img.height)
  canvas.width = Math.floor(img.width * scale)
  canvas.height = Math.floor(img.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data

  let rSum = 0, gSum = 0, bSum = 0
  let hSum = 0, sSum = 0, lSum = 0
  const count = data.length / 4

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255
    rSum += r; gSum += g; bSum += b

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    const d = max - min
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
    let h = 0
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6
      else if (max === g) h = (b - r) / d + 2
      else h = (r - g) / d + 4
      h = ((h * 60) + 360) % 360
    }
    hSum += h; sSum += s; lSum += l
  }

  const avgR = rSum / count
  const avgG = gSum / count
  const avgB = bSum / count
  const avgH = hSum / count
  const avgS = sSum / count
  const avgL = lSum / count

  // Warmth: warm = high red/yellow (H 0-60 or 300-360), cool = blue/green
  const warmth = avgR > avgB ? (avgR - avgB) * 0.5 + 0.5 : 0.5 - (avgB - avgR) * 0.5

  // Contrast: variance of luminance
  let lVar = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]/255, g = data[i+1]/255, b = data[i+2]/255
    const l = (Math.max(r,g,b) + Math.min(r,g,b)) / 2
    lVar += (l - avgL) ** 2
  }
  const contrast = Math.sqrt(lVar / count)

  return { avgR, avgG, avgB, avgH, avgS, avgL, brightness: avgL, contrast, warmth }
}

// Map pixel analysis → AuraProfile
export function buildAuraProfile(analysis: ReturnType<typeof analyzeImagePixels>): AuraProfile {
  const { avgH, avgS, brightness, warmth, contrast } = analysis

  // Energy = saturation * contrast * 2 (clamped)
  const energy = Math.min(avgS * contrast * 4, 1)

  // Beat frequency — maps energy + warmth to brainwave state
  let beat: number
  let brainwaveState: string
  if (energy < 0.2) {
    beat = warmth < 0.5 ? 2 : 5
    brainwaveState = warmth < 0.5 ? 'Delta' : 'Theta'
  } else if (energy < 0.4) {
    beat = 6 + warmth * 4
    brainwaveState = 'Theta'
  } else if (energy < 0.6) {
    beat = 8 + energy * 6
    brainwaveState = 'Alpha'
  } else if (energy < 0.8) {
    beat = 12 + warmth * 5
    brainwaveState = warmth > 0.5 ? 'Beta' : 'Low Beta'
  } else {
    beat = 18 + warmth * 12
    brainwaveState = 'High Beta'
  }
  beat = Math.round(beat * 10) / 10

  // Carrier — based on brightness (dark=deeper, bright=higher)
  const carrier = Math.round(100 + brightness * 300)

  // Aura name = color word + brainwave state
  const colorWord = hueToColorWord(avgH, avgS, brightness)
  const auraName = `${colorWord} ${brainwaveState}`

  // Aura colors
  const auraColor = `hsl(${Math.round(avgH)}, ${Math.round(avgS * 60 + 20)}%, ${Math.round(brightness * 40 + 30)}%)`
  const h2 = (avgH + 30) % 360
  const auraGradient = `linear-gradient(135deg, hsl(${Math.round(avgH)}, ${Math.round(avgS*60+20)}%, ${Math.round(brightness*30+20)}%), hsl(${Math.round(h2)}, ${Math.round(avgS*50+20)}%, ${Math.round(brightness*40+25)}%))`

  // Description
  const descriptions: Record<string, string> = {
    'Delta': 'Deep restorative energy. Your aura calls for stillness and regeneration.',
    'Theta': 'Creative and intuitive. Your aura is in a deeply meditative flow state.',
    'Alpha': 'Calm and centered. Your aura radiates peaceful awareness.',
    'Low Beta': 'Focused and clear. Your aura hums with quiet concentration.',
    'Beta': 'Alert and active. Your aura carries vibrant, directed energy.',
    'High Beta': 'Intense and dynamic. Your aura pulses with high-frequency drive.',
  }
  const description = descriptions[brainwaveState] ?? 'A unique frequency signature.'

  // Soundscape suggestion
  const soundscape = energy < 0.3
    ? warmth < 0.5 ? 'night-rain' : 'forest-night'
    : energy < 0.6
    ? warmth < 0.5 ? 'ocean-waves' : 'forest-stream'
    : 'mountain-wind'

  return {
    dominantHue: avgH,
    warmth,
    brightness,
    saturation: avgS,
    energy,
    carrier,
    beat,
    auraName,
    auraColor,
    auraGradient,
    description,
    brainwaveState,
    sessionPreset: {
      carrier,
      beat,
      soundscape,
      label: auraName,
    }
  }
}

function hueToColorWord(h: number, s: number, l: number): string {
  if (s < 0.1) return l < 0.3 ? 'Obsidian' : l < 0.6 ? 'Silver' : 'Pearl'
  if (h < 15 || h >= 345) return 'Crimson'
  if (h < 40) return 'Amber'
  if (h < 65) return 'Golden'
  if (h < 90) return 'Citrine'
  if (h < 150) return 'Emerald'
  if (h < 180) return 'Teal'
  if (h < 210) return 'Cyan'
  if (h < 255) return 'Indigo'
  if (h < 285) return 'Violet'
  if (h < 315) return 'Amethyst'
  return 'Rose'
}
