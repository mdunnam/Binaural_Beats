import { useEffect, useRef, useState } from 'react'

type VisualTabProps = {
  carrier: number
  beat: number
  isRunning: boolean
  analyser: AnalyserNode | null
}

function themeColors(theme: string): string[] {
  switch (theme) {
    case 'violet': return ['#9b59b6', '#d7aefb', '#e8d5ff']
    case 'gold':   return ['#c8960c', '#f4c430', '#fffacd']
    case 'void':   return ['#00ff88', '#00ccff', '#ff00ff']
    default:       return ['#3e8f72', '#5dba9a', '#a8e6cf']
  }
}

// ── Rings state (module-level so it survives re-renders) ─────────────────────
interface Ring { radius: number; opacity: number; age: number }
const ringsMap = new WeakMap<HTMLCanvasElement, Ring[]>()
const lastSpawnMap = new WeakMap<HTMLCanvasElement, number>()

function drawLissajous(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  carrier: number, beat: number,
  frame: number,
  amplitude: number,
  theme: string,
) {
  ctx.fillStyle = theme === 'void' ? 'rgba(0,0,0,0.08)' : 'rgba(245,250,247,0.15)'
  ctx.fillRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const radius = Math.min(w, h) * 0.38 * (1 + amplitude * 0.3)

  const a = beat
  const b = Math.max(1, Math.round(carrier / 100))
  const delta = (frame * 0.003) % (2 * Math.PI)

  const steps = 800
  const colors = themeColors(theme)

  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI * 4
    const x = cx + radius * Math.sin(a * t + delta)
    const y = cy + radius * Math.sin(b * t)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }

  const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy)
  grad.addColorStop(0, colors[0])
  grad.addColorStop(0.5, colors[1])
  grad.addColorStop(1, colors[2])
  ctx.strokeStyle = grad
  ctx.lineWidth = 1.5 + amplitude * 2
  ctx.shadowBlur = 8 + amplitude * 20
  ctx.shadowColor = colors[1]
  ctx.stroke()
  ctx.shadowBlur = 0
}

function drawPulse(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  beat: number,
  frame: number,
  theme: string,
  canvas: HTMLCanvasElement,
) {
  ctx.fillStyle = theme === 'void' ? 'rgba(0,0,0,0.08)' : 'rgba(245,250,247,0.15)'
  ctx.fillRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const maxR = Math.min(w, h) * 0.42
  const colors = themeColors(theme)
  const safeBeat = Math.max(0.1, beat)
  const beatPeriodFrames = Math.round(60 / safeBeat)

  if (!ringsMap.has(canvas)) ringsMap.set(canvas, [])
  if (!lastSpawnMap.has(canvas)) lastSpawnMap.set(canvas, -999)

  const rings = ringsMap.get(canvas)!
  const lastSpawn = lastSpawnMap.get(canvas)!

  if (frame - lastSpawn >= beatPeriodFrames) {
    rings.push({ radius: 0, opacity: 1, age: 0 })
    lastSpawnMap.set(canvas, frame)
  }

  const expandPerFrame = maxR / beatPeriodFrames

  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i]
    ring.radius += expandPerFrame
    ring.age += 1
    ring.opacity = Math.max(0, 1 - ring.age / beatPeriodFrames)

    if (ring.opacity <= 0 || ring.radius > maxR) {
      rings.splice(i, 1)
      continue
    }

    ctx.beginPath()
    ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2)
    ctx.globalAlpha = ring.opacity
    ctx.strokeStyle = colors[1]
    ctx.lineWidth = 1.5
    ctx.shadowBlur = 6
    ctx.shadowColor = colors[1]
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0

  // Center dot
  ctx.beginPath()
  ctx.arc(cx, cy, 8, 0, Math.PI * 2)
  ctx.fillStyle = colors[0]
  ctx.shadowBlur = 10
  ctx.shadowColor = colors[1]
  ctx.fill()
  ctx.shadowBlur = 0
}

function drawMandala(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  carrier: number, beat: number,
  frame: number,
  amplitude: number,
  theme: string,
) {
  void carrier
  ctx.fillStyle = theme === 'void' ? 'rgba(0,0,0,0.06)' : 'rgba(245,250,247,0.12)'
  ctx.fillRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const colors = themeColors(theme)
  const petals = Math.max(3, Math.round(beat))
  const rotation = frame * 0.005
  const baseRadius = Math.min(w, h) * 0.35

  for (let ring = 0; ring < 4; ring++) {
    const ringRadius = baseRadius * (0.3 + ring * 0.22) * (1 + amplitude * 0.15)
    const ringPhase = rotation * (ring % 2 === 0 ? 1 : -1) + (ring * Math.PI / petals)

    ctx.beginPath()
    for (let i = 0; i <= 360; i++) {
      const angle = (i / 360) * 2 * Math.PI + ringPhase
      const petalMod = 1 + 0.3 * Math.sin(petals * angle) + 0.1 * Math.sin(petals * 2 * angle + frame * 0.02)
      const r = ringRadius * petalMod
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()

    ctx.strokeStyle = colors[ring % colors.length]
    ctx.lineWidth = 1 + amplitude * 3
    ctx.globalAlpha = 0.6 - ring * 0.1
    ctx.shadowBlur = 6 + amplitude * 15
    ctx.shadowColor = colors[1]
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}

function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  analyser: AnalyserNode | null,
  theme: string,
) {
  ctx.fillStyle = theme === 'void' ? 'rgba(0,0,0,0.15)' : 'rgba(245,250,247,0.2)'
  ctx.fillRect(0, 0, w, h)
  if (!analyser) return

  const colors = themeColors(theme)
  const cx = w / 2, cy = h / 2
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(data)

  const bars = Math.min(128, data.length)
  const baseRadius = Math.min(w, h) * 0.2

  for (let i = 0; i < bars; i++) {
    const angle = (i / bars) * 2 * Math.PI - Math.PI / 2
    const barHeight = (data[i] / 255) * Math.min(w, h) * 0.3
    const x1 = cx + baseRadius * Math.cos(angle)
    const y1 = cy + baseRadius * Math.sin(angle)
    const x2 = cx + (baseRadius + barHeight) * Math.cos(angle)
    const y2 = cy + (baseRadius + barHeight) * Math.sin(angle)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = data[i] > 200 ? colors[2] : data[i] > 128 ? colors[1] : colors[0]
    ctx.lineWidth = (2 * Math.PI * baseRadius) / bars * 0.8
    ctx.stroke()
  }
}

export function VisualTab({ carrier, beat, isRunning, analyser }: VisualTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const [mode, setMode] = useState<'lissajous' | 'pulse' | 'mandala' | 'spectrum'>('lissajous')
  const [colorTheme, setColorTheme] = useState<'emerald' | 'violet' | 'gold' | 'void'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'void' : 'emerald'
  )
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // Reset pulse rings when mode/params change
    ringsMap.delete(canvas)
    lastSpawnMap.delete(canvas)

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    let frame = 0
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      frame++
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      let amplitude = 0
      if (analyser) {
        const data = new Uint8Array(analyser.fftSize)
        analyser.getByteTimeDomainData(data)
        amplitude = data.reduce((sum, v) => sum + Math.abs(v - 128), 0) / data.length / 128
      }

      if (mode === 'lissajous') drawLissajous(ctx, w, h, carrier, beat, frame, amplitude, colorTheme)
      else if (mode === 'pulse') drawPulse(ctx, w, h, beat, frame, colorTheme, canvas)
      else if (mode === 'mandala') drawMandala(ctx, w, h, carrier, beat, frame, amplitude, colorTheme)
      else drawSpectrum(ctx, w, h, analyser, colorTheme)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [mode, colorTheme, carrier, beat, analyser])

  return (
    <div className="visual-tab" style={{ position: 'relative' }}>
      <div className="visual-controls">
        <div className="seg-control">
          {(['lissajous', 'pulse', 'mandala', 'spectrum'] as const).map(m => (
            <button key={m} className={mode === m ? 'seg-btn seg-btn--active' : 'seg-btn'}
              onClick={() => setMode(m)}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className="seg-control">
          {(['emerald', 'violet', 'gold', 'void'] as const).map(t => (
            <button key={t} className={colorTheme === t ? 'seg-btn seg-btn--active' : 'seg-btn'}
              onClick={() => setColorTheme(t)}>
              {t}
            </button>
          ))}
        </div>
        <button className="soft-button" style={{ fontSize: '0.8rem' }} onClick={() => {
          const el = document.querySelector('.visual-canvas-wrap') as HTMLElement
          if (!isFullscreen) { el?.requestFullscreen?.(); setIsFullscreen(true) }
          else { document.exitFullscreen?.(); setIsFullscreen(false) }
        }}>
          {isFullscreen ? '⛶ Exit' : '⛶ Fullscreen'}
        </button>
      </div>

      {!isRunning && (
        <div className="visual-idle-msg">Start a session to see the visualization come alive</div>
      )}

      <div className="visual-canvas-wrap">
        <canvas ref={canvasRef} className="visual-canvas" />
      </div>

      <div className="visual-info-bar">
        <span>{carrier} Hz carrier</span>
        <span>·</span>
        <span>{beat} Hz beat</span>
      </div>
    </div>
  )
}
