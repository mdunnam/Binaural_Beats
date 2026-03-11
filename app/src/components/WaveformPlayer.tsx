import { useEffect, useRef, useState, useCallback } from 'react'

interface WaveformPlayerProps {
  blob: Blob
  label?: string
  autoPlay?: boolean
  onEnded?: () => void
  className?: string
}

function fmtTime(secs: number): string {
  const s = Math.floor(secs)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

const NUM_BARS = 800

export function WaveformPlayer({ blob, label, autoPlay = false, onEnded, className }: WaveformPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const startedAtRef = useRef<number>(0)   // ctx.currentTime when play started
  const pausedAtRef = useRef<number>(0)    // seconds into buffer at pause
  const rafRef = useRef<number>(0)
  const peaksRef = useRef<Float32Array | null>(null)

  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)

  // Decode on mount
  useEffect(() => {
    let cancelled = false
    const ctx = new AudioContext()
    audioCtxRef.current = ctx

    blob.arrayBuffer().then((buf) => {
      if (cancelled) return
      return ctx.decodeAudioData(buf)
    }).then((audioBuffer) => {
      if (cancelled || !audioBuffer) return
      audioBufferRef.current = audioBuffer
      setDuration(audioBuffer.duration)

      // Downsample to NUM_BARS peaks
      const channelData = audioBuffer.getChannelData(0)
      const blockSize = Math.floor(channelData.length / NUM_BARS)
      const peaks = new Float32Array(NUM_BARS)
      for (let i = 0; i < NUM_BARS; i++) {
        let peak = 0
        const start = i * blockSize
        for (let j = 0; j < blockSize; j++) {
          const v = Math.abs(channelData[start + j])
          if (v > peak) peak = v
        }
        peaks[i] = peak
      }
      peaksRef.current = peaks
      setReady(true)

      if (autoPlay) {
        // slight delay so component is mounted
        setTimeout(() => startPlayback(), 50)
      }
    }).catch(console.error)

    return () => {
      cancelled = true
      stopPlayback()
      ctx.close().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob])

  const drawWaveform = useCallback((pos: number) => {
    const canvas = canvasRef.current
    const peaks = peaksRef.current
    if (!canvas || !peaks) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    const barW = W / NUM_BARS
    const playedFrac = duration > 0 ? pos / duration : 0
    const playedBars = Math.floor(playedFrac * NUM_BARS)

    ctx.clearRect(0, 0, W, H)
    for (let i = 0; i < NUM_BARS; i++) {
      const barH = Math.max(2, peaks[i] * H)
      const x = i * barW
      const y = (H - barH) / 2
      ctx.fillStyle = i < playedBars ? '#3e8f72' : '#b0ccc4'
      ctx.fillRect(x, y, Math.max(1, barW - 1), barH)
    }
  }, [duration])

  // Animation loop
  useEffect(() => {
    if (!ready) return
    const loop = () => {
      const ctx = audioCtxRef.current
      let pos = pausedAtRef.current
      if (playing && ctx) {
        pos = ctx.currentTime - startedAtRef.current + pausedAtRef.current
        if (pos < 0) pos = 0
        setCurrentTime(pos)
      }
      drawWaveform(pos)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [ready, playing, drawWaveform])

  // ResizeObserver for canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width
        canvas.height = 64
      }
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  function stopPlayback() {
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch {}
      sourceRef.current = null
    }
  }

  function startPlayback(fromPos?: number) {
    const ctx = audioCtxRef.current
    const buffer = audioBufferRef.current
    if (!ctx || !buffer) return

    if (ctx.state === 'suspended') ctx.resume().catch(() => {})

    stopPlayback()
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(ctx.destination)
    const offset = fromPos !== undefined ? fromPos : pausedAtRef.current
    src.start(0, offset)
    startedAtRef.current = ctx.currentTime - offset
    pausedAtRef.current = offset
    sourceRef.current = src
    setPlaying(true)

    src.onended = () => {
      const ctx2 = audioCtxRef.current
      if (!ctx2) return
      // Only treat as natural end if we're still "playing" (not a stop() call)
      if (sourceRef.current === src) {
        sourceRef.current = null
        pausedAtRef.current = 0
        setCurrentTime(0)
        setPlaying(false)
        onEnded?.()
      }
    }
  }

  function pause() {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const pos = ctx.currentTime - startedAtRef.current + pausedAtRef.current
    pausedAtRef.current = Math.max(0, Math.min(pos, duration))
    stopPlayback()
    setPlaying(false)
    setCurrentTime(pausedAtRef.current)
  }

  const handlePlayPause = () => {
    if (playing) {
      pause()
    } else {
      startPlayback()
    }
  }

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    const wasPlaying = playing
    if (playing) {
      // stop without updating pausedAt via onended
      const ctx = audioCtxRef.current
      if (ctx) {
        const pos2 = ctx.currentTime - startedAtRef.current + pausedAtRef.current
        pausedAtRef.current = pos2
      }
      stopPlayback()
      setPlaying(false)
    }
    pausedAtRef.current = val
    setCurrentTime(val)
    drawWaveform(val)
    if (wasPlaying) {
      startPlayback(val)
    }
  }

  return (
    <div className={`waveform-player${className ? ' ' + className : ''}`}>
      {label && <div className="waveform-label">{label}</div>}
      <div className="waveform-canvas-wrap" ref={wrapRef}>
        <canvas className="waveform-canvas" ref={canvasRef} height={64} />
      </div>
      <input
        className="waveform-scrubber"
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={currentTime}
        onChange={handleScrub}
        disabled={!ready}
      />
      <div className="waveform-controls">
        <button className="waveform-play-btn" onClick={handlePlayPause} disabled={!ready} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <span className="waveform-time">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
      </div>
    </div>
  )
}
