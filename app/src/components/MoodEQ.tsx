// no local state

// ── Types ──────────────────────────────────────────────────────────────────
export type MoodSliders = {
  ground: number
  relax: number
  focus: number
  dream: number
  ascend: number
}

export type AntiMoodKey = 'angry' | 'anxious' | 'sad' | 'scattered' | 'exhausted'
export type AntiMoodSliders = Record<AntiMoodKey, number>

// ── Metadata ───────────────────────────────────────────────────────────────
const MOOD_META = [
  { key: 'ground' as const, label: 'GROUND', hint: 'δ 1.5Hz', color: '#7b68ee' },
  { key: 'relax'  as const, label: 'RELAX',  hint: 'α 9Hz',   color: '#5b9bd5' },
  { key: 'focus'  as const, label: 'FOCUS',  hint: 'β 18Hz',  color: '#e8b84b' },
  { key: 'dream'  as const, label: 'DREAM',  hint: 'θ 6Hz',   color: '#3e8f72' },
  { key: 'ascend' as const, label: 'ASCEND', hint: 'γ 40Hz',  color: '#e05a3a' },
]

const ANTI_MOOD_META: { key: AntiMoodKey; label: string; hint: string; color: string }[] = [
  { key: 'angry',     label: 'ANGRY',     hint: '→ calm',     color: '#e05a3a' },
  { key: 'anxious',   label: 'ANXIOUS',   hint: '→ ground',   color: '#7b68ee' },
  { key: 'sad',       label: 'SAD',       hint: '→ uplift',   color: '#5b9bd5' },
  { key: 'scattered', label: 'SCATTERED', hint: '→ focus',    color: '#e8b84b' },
  { key: 'exhausted', label: 'EXHAUSTED', hint: '→ energize', color: '#3e8f72' },
]

// ── Helpers ────────────────────────────────────────────────────────────────
export function applyMoodSliders(
  sliders: MoodSliders,
  setCarrier: (v: number) => void,
  setBeat: (v: number) => void,
  setWobbleRate: (v: number) => void,
) {
  let carrierTarget = 0, carrierWeight = 0
  if (sliders.ground > 0) { carrierTarget += 174 * sliders.ground; carrierWeight += sliders.ground }
  if (sliders.dream > 0)  { carrierTarget += 528 * sliders.dream;  carrierWeight += sliders.dream }
  if (sliders.ascend > 0) { carrierTarget += 852 * sliders.ascend; carrierWeight += sliders.ascend }
  if (carrierWeight > 0) setCarrier(Math.round(carrierTarget / carrierWeight))
  else setCarrier(432)

  let beatTarget = 0, beatWeight = 0
  if (sliders.ground > 0) { beatTarget += 1.5  * sliders.ground; beatWeight += sliders.ground }
  if (sliders.relax > 0)  { beatTarget += 9.0  * sliders.relax;  beatWeight += sliders.relax }
  if (sliders.focus > 0)  { beatTarget += 18.0 * sliders.focus;  beatWeight += sliders.focus }
  if (sliders.dream > 0)  { beatTarget += 6.0  * sliders.dream;  beatWeight += sliders.dream }
  if (sliders.ascend > 0) { beatTarget += 40.0 * sliders.ascend; beatWeight += sliders.ascend }
  if (beatWeight > 0) setBeat(Math.round(beatTarget / beatWeight * 10) / 10)
  else setBeat(10.0)

  let wobbleRate = 0.4
  if (sliders.relax > 0)  wobbleRate = Math.max(wobbleRate, 0.15 * sliders.relax)
  if (sliders.focus > 0)  wobbleRate = Math.max(wobbleRate, 0.6  * sliders.focus)
  if (sliders.dream > 0)  wobbleRate = Math.min(wobbleRate, 0.08 + (1 - sliders.dream) * 0.4)
  setWobbleRate(Math.max(0.05, Math.min(4, wobbleRate)))
}

export function applyAntiMoodSliders(
  sliders: AntiMoodSliders,
  setCarrier: (v: number) => void,
  setBeat: (v: number) => void,
  setWobbleRate: (v: number) => void,
) {
  const recipes: Record<AntiMoodKey, { carrier: number; beat: number; wobble: number }> = {
    angry:     { carrier: 396, beat: 6.0,  wobble: 0.15 },
    anxious:   { carrier: 174, beat: 2.0,  wobble: 0.08 },
    sad:       { carrier: 528, beat: 10.0, wobble: 0.3  },
    scattered: { carrier: 852, beat: 14.0, wobble: 0.6  },
    exhausted: { carrier: 396, beat: 18.0, wobble: 0.5  },
  }

  let carrierTarget = 0, beatTarget = 0, wobbleTarget = 0, totalWeight = 0
  for (const [k, recipe] of Object.entries(recipes) as [AntiMoodKey, typeof recipes[AntiMoodKey]][]) {
    const w = sliders[k]
    if (w > 0) {
      carrierTarget += recipe.carrier * w
      beatTarget    += recipe.beat    * w
      wobbleTarget  += recipe.wobble  * w
      totalWeight   += w
    }
  }

  if (totalWeight > 0) {
    setCarrier(Math.round(carrierTarget / totalWeight))
    setBeat(Math.round((beatTarget / totalWeight) * 10) / 10)
    setWobbleRate(Math.max(0.05, Math.min(4, wobbleTarget / totalWeight)))
  } else {
    setCarrier(432)
    setBeat(10.0)
    setWobbleRate(0.4)
  }
}

// ── Default state helpers ──────────────────────────────────────────────────
export const defaultMoodSliders = (): MoodSliders => ({
  ground: 0, relax: 0, focus: 0, dream: 0, ascend: 0,
})
export const defaultAntiSliders = (): AntiMoodSliders => ({
  angry: 0, anxious: 0, sad: 0, scattered: 0, exhausted: 0,
})

// ── Component ──────────────────────────────────────────────────────────────
interface MoodEQProps {
  mode: 'mood' | 'anti'
  moodSliders: MoodSliders
  antiSliders: AntiMoodSliders
  onMode: (m: 'mood' | 'anti') => void
  onMoodChange: (sliders: MoodSliders) => void
  onAntiChange: (sliders: AntiMoodSliders) => void
  setCarrier: (v: number) => void
  setBeat: (v: number) => void
  setWobbleRate: (v: number) => void
}

export function MoodEQ({ mode, moodSliders, antiSliders, onMode, onMoodChange, onAntiChange, setCarrier, setBeat, setWobbleRate }: MoodEQProps) {
  const handleMood = (k: keyof MoodSliders, v: number) => {
    const next = { ...moodSliders, [k]: v }
    onMoodChange(next)
    applyMoodSliders(next, setCarrier, setBeat, setWobbleRate)
  }

  const handleAnti = (k: AntiMoodKey, v: number) => {
    const next = { ...antiSliders, [k]: v }
    onAntiChange(next)
    applyAntiMoodSliders(next, setCarrier, setBeat, setWobbleRate)
  }

  return (
    <div className="section-block">
      <div className="mood-eq-tabs">
        <button
          className={`mood-eq-tab ${mode === 'mood' ? 'mood-eq-tab--active' : ''}`}
          onClick={() => onMode('mood')}
        >Mood EQ</button>
        <button
          className={`mood-eq-tab ${mode === 'anti' ? 'mood-eq-tab--active' : ''}`}
          onClick={() => onMode('anti')}
        >Anti-Mood</button>
      </div>

      {mode === 'mood' ? (
        <div className="player-mood-eq">
          {MOOD_META.map(m => (
            <div key={m.key} className="player-mood-col">
              <span className="player-mood-label" style={{ color: m.color }}>{m.label}</span>
              <div className="player-mood-slider-wrap">
                <input
                  type="range"
                  className="player-mood-slider"
                  min={0} max={1} step={0.01}
                  value={moodSliders[m.key]}
                  onChange={e => handleMood(m.key, Number(e.target.value))}
                />
              </div>
              <span className="player-mood-hint">{m.hint}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="player-mood-eq">
          {ANTI_MOOD_META.map(m => (
            <div key={m.key} className="player-mood-col">
              <span className="player-mood-label" style={{ color: m.color }}>{m.label}</span>
              <div className="player-mood-slider-wrap">
                <input
                  type="range"
                  className="player-mood-slider"
                  min={0} max={1} step={0.01}
                  value={antiSliders[m.key]}
                  onChange={e => handleAnti(m.key, Number(e.target.value))}
                />
              </div>
              <span className="player-mood-hint">{m.hint}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
