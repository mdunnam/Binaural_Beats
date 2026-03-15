import { useEffect, useRef } from 'react'

type AudioVisualizerProps = {
  analyser: AnalyserNode | null
  isRunning: boolean
  ambientRunning: boolean
  beat: number
  carrier: number
}

function getBrainwaveColor(beat: number): string {
  if (beat < 4) return '#7b68ee'
  if (beat < 8) return '#5b9bd5'
  if (beat < 14) return '#3e8f72'
  if (beat < 30) return '#e8b84b'
  return '#e05a3a'
}

function getBrainwaveBrightColor(beat: number): string {
  if (beat < 4) return '#a090ff'
  if (beat < 8) return '#7fc0ff'
  if (beat < 14) return '#52c896'
  if (beat < 30) return '#ffd070'
  return '#ff7a5a'
}

export function AudioVisualizer({ analyser, isRunning, ambientRunning, beat, carrier }: AudioVisualizerProps) {
  const levelRef = useRef<HTMLCanvasElement>(null)
  const spectrumRef = useRef<HTMLCanvasElement>(null)
  const scopeRef = useRef<HTMLCanvasElement>(null)
  const specWrapRef = useRef<HTMLDivElement>(null)
  const scopeWrapRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const peaksRef = useRef<Float32Array>(new Float32Array(64).fill(0))
  const peakHoldRef = useRef<Float32Array>(new Float32Array(64).fill(0))
  const clipTimeRef = useRef<number>(0)

  useEffect(() => {
    const levelCanvas = levelRef.current
    const specCanvas = spectrumRef.current
    const scopeCanvas = scopeRef.current
    if (!levelCanvas || !specCanvas || !scopeCanvas) return

    const H = 36 // canvas height matching CSS

    // Init canvas widths from actual DOM
    if (specWrapRef.current) specCanvas.width = specWrapRef.current.offsetWidth || 300
    if (scopeWrapRef.current) scopeCanvas.width = scopeWrapRef.current.offsetWidth || 140

    // ResizeObserver for both resizable canvases
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width)
        if (w <= 0) continue
        if (entry.target === specWrapRef.current) specCanvas.width = w
        if (entry.target === scopeWrapRef.current) scopeCanvas.width = w
      }
    })
    if (specWrapRef.current) ro.observe(specWrapRef.current)
    if (scopeWrapRef.current) ro.observe(scopeWrapRef.current)

    cancelAnimationFrame(rafRef.current)

    const active = isRunning || ambientRunning
    const color = getBrainwaveColor(beat)
    const brightColor = getBrainwaveBrightColor(beat)

    const getTheme = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      return {
        bg: isDark ? '#0d1a14' : '#f0f7f3',
        idleLine: isDark ? '#1e3a2a' : '#c8ddd5',
      }
    }

    if (!analyser || !active) {
      const { bg, idleLine } = getTheme()
      // Level
      const lCtx = levelCanvas.getContext('2d')!
      lCtx.fillStyle = bg
      lCtx.fillRect(0, 0, 24, H)
      // Spectrum
      const sCtx = specCanvas.getContext('2d')!
      sCtx.fillStyle = bg
      sCtx.fillRect(0, 0, specCanvas.width, H)
      // Scope — flat dim line
      const oCtx = scopeCanvas.getContext('2d')!
      oCtx.fillStyle = bg
      oCtx.fillRect(0, 0, scopeCanvas.width, H)
      oCtx.strokeStyle = idleLine
      oCtx.lineWidth = 1.5
      oCtx.beginPath()
      oCtx.moveTo(0, H / 2)
      oCtx.lineTo(scopeCanvas.width, H / 2)
      oCtx.stroke()
      return () => ro.disconnect()
    }

    const freqData = new Uint8Array(analyser.frequencyBinCount)
    const timeData = new Uint8Array(analyser.fftSize)
    const sampleRate = analyser.context.sampleRate
    const NUM_BARS = 64

    const draw = () => {
      analyser.getByteFrequencyData(freqData)
      analyser.getByteTimeDomainData(timeData)

      const now = performance.now()
      const { bg } = getTheme()

      // ── Zone 1: Level Meter (vertical, fills upward) ──
      const lCtx = levelCanvas.getContext('2d')!
      lCtx.fillStyle = bg
      lCtx.fillRect(0, 0, 24, H)

      let sum = 0
      for (let i = 0; i < timeData.length; i++) {
        const s = (timeData[i] - 128) / 128
        sum += s * s
      }
      const rms = Math.sqrt(sum / timeData.length)
      const db = 20 * Math.log10(rms + 0.00001)
      const level = Math.max(0, Math.min(1, (db + 60) / 60))

      const barH = level * H
      const gradient = lCtx.createLinearGradient(0, H, 0, 0)
      gradient.addColorStop(0, '#3e8f72')
      gradient.addColorStop(0.6, '#e8b84b')
      gradient.addColorStop(1, '#e05a3a')
      lCtx.fillStyle = gradient
      lCtx.fillRect(0, H - barH, 24, barH)

      if (level > 0.9) clipTimeRef.current = now
      const clipAge = now - clipTimeRef.current
      if (clipAge < 500) {
        const alpha = clipAge < 200 ? 1 : 1 - (clipAge - 200) / 300
        lCtx.fillStyle = `rgba(224, 90, 58, ${alpha})`
        lCtx.fillRect(0, 0, 24, 4)
      }

      // ── Zone 2: Spectrum Analyzer ──
      const sCtx = specCanvas.getContext('2d')!
      const W = specCanvas.width
      sCtx.fillStyle = bg
      sCtx.fillRect(0, 0, W, H)

      const binCount = analyser.frequencyBinCount
      const barsPerGroup = Math.floor(binCount / NUM_BARS)
      const barW = W / NUM_BARS
      const gap = 0.5

      const hzPerBin = sampleRate / analyser.fftSize
      const carrierBin = Math.round(carrier / hzPerBin)
      const carrierBar = Math.round(carrierBin / barsPerGroup)

      for (let i = 0; i < NUM_BARS; i++) {
        let total = 0
        for (let j = 0; j < barsPerGroup; j++) {
          total += freqData[i * barsPerGroup + j]
        }
        const avg = total / barsPerGroup / 255
        const h = avg * H

        sCtx.fillStyle = color
        sCtx.fillRect(i * barW, H - h, barW - gap, h)

        if (avg > peaksRef.current[i]) {
          peaksRef.current[i] = avg
          peakHoldRef.current[i] = now
        } else if (now - peakHoldRef.current[i] > 600) {
          peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 0.008)
        }

        const peakY = H - peaksRef.current[i] * H
        sCtx.fillStyle = brightColor
        sCtx.fillRect(i * barW, Math.max(0, peakY - 2), barW - gap, 2)
      }

      if (carrierBar >= 0 && carrierBar < NUM_BARS) {
        const cx = carrierBar * barW + (barW - gap) / 2
        sCtx.strokeStyle = '#ffffff88'
        sCtx.lineWidth = 1
        sCtx.beginPath()
        sCtx.moveTo(cx, 0)
        sCtx.lineTo(cx, H)
        sCtx.stroke()
      }

      // ── Zone 3: Oscilloscope ──
      const oCtx = scopeCanvas.getContext('2d')!
      const SW = scopeCanvas.width
      oCtx.fillStyle = bg
      oCtx.fillRect(0, 0, SW, H)

      oCtx.strokeStyle = brightColor
      oCtx.lineWidth = 1.5
      oCtx.beginPath()
      const mid = H / 2
      const amp = mid - 2
      const sliceW = SW / timeData.length
      for (let i = 0; i < timeData.length; i++) {
        const v = (timeData[i] / 128) - 1
        const y = mid + v * amp * 3  // 3x boost so quiet signals are visible
        if (i === 0) oCtx.moveTo(0, y)
        else oCtx.lineTo(i * sliceW, y)
      }
      oCtx.stroke()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [analyser, isRunning, ambientRunning, beat, carrier])

  return (
    <div className="audio-viz-strip">
      <canvas ref={levelRef} className="audio-viz-level" width={24} height={36} />
      <div className="audio-viz-spectrum-wrap" ref={specWrapRef}>
        <canvas ref={spectrumRef} className="audio-viz-spectrum" width={300} height={36} />
      </div>
      <div className="audio-viz-scope-wrap" ref={scopeWrapRef}>
        <canvas ref={scopeRef} className="audio-viz-scope" width={140} height={36} />
      </div>
    </div>
  )
}
