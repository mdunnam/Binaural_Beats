import { useEffect, useRef } from 'react'

type Props = {
  analyser: AnalyserNode | null
  isRunning: boolean
  mini?: boolean
}

export function VuMeter({ analyser, isRunning, mini = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser || !isRunning) {
      cancelAnimationFrame(rafRef.current)
      const ctx = canvas?.getContext('2d')
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'var(--bg-section, #1a2420)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    function draw() {
      if (!canvas || !analyser) return
      analyser.getByteTimeDomainData(dataArray)

      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const sample = (dataArray[i] - 128) / 128
        sum += sample * sample
      }
      const rms = Math.sqrt(sum / dataArray.length)
      const db = 20 * Math.log10(rms + 0.00001)
      const normalized = Math.max(0, Math.min(1, (db + 60) / 60))

      const ctx = canvas.getContext('2d')!
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      ctx.fillStyle = '#1a2420'
      ctx.fillRect(0, 0, w, h)

      const barW = normalized * w
      const gradient = ctx.createLinearGradient(0, 0, w, 0)
      gradient.addColorStop(0, '#3e8f72')
      gradient.addColorStop(0.75, '#52c896')
      gradient.addColorStop(0.9, '#e8b84b')
      gradient.addColorStop(1, '#e05555')
      ctx.fillStyle = gradient
      ctx.fillRect(0, mini ? 0 : 2, barW, mini ? h : h - 4)

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyser, isRunning, mini])

  if (mini) {
    return (
      <canvas
        ref={canvasRef}
        className="vu-meter-mini"
        width={300}
        height={3}
        title="Output level"
      />
    )
  }

  return (
    <div className="vu-meter-wrap">
      <span className="vu-meter-label">OUTPUT</span>
      <canvas ref={canvasRef} className="vu-meter-canvas" width={200} height={14} />
    </div>
  )
}
