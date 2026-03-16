import { useEffect, useState, useRef } from 'react'

type Pattern = {
  name: string
  label: string
  steps: { phase: 'inhale' | 'hold' | 'exhale' | 'hold2'; seconds: number }[]
}

const PATTERNS: Pattern[] = [
  {
    name: '4-7-8',
    label: '4-7-8 Relaxing',
    steps: [
      { phase: 'inhale', seconds: 4 },
      { phase: 'hold',   seconds: 7 },
      { phase: 'exhale', seconds: 8 },
    ],
  },
  {
    name: 'box',
    label: 'Box (4-4-4-4)',
    steps: [
      { phase: 'inhale', seconds: 4 },
      { phase: 'hold',   seconds: 4 },
      { phase: 'exhale', seconds: 4 },
      { phase: 'hold2',  seconds: 4 },
    ],
  },
  {
    name: 'coherent',
    label: 'Coherent (5.5)',
    steps: [
      { phase: 'inhale', seconds: 5.5 },
      { phase: 'exhale', seconds: 5.5 },
    ],
  },
  {
    name: 'slow',
    label: 'Slow (5-5)',
    steps: [
      { phase: 'inhale', seconds: 5 },
      { phase: 'exhale', seconds: 5 },
    ],
  },
]

function createBreathSound(ctx: AudioContext, phase: 'inhale' | 'exhale', durationSec: number): void {
  const bufferSize = Math.floor(ctx.sampleRate * durationSec)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = phase === 'inhale' ? 1800 : 1200
  filter.Q.value = 0.8

  const gainNode = ctx.createGain()
  gainNode.gain.setValueAtTime(0, ctx.currentTime)
  if (phase === 'inhale') {
    gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + durationSec * 0.6)
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec)
  } else {
    gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + durationSec * 0.2)
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec)
  }

  source.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)
  source.start(ctx.currentTime)
  source.stop(ctx.currentTime + durationSec)
}

type Props = { isRunning: boolean }

export function BreathGuide({ isRunning: _isRunning }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [isGuideActive, setIsGuideActive] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [patternName, setPatternName] = useState('box')
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'hold2'>('inhale')
  const [progress, setProgress] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevPhaseRef = useRef<string>('')

  const isActive = isGuideActive

  // Run breathing cycle
  useEffect(() => {
    if (!enabled || !isActive) {
      if (timerRef.current) clearInterval(timerRef.current)
      setPhase('inhale')
      setProgress(0)
      setCountdown(0)
      prevPhaseRef.current = ''
      return
    }

    const pattern = PATTERNS.find(p => p.name === patternName) ?? PATTERNS[1]
    let stepIdx = 0
    let elapsed = 0
    const TICK = 50

    timerRef.current = window.setInterval(() => {
      const step = pattern.steps[stepIdx]
      elapsed += TICK / 1000
      const prog = Math.min(elapsed / step.seconds, 1)
      setPhase(step.phase)
      setProgress(prog)
      setCountdown(Math.ceil(step.seconds - elapsed))

      if (elapsed >= step.seconds) {
        elapsed = 0
        stepIdx = (stepIdx + 1) % pattern.steps.length
      }
    }, TICK)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [enabled, isActive, patternName])

  // Play sound on phase change
  useEffect(() => {
    if (!soundEnabled || !enabled || !isActive) return
    if (phase === prevPhaseRef.current) return
    prevPhaseRef.current = phase

    if (phase === 'inhale' || phase === 'exhale') {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext()
      }
      const pattern = PATTERNS.find(p => p.name === patternName) ?? PATTERNS[1]
      const step = pattern.steps.find(s => s.phase === phase)
      if (step) createBreathSound(audioCtxRef.current, phase, step.seconds)
    }
  }, [phase, soundEnabled, enabled, patternName])

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => { audioCtxRef.current?.close() }
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const PHASE_LABELS: Record<string, string> = {
    inhale: 'Inhale',
    hold: 'Hold',
    exhale: 'Exhale',
    hold2: 'Hold',
  }

  const ringScale = phase === 'inhale' ? 0.5 + progress * 0.5
    : phase === 'hold' ? 1
    : phase === 'exhale' ? 1 - progress * 0.5
    : 0.5

  return (
    <div className="breath-guide-wrap">
      <div className="breath-guide-header">
        <span className="section-label">BREATH GUIDE</span>
        <div className="breath-guide-controls">
          <button
            className={`soft-button${enabled ? ' soft-button--accent' : ''}`}
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
            onClick={() => {
              setEnabled(e => !e)
              if (enabled) setIsGuideActive(false)
            }}
          >
            {enabled ? 'On' : 'Off'}
          </button>
          <button
            className={`breath-sound-btn${soundEnabled ? ' breath-sound-btn--active' : ''}`}
            onClick={() => setSoundEnabled(s => !s)}
            title={soundEnabled ? 'Mute breath sounds' : 'Enable breath sounds'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            className="breath-fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
        </div>
      </div>

      {enabled && (
        <>
          {/* Pattern selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
            {PATTERNS.map(p => (
              <button
                key={p.name}
                className={`soft-button${patternName === p.name ? ' soft-button--accent' : ''}`}
                style={{ padding: '0.2rem 0.55rem', fontSize: '0.78rem' }}
                onClick={() => setPatternName(p.name)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Visual ring */}
          {isActive ? (
            <div
              className={`breath-ring-container${isFullscreen ? ' breath-ring-container--fullscreen' : ''}`}
              ref={containerRef}
            >
              <div className="breath-ring-inner">
                <div
                  className={`breath-ring breath-ring--${phase}`}
                  style={{ transform: `scale(${ringScale})` }}
                />
                <div className="breath-ring-label">
                  <span className="breath-phase-text">{PHASE_LABELS[phase]}</span>
                  <span className="breath-countdown">{countdown}</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={containerRef}
              style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <p className="control-hint" style={{ textAlign: 'center', margin: 0 }}>
                Press Start to begin breathing guide
              </p>
            </div>
          )}

          {/* Start/stop */}
          <button
            className={`breath-solo-start-btn${isGuideActive ? ' breath-solo-start-btn--stop' : ''}`}
            onClick={() => setIsGuideActive(a => !a)}
          >
            {isGuideActive ? '■ Stop' : '▶ Start breathing guide'}
          </button>
        </>
      )}
    </div>
  )
}
