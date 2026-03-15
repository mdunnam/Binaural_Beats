import { useState, useRef, useCallback } from 'react'

interface RefFrequency {
  hz: number
  label: string
}

const REFERENCE_FREQUENCIES: RefFrequency[] = [
  { hz: 396, label: 'Solfeggio — Liberation from Fear' },
  { hz: 417, label: 'Solfeggio — Facilitating Change' },
  { hz: 432, label: 'Verdi tuning / "natural" A' },
  { hz: 440, label: 'Standard concert pitch (A4)' },
  { hz: 528, label: 'Solfeggio — Transformation / DNA repair (claimed)' },
  { hz: 639, label: 'Solfeggio — Connecting Relationships' },
  { hz: 741, label: 'Solfeggio — Awakening Intuition' },
  { hz: 852, label: 'Solfeggio — Returning to Spiritual Order' },
  { hz: 963, label: 'Solfeggio — Divine Consciousness' },
]

type InputMode = 'mic' | 'display' | null

function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  let rms = 0
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / buf.length)
  if (rms < 0.01) return -1

  let r1 = 0, r2 = buf.length - 1
  for (let i = 0; i < buf.length / 2; i++) {
    if (Math.abs(buf[i]) < 0.2) { r1 = i; break }
  }
  for (let i = 1; i < buf.length / 2; i++) {
    if (Math.abs(buf[buf.length - i]) < 0.2) { r2 = buf.length - i; break }
  }
  const trimBuf = buf.slice(r1, r2)

  const c = new Array(trimBuf.length).fill(0) as number[]
  for (let i = 0; i < trimBuf.length; i++)
    for (let j = 0; j < trimBuf.length - i; j++) c[i] += trimBuf[j] * trimBuf[j + i]

  let d = 0
  while (c[d] > c[d + 1]) d++
  let maxVal = -1, maxPos = -1
  for (let i = d; i < trimBuf.length; i++) {
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i }
  }

  if (maxPos <= 0 || maxPos >= trimBuf.length - 1) return sampleRate / maxPos

  const x1 = c[maxPos - 1], x2 = c[maxPos], x3 = c[maxPos + 1]
  const a = (x1 + x3 - 2 * x2) / 2
  const b = (x3 - x1) / 2
  const shift = a ? -b / (2 * a) : 0

  return sampleRate / (maxPos + shift)
}

function findNearest(hz: number): { ref: RefFrequency; cents: number } {
  let best = REFERENCE_FREQUENCIES[0]
  let bestCents = Infinity
  for (const ref of REFERENCE_FREQUENCIES) {
    const cents = 1200 * Math.log2(hz / ref.hz)
    if (Math.abs(cents) < Math.abs(bestCents)) {
      best = ref
      bestCents = cents
    }
  }
  return { ref: best, cents: bestCents }
}

function centsColor(cents: number): string {
  const abs = Math.abs(cents)
  if (abs <= 10) return '#4caf50'
  if (abs <= 25) return '#ff9800'
  return '#f44336'
}

function centsLabel(cents: number): string {
  if (Math.abs(cents) <= 5) return '✓ In tune'
  const n = Math.round(Math.abs(cents))
  return cents > 0 ? `+${n} cents sharp` : `−${n} cents flat`
}

const hasDisplayMedia =
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices !== 'undefined' &&
  typeof (navigator.mediaDevices as MediaDevices & { getDisplayMedia?: unknown }).getDisplayMedia === 'function'

export function FrequencyVerifier() {
  const [inputMode, setInputMode] = useState<InputMode>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [detectedHz, setDetectedHz] = useState<number | null>(null)
  const [confidence, setConfidence] = useState(0)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopListening = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    analyserRef.current = null
    setInputMode(null)
    setDetectedHz(null)
    setConfidence(0)
  }, [])

  const startFromStream = useCallback((stream: MediaStream) => {
    streamRef.current = stream
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyserRef.current = analyser
    const source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)

    const buf = new Float32Array(analyser.fftSize)
    intervalRef.current = setInterval(() => {
      if (!analyserRef.current) return
      analyserRef.current.getFloatTimeDomainData(buf)

      let rms = 0
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
      rms = Math.sqrt(rms / buf.length)
      const conf = Math.min(1, rms / 0.1)
      setConfidence(conf)

      const freq = autoCorrelate(buf, ctx.sampleRate)
      if (freq > 0) setDetectedHz(freq)
      else setDetectedHz(null)
    }, 100)
  }, [])

  const startMic = useCallback(() => {
    setErrorMsg(null)
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        startFromStream(stream)
        setInputMode('mic')
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : ''
        if (msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('permission')) {
          setErrorMsg('Microphone permission denied')
        } else {
          setErrorMsg('Could not access audio')
        }
      })
  }, [startFromStream])

  const startDisplay = useCallback(() => {
    setErrorMsg(null)
    ;(navigator.mediaDevices as MediaDevices & {
      getDisplayMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>
    }).getDisplayMedia({ video: true, audio: true })
      .then(stream => {
        stream.getVideoTracks().forEach(t => t.stop())
        const audioTracks = stream.getAudioTracks()
        if (audioTracks.length === 0) {
          stream.getTracks().forEach(t => t.stop())
          setErrorMsg("No audio track found — make sure to check 'Share audio' in the picker")
          return
        }
        startFromStream(stream)
        setInputMode('display')
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : ''
        if (
          msg.toLowerCase().includes('cancel') ||
          msg.toLowerCase().includes('denied') ||
          msg.toLowerCase().includes('permission') ||
          msg.toLowerCase().includes('abort')
        ) {
          setErrorMsg('Screen capture cancelled')
        } else {
          setErrorMsg('Could not access audio')
        }
      })
  }, [startFromStream])

  const listening = inputMode !== null
  const nearest = detectedHz !== null ? findNearest(detectedHz) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ margin: 0, opacity: 0.65, fontSize: '0.85rem' }}>
        Is your audio actually the frequency it claims?
      </p>

      {!listening ? (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="soft-button" onClick={startMic}>
            🎤 Microphone
          </button>
          <button
            className="soft-button"
            onClick={hasDisplayMedia ? startDisplay : undefined}
            disabled={!hasDisplayMedia}
            title={hasDisplayMedia ? undefined : 'Not available on this device'}
            style={!hasDisplayMedia ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
          >
            🖥 Device Audio
          </button>
          {!hasDisplayMedia && (
            <span style={{ fontSize: '0.75rem', opacity: 0.55, alignSelf: 'center' }}>
              (Not available on this device)
            </span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="soft-button" onClick={stopListening}>
            ⏹ Stop Listening
          </button>
          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
            Listening via: {inputMode === 'mic' ? 'Microphone' : 'Device Audio'}
          </span>
        </div>
      )}

      {errorMsg && (
        <p style={{ color: '#f44336', margin: 0 }}>{errorMsg}</p>
      )}

      {listening && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {detectedHz !== null ? (
            <>
              <div style={{ fontFamily: 'monospace', fontSize: '2.5rem', color: 'var(--accent)', lineHeight: 1 }}>
                {detectedHz.toFixed(1)} Hz
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>
                  Signal confidence: {Math.round(confidence * 100)}%
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${confidence * 100}%`,
                    background: 'var(--accent)',
                    transition: 'width 0.1s ease',
                    borderRadius: '3px',
                  }} />
                </div>
              </div>

              {nearest && (
                <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                  <div>
                    Nearest: <strong>{nearest.ref.hz} Hz</strong>{' '}
                    <span style={{ opacity: 0.7 }}>({nearest.ref.label})</span>
                  </div>
                  <div>
                    <span style={{ color: centsColor(nearest.cents), fontWeight: 600 }}>
                      {centsLabel(nearest.cents)}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ opacity: 0.5, margin: 0 }}>
              {inputMode === 'display'
                ? 'Listening… play audio in the captured tab.'
                : 'Listening… hold your device near the audio source.'}
            </p>
          )}
        </div>
      )}

      <details style={{ marginTop: '0.5rem' }}>
        <summary style={{ cursor: 'pointer', opacity: 0.8, fontSize: '0.85rem', userSelect: 'none' }}>
          Reference Frequencies
        </summary>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem', fontSize: '0.82rem' }}>
          <tbody>
            {REFERENCE_FREQUENCIES.map(ref => (
              <tr key={ref.hz} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={{ padding: '0.35rem 0.5rem', color: 'var(--accent)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {ref.hz} Hz
                </td>
                <td style={{ padding: '0.35rem 0.5rem', opacity: 0.75 }}>{ref.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
