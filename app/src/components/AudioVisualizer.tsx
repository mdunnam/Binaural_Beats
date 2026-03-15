import { useEffect, useRef } from 'react'

type AudioVisualizerProps = {
  analyser: AnalyserNode | null
  isRunning: boolean
  ambientRunning: boolean
  beat: number
  carrier: number
}

function getBrainwaveColor(beat: number): string {
  if (beat < 4) return '#7b68ee'   // Delta — purple
  if (beat < 8) return '#5b9bd5'   // Theta — blue
  if (beat < 14) return '#3e8f72'  // Alpha — green
  if (beat < 30) return '#e8b84b'  // Beta — amber
  return '#e05a3a'                 // Gamma — red
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
  const specWidthRef = useRef(220)
  const rafRef = useRef<number>(0)
  const peaksRef = useRef<Float32Array>(new Float32Array(32).fill(0))
  const peakHoldRef = useRef<Float32Array>(new Float32Array(32).fill(0))
  const clipTimeRef = useRef<number>(0)

  useEffect(() => {
    const levelCanvas = levelRef.current
    const specCanvas = spectrumRef.current
    const scopeCanvas = scopeRef.current
    if (!levelCanvas || !specCanvas || !scopeCanvas) return

    // Set initial spectrum canvas width to actual rendered width
    if (specWrapRef.current) {
      specCanvas.width = specWrapRef.current.offsetWidth || 220
      specWidthRef.current = specCanvas.width
    }

    // ResizeObserver to keep spectrum canvas sharp at any width
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width)
        if (w > 0) {
          specCanvas.width = w
          specWidthRef.current = w
        }
      }
    })
    if (specWrapRef.current) {
      resizeObserver.observe(specWrapRef.current)
    }

    cancelAnimationFrame(rafRef.current)

    const active = isRunning || ambientRunning
    const color = getBrainwaveColor(beat)
    const brightColor = getBrainwaveBrightColor(beat)

    if (!analyser || !active) {
      // Draw idle state
      const drawIdle = () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
        const bgColor = isDark ? '#0d1a14' : '#f0f7f3'
        const idleLineColor = isDark ? '#1e3a2a' : '#c8ddd5'

        // Level
        const lCtx = levelCanvas.getContext('2d')!
        lCtx.fillStyle = bgColor
        lCtx.fillRect(0, 0, 14, 40)

        // Spectrum
        const sCtx = specCanvas.getContext('2d')!
        const W = specCanvas.width
        sCtx.fillStyle = bgColor
        sCtx.fillRect(0, 0, W, 40)

        // Scope — flat dim line
        const oCtx = scopeCanvas.getContext('2d')!
        oCtx.fillStyle = bgColor
        oCtx.fillRect(0, 0, 110, 40)
        oCtx.strokeStyle = idleLineColor
        oCtx.lineWidth = 1.5
        oCtx.beginPath()
        oCtx.moveTo(0, 20)
        oCtx.lineTo(110, 20)
        oCtx.stroke()
      }
      drawIdle()
      return () => resizeObserver.disconnect()
    }

    const fftSize = analyser.fftSize
    const freqData = new Uint8Array(analyser.frequencyBinCount)
    const timeData = new Uint8Array(fftSize)
    const sampleRate = analyser.context.sampleRate
    const NUM_BARS = 32

    const draw = () => {
      analyser.getByteFrequencyData(freqData)
      analyser.getByteTimeDomainData(timeData)

      const now = performance.now()
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      const bgColor = isDark ? '#0d1a14' : '#f0f7f3'

      // ── Zone 1: Level Meter ──
      const lCtx = levelCanvas.getContext('2d')!
      lCtx.fillStyle = bgColor
      lCtx.fillRect(0, 0, 14, 40)

      // RMS from time domain
      let sum = 0
      for (let i = 0; i < timeData.length; i++) {
        const s = (timeData[i] - 128) / 128
        sum += s * s
      }
      const rms = Math.sqrt(sum / timeData.length)
      const db = 20 * Math.log10(rms + 0.00001)
      const level = Math.max(0, Math.min(1, (db + 60) / 60))

      const barH = level * 40
      const gradient = lCtx.createLinearGradient(0, 40, 0, 0)
      gradient.addColorStop(0, '#3e8f72')
      gradient.addColorStop(0.6, '#e8b84b')
      gradient.addColorStop(1, '#e05a3a')
      lCtx.fillStyle = gradient
      lCtx.fillRect(0, 40 - barH, 14, barH)

      // Clip flash
      if (level > 0.9) clipTimeRef.current = now
      const clipAge = now - clipTimeRef.current
      if (clipAge < 500) {
        const alpha = clipAge < 200 ? 1 : 1 - (clipAge - 200) / 300
        lCtx.fillStyle = `rgba(224, 90, 58, ${alpha})`
        lCtx.fillRect(0, 0, 14, 4)
      }

      // ── Zone 2: Spectrum Analyzer ──
      const sCtx = specCanvas.getContext('2d')!
      const W = specCanvas.width
      sCtx.fillStyle = bgColor
      sCtx.fillRect(0, 0, W, 40)

      const binCount = analyser.frequencyBinCount
      const barsPerGroup = Math.floor(binCount / NUM_BARS)
      const barW = Math.floor(W / NUM_BARS)
      const gap = 1

      // Carrier marker bar index
      const hzPerBin = sampleRate / analyser.fftSize
      const carrierBin = Math.round(carrier / hzPerBin)
      const carrierBar = Math.round(carrierBin / barsPerGroup)

      for (let i = 0; i < NUM_BARS; i++) {
        let total = 0
        for (let j = 0; j < barsPerGroup; j++) {
          total += freqData[i * barsPerGroup + j]
        }
        const avg = total / barsPerGroup / 255
        const h = avg * 40

        sCtx.fillStyle = color
        sCtx.fillRect(i * barW, 40 - h, barW - gap, h)

        // Peak decay
        if (avg > peaksRef.current[i]) {
          peaksRef.current[i] = avg
          peakHoldRef.current[i] = now
        } else {
          const holdAge = now - peakHoldRef.current[i]
          if (holdAge > 600) {
            peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 0.008)
          }
        }

        // Draw peak dot
        const peakY = 40 - peaksRef.current[i] * 40
        sCtx.fillStyle = brightColor
        sCtx.fillRect(i * barW, Math.max(0, peakY - 2), barW - gap, 2)
      }

      // Carrier marker — bright vertical line
      if (carrierBar >= 0 && carrierBar < NUM_BARS) {
        const cx = carrierBar * barW + Math.floor((barW - gap) / 2)
        sCtx.strokeStyle = '#ffffff88'
        sCtx.lineWidth = 1
        sCtx.beginPath()
        sCtx.moveTo(cx, 0)
        sCtx.lineTo(cx, 40)
        sCtx.stroke()
      }

      // ── Zone 3: Oscilloscope ──
      const oCtx = scopeCanvas.getContext('2d')!
      oCtx.fillStyle = bgColor
      oCtx.fillRect(0, 0, 110, 40)

      oCtx.strokeStyle = brightColor
      oCtx.lineWidth = 1.5
      oCtx.beginPath()
      const sliceW = 110 / timeData.length
      for (let i = 0; i < timeData.length; i++) {
        const v = (timeData[i] / 128) - 1
        const y = (v * 18) + 20
        if (i === 0) oCtx.moveTo(0, y)
        else oCtx.lineTo(i * sliceW, y)
      }
      oCtx.stroke()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      resizeObserver.disconnect()
    }
  }, [analyser, isRunning, ambientRunning, beat, carrier])

  return (
    <div className="audio-viz-strip">
      <canvas ref={levelRef} className="audio-viz-level" width={14} height={40} />
      <div className="audio-viz-spectrum-wrap" ref={specWrapRef}>
        <canvas ref={spectrumRef} className="audio-viz-spectrum" width={220} height={40} />
      </div>
      <div className="audio-viz-scope-wrap">
        <canvas ref={scopeRef} className="audio-viz-scope" width={110} height={40} />
      </div>
    </div>
  )
}
