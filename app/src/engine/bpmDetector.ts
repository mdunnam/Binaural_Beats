/**
 * Auto BPM detection using windowed RMS onset strength + autocorrelation.
 *
 * Algorithm:
 *   1. Mix to mono
 *   2. Analyse first 90 s max (enough for accurate tempo, fast enough to run synchronously)
 *   3. Windowed RMS energy (23 ms window, 11.6 ms hop)
 *   4. Onset strength = positive RMS deltas
 *   5. Autocorrelation over lag range corresponding to 50–200 BPM
 *   6. Peak lag → period → BPM
 *   7. Octave-fold into 70–160 BPM range
 *
 * Runs in < 200 ms for a 90 s clip on a modern device.
 */
export function detectBpm(buffer: AudioBuffer): number | null {
  const sampleRate = buffer.sampleRate
  const maxSamples = Math.min(buffer.length, Math.round(sampleRate * 90))

  // ── Mix to mono ──────────────────────────────────────────────────────────
  const mono = new Float32Array(maxSamples)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < maxSamples; i++) {
      mono[i] += data[i] / buffer.numberOfChannels
    }
  }

  // ── Windowed RMS ─────────────────────────────────────────────────────────
  const winSamples = Math.round(sampleRate * 0.023)   // 23 ms window
  const hopSamples = Math.round(sampleRate * 0.0116)  // 11.6 ms hop
  const numFrames  = Math.floor((maxSamples - winSamples) / hopSamples)
  if (numFrames < 10) return null

  const rms = new Float32Array(numFrames)
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSamples
    let sum = 0
    for (let j = start; j < start + winSamples; j++) {
      sum += mono[j] * mono[j]
    }
    rms[i] = Math.sqrt(sum / winSamples)
  }

  // ── Onset strength (positive RMS flux) ───────────────────────────────────
  const onset = new Float32Array(numFrames)
  for (let i = 1; i < numFrames; i++) {
    onset[i] = Math.max(0, rms[i] - rms[i - 1])
  }

  // ── Autocorrelation over 50–200 BPM lag range ────────────────────────────
  const hopSec  = hopSamples / sampleRate
  const minLag  = Math.max(1, Math.round(60 / 200 / hopSec))  // 200 BPM
  const maxLag  = Math.round(60 / 50 / hopSec)                // 50 BPM

  let bestLag  = minLag
  let bestCorr = -Infinity

  for (let lag = minLag; lag <= maxLag; lag++) {
    const count = numFrames - lag
    if (count <= 0) break
    let corr = 0
    for (let i = 0; i < count; i++) {
      corr += onset[i] * onset[i + lag]
    }
    corr /= count
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag  = lag
    }
  }

  if (bestCorr <= 0) return null

  // ── Convert lag → BPM, octave-fold into 70–160 range ────────────────────
  let bpm = 60 / (bestLag * hopSec)
  while (bpm > 160) bpm /= 2
  while (bpm < 70)  bpm *= 2

  return Math.round(bpm)
}
