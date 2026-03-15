import { useEffect, useRef } from 'react'

export type VisualMode = 'lissajous' | 'pulse' | 'mandala'

type Props = {
  carrier: number    // Hz
  beat: number       // Hz
  phase: number      // degrees 0-360
  isRunning: boolean
  mode: VisualMode
}

// ── Rings state (module-level so it survives re-renders) ─────────────────────
interface Ring { radius: number; opacity: number; age: number }
const ringsMap = new WeakMap<HTMLCanvasElement, Ring[]>()
const lastSpawnMap = new WeakMap<HTMLCanvasElement, number>()

// ── Draw helpers ─────────────────────────────────────────────────────────────

function drawLissajous(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  carrier: number,
  beat: number,
  phaseDeg: number,
): void {
  const TWO_PI = Math.PI * 2
  const phaseRad = (phaseDeg * Math.PI) / 180
  const freqRatio = carrier > 0 ? (carrier + beat) / carrier : 1
  const rotation = t * 0.05
  const N = 2000

  // Build gradient along the path
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)

  const grad = ctx.createLinearGradient(-r, -r, r, r)
  grad.addColorStop(0, '#52c896')
  grad.addColorStop(1, '#3e8f72')

  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const px = r * Math.sin(freqRatio * u * TWO_PI + phaseRad)
    const py = r * Math.sin(u * TWO_PI)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.strokeStyle = grad
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

function drawPulse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  maxR: number,
  t: number,
  beat: number,
  canvas: HTMLCanvasElement,
): void {
  const safeBeat = Math.max(0.1, beat)
  const beatPeriod = 1 / safeBeat
  const maxAge = beatPeriod * 60 // frames until ring expires

  if (!ringsMap.has(canvas)) ringsMap.set(canvas, [])
  if (!lastSpawnMap.has(canvas)) lastSpawnMap.set(canvas, -999)

  const rings = ringsMap.get(canvas)!
  const lastSpawn = lastSpawnMap.get(canvas)!

  // Spawn a new ring every beat period (in seconds)
  if (t - lastSpawn >= beatPeriod) {
    rings.push({ radius: 0, opacity: 1, age: 0 })
    lastSpawnMap.set(canvas, t)
  }

  const expandPerFrame = maxR / (beatPeriod * 60)

  // Update and draw rings
  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i]
    ring.radius += expandPerFrame
    ring.age += 1
    ring.opacity = Math.max(0, 1 - ring.age / maxAge)

    if (ring.opacity <= 0 || ring.radius > maxR) {
      rings.splice(i, 1)
      continue
    }

    ctx.beginPath()
    ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(82, 200, 150, ${ring.opacity})`
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  // Static center dot
  ctx.beginPath()
  ctx.arc(cx, cy, 8, 0, Math.PI * 2)
  ctx.fillStyle = '#52c896'
  ctx.fill()
}

function drawMandala(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  beat: number,
  _carrier: number,
): void {
  const N = 12
  const TWO_PI = Math.PI * 2
  const rotation = t * 0.08
  const pulse = 1 + 0.15 * Math.sin(t * beat * TWO_PI)
  const baseA = r * 0.22 * pulse  // half-length of petal along radial axis
  const baseB = r * 0.08 * pulse  // half-width of petal

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)

  for (let i = 0; i < N; i++) {
    const angle = (i / N) * TWO_PI
    ctx.save()
    ctx.rotate(angle)
    ctx.translate(r * 0.5, 0) // move out from center

    ctx.beginPath()
    ctx.ellipse(0, 0, baseA, baseB, 0, 0, TWO_PI)
    ctx.fillStyle = 'rgba(82, 200, 150, 0.18)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(82, 200, 150, 0.85)'
    ctx.lineWidth = 1.2
    ctx.stroke()

    ctx.restore()
  }

  // Inner ring
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.12, 0, TWO_PI)
  ctx.strokeStyle = 'rgba(82, 200, 150, 0.5)'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.restore()
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VisualResonance({ carrier, beat, phase, isRunning, mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const tRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // Reset rings state when effect re-runs (params changed)
    ringsMap.delete(canvas)
    lastSpawnMap.delete(canvas)
    tRef.current = 0

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    function draw() {
      if (!canvas) return
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const cx = w / 2
      const cy = h / 2
      const dt = 1 / 60
      tRef.current += dt

      ctx.clearRect(0, 0, w, h)

      if (mode === 'lissajous') {
        drawLissajous(ctx, cx, cy, Math.min(w, h) * 0.42, tRef.current, carrier, beat, phase)
      } else if (mode === 'pulse') {
        drawPulse(ctx, cx, cy, Math.min(w, h) * 0.42, tRef.current, beat, canvas)
      } else {
        drawMandala(ctx, cx, cy, Math.min(w, h) * 0.38, tRef.current, beat, carrier)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    if (isRunning) {
      rafRef.current = requestAnimationFrame(draw)
    } else {
      // Draw static preview when not running
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)
      if (mode === 'lissajous') {
        drawLissajous(ctx, w / 2, h / 2, Math.min(w, h) * 0.42, 0, carrier, beat, phase)
      } else if (mode === 'pulse') {
        // Static: just center dot
        ctx.beginPath()
        ctx.arc(w / 2, h / 2, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#52c896'
        ctx.fill()
      } else {
        drawMandala(ctx, w / 2, h / 2, Math.min(w, h) * 0.38, 0, beat, carrier)
      }
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [carrier, beat, phase, isRunning, mode])

  return <canvas ref={canvasRef} className="visual-resonance-canvas" />
}
