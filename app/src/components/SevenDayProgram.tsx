import { useState, useEffect } from 'react'
import { ProgramComplete } from './ProgramComplete'

type DayEntry = {
  day: number
  title: string
  emoji: string
  duration: number
  carrier: number
  beat: number
  wave: string
  desc: string
  goal: string
}

const SEVEN_DAY_PROGRAM: DayEntry[] = [
  { day: 1, title: 'Your First Journey',  emoji: '🌱', duration: 10, carrier: 200, beat: 10, wave: 'Alpha', desc: 'Start gentle. Alpha waves ease you into a relaxed, aware state. Perfect for beginners.',      goal: 'Relaxation'     },
  { day: 2, title: 'Find Your Focus',     emoji: '🎯', duration: 15, carrier: 200, beat: 14, wave: 'Beta',  desc: 'Beta waves sharpen concentration. Try this while working or studying.',                       goal: 'Focus'           },
  { day: 3, title: 'Deep Dive',           emoji: '🌊', duration: 20, carrier: 200, beat: 6,  wave: 'Theta', desc: 'Theta is the gateway to deep meditation and creativity. Let your mind wander.',               goal: 'Deep Meditation' },
  { day: 4, title: 'Sleep Prep',          emoji: '🌙', duration: 20, carrier: 200, beat: 2,  wave: 'Delta', desc: 'Delta waves prepare your body for deep, restorative sleep. Listen before bed.',               goal: 'Sleep'           },
  { day: 5, title: 'Morning Activation',  emoji: '🌅', duration: 15, carrier: 200, beat: 18, wave: 'Beta',  desc: 'Start your day energized. High beta for alertness and motivation.',                           goal: 'Energy'          },
  { day: 6, title: 'Creative State',      emoji: '✨', duration: 20, carrier: 200, beat: 8,  wave: 'Alpha', desc: 'Low alpha bridges relaxation and awareness — the ideal creative state.',                       goal: 'Creativity'      },
  { day: 7, title: 'Your Practice',       emoji: '🔮', duration: 25, carrier: 200, beat: 10, wave: 'Alpha', desc: 'You now understand the spectrum. Build your own routine from here.',                           goal: 'Integration'     },
]

const STORAGE_KEY = 'liminal-7day-progress'

type Progress = { completedDays: number[]; startedAt: string }

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? { completedDays: [], startedAt: '' } }
  catch { return { completedDays: [], startedAt: '' } }
}
function saveProgress(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

type Props = {
  onStartSession: (carrier: number, beat: number) => void
  sessionStartedAt: number | null  // timestamp when current session started, or null
  isPro?: boolean
  onContinue?: (tab: string) => void
  onUpgrade?: () => void
}

export function SevenDayProgram({ onStartSession, sessionStartedAt, isPro = false, onContinue, onUpgrade }: Props) {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [showCongrats, setShowCongrats] = useState(false)
  const [activeDayStarted, setActiveDayStarted] = useState<number | null>(null)

  // Check if the current session (if any) has run 5 minutes and we have an active day
  useEffect(() => {
    if (!sessionStartedAt || activeDayStarted === null) return
    const check = setInterval(() => {
      const elapsed = (Date.now() - sessionStartedAt) / 1000 / 60
      if (elapsed >= 5) {
        completeDay(activeDayStarted)
        setActiveDayStarted(null)
        clearInterval(check)
      }
    }, 10000)
    return () => clearInterval(check)
  }, [sessionStartedAt, activeDayStarted])

  function completeDay(day: number) {
    setProgress(prev => {
      if (prev.completedDays.includes(day)) return prev
      const next = { ...prev, completedDays: [...prev.completedDays, day] }
      saveProgress(next)
      if (day === 7) setShowCongrats(true)
      return next
    })
  }

  function beginDay(entry: DayEntry) {
    if (!progress.startedAt) {
      const next = { ...progress, startedAt: new Date().toISOString() }
      setProgress(next)
      saveProgress(next)
    }
    setActiveDayStarted(entry.day)
    onStartSession(entry.carrier, entry.beat)
  }

  const completedCount = progress.completedDays.length
  const currentDay = completedCount < 7 ? completedCount + 1 : 7

  return (
    <div className="seven-day-program">
      <div className="seven-day-header">
        <div className="section-title">📅 7 Days of Liminal</div>
        <div className="seven-day-progress-label">
          {completedCount === 7 ? 'Program complete! 🎉' : `Day ${Math.min(completedCount + 1, 7)} of 7`}
        </div>
        <div className="seven-day-progress-bar-wrap">
          <div className="seven-day-progress-bar" style={{ width: `${(completedCount / 7) * 100}%` }} />
        </div>
      </div>

      {showCongrats && onContinue ? (
        <ProgramComplete
          isPro={isPro}
          onContinue={onContinue}
          onUpgrade={onUpgrade ?? (() => {})}
        />
      ) : showCongrats && (
        <div className="seven-day-congrats">
          <div style={{ fontSize: '3rem' }}>🔮</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>You've Completed the Program!</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: 320, textAlign: 'center' }}>
            You've explored the full spectrum of brainwave entrainment. Your practice is yours now.
          </div>
          <button className="soft-button soft-button--accent" onClick={() => setShowCongrats(false)}>Continue →</button>
        </div>
      )}

      {SEVEN_DAY_PROGRAM.map(entry => {
        const completed = progress.completedDays.includes(entry.day)
        const isCurrent = entry.day === currentDay && !completed
        return (
          <div
            key={entry.day}
            className={`seven-day-card${isCurrent ? ' seven-day-card--current' : ''}${completed ? ' seven-day-card--completed' : ''}`}
          >
            <div className="seven-day-card-header">
              <div className="seven-day-card-title">
                <span>{entry.emoji}</span>
                <span>Day {entry.day}: {entry.title}</span>
                {completed && <span>✅</span>}
              </div>
              <div className="seven-day-card-meta">{entry.duration} min · {entry.wave}</div>
            </div>
            <div className="seven-day-card-desc">{entry.desc}</div>
            <div className="seven-day-card-actions">
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {entry.carrier} Hz carrier · {entry.beat} Hz beat
              </div>
              {!completed && (
                <button
                  className="soft-button soft-button--accent"
                  style={{ marginLeft: 'auto', padding: '0.3rem 1rem', fontSize: '0.85rem' }}
                  onClick={() => beginDay(entry)}
                >
                  {isCurrent ? `Begin Day ${entry.day}` : entry.day < currentDay ? `Revisit Day ${entry.day}` : `Begin Day ${entry.day}`}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { loadProgress, STORAGE_KEY as SEVEN_DAY_KEY }
