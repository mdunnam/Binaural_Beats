import { useState } from 'react'
import { IconRelief } from './Icons'

type Expandable = { [key: string]: boolean }

const BANDS = [
  {
    key: 'delta',
    name: 'Delta',
    hz: '0.5–4 Hz',
    color: '#6366f1',
    tags: ['Deep sleep', 'Healing', 'Regeneration'],
    desc: 'Delta waves are the slowest brainwave state, associated with deep dreamless sleep and the body\'s natural healing processes. Prolonged time in delta is linked to immune restoration and cellular repair.',
  },
  {
    key: 'theta',
    name: 'Theta',
    hz: '4–8 Hz',
    color: '#a855f7',
    tags: ['REM sleep', 'Dreaming', 'Deep meditation', 'Creativity'],
    desc: 'Theta is the gateway between waking and sleep — the hypnagogic state. It\'s associated with vivid imagery, intuition, and the creative insights that surface just before drifting off.',
  },
  {
    key: 'alpha',
    name: 'Alpha',
    hz: '8–12 Hz',
    color: '#14b8a6',
    tags: ['Relaxed awareness', 'Light meditation', 'Flow state', 'Stress relief'],
    desc: 'Alpha waves emerge when the mind is calm but alert — a state of effortless focus. This is the entry point to flow, often felt during walks, light exercise, or gentle creative work.',
  },
  {
    key: 'beta',
    name: 'Beta',
    hz: '12–30 Hz',
    color: '#3b82f6',
    tags: ['Focus', 'Concentration', 'Problem-solving', 'Alert thinking'],
    desc: 'Beta is the dominant state of active, analytical thinking. It powers productivity, verbal communication, and logical reasoning — but too much can contribute to stress and mental fatigue.',
  },
  {
    key: 'gamma',
    name: 'Gamma',
    hz: '30–100 Hz',
    color: '#eab308',
    tags: ['Peak cognition', 'Insight', 'High perception', 'High performance'],
    desc: 'Gamma is the fastest brainwave frequency, linked to bursts of insight, heightened awareness, and integrating information across the brain. Advanced meditators show sustained gamma activity.',
  },
]

const SOLFEGGIO = [
  { hz: '174 Hz', label: 'Foundation — pain reduction, sense of security' },
  { hz: '285 Hz', label: 'Healing — tissue regeneration, cellular repair' },
  { hz: '396 Hz', label: 'Liberation from guilt and fear' },
  { hz: '417 Hz', label: 'Change — undoing negative situations' },
  { hz: '432 Hz', label: 'Harmony — natural tuning, said to resonate with nature' },
  { hz: '528 Hz', label: 'Transformation — DNA repair, "Love frequency"' },
  { hz: '639 Hz', label: 'Connection — relationships, communication' },
  { hz: '741 Hz', label: 'Expression — problem-solving, awakening intuition' },
  { hz: '852 Hz', label: 'Spiritual awakening — returning to spiritual order' },
  { hz: '963 Hz', label: 'Divine consciousness — pineal gland activation' },
]

const STEPS = [
  { label: 'Choose your goal', desc: 'Browse the Session Library and pick a preset — Sleep, Focus, Relax, or Meditate.' },
  { label: 'Put on headphones', desc: 'Binaural beats require stereo audio. Each ear receives a slightly different frequency — headphones are essential.' },
  { label: 'Set your session length and press Play', desc: 'Even 20 minutes can be effective. Longer sessions deepen the effect.' },
  { label: 'Stay still and breathe naturally', desc: 'Close your eyes. Let go of active thinking. You don\'t need to "do" anything.' },
  { label: 'Give it 10–15 minutes', desc: 'Brain entrainment isn\'t instant. Stay with it — the shift often arrives gradually and subtly.' },
]

const SAFETY = [
  'Not suitable for people with epilepsy or seizure disorders.',
  'Do not use while driving or operating machinery.',
  'Not a substitute for medical treatment.',
  'Consult a doctor if you have a pacemaker or serious medical condition.',
  'Children should use only with parental supervision.',
  'Liminal is for relaxation and entertainment purposes only.',
]

export function EducationTab() {
  const [expanded, setExpanded] = useState<Expandable>({ safety: false })

  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Section 1: What are Binaural Beats */}
      <div className="section-block">
        <div className="section-title">What are Binaural Beats?</div>
        <div className="section-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            When two slightly different frequencies are played in each ear, your brain perceives a third tone — a "beat" — equal to the difference between them. This auditory illusion is called a <strong style={{ color: 'var(--text-primary)' }}>binaural beat</strong>.
          </p>
          <div style={{
            background: 'var(--bg-section)',
            border: '1px solid var(--border-card)',
            borderRadius: 10,
            padding: '0.7rem 1rem',
            fontSize: '0.83rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Example:</span><br />
            Left ear: 200 Hz &nbsp;·&nbsp; Right ear: 210 Hz<br />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>→ Brain perceives: 10 Hz beat (Alpha range)</span>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            The brain tends to synchronize its own electrical activity to match this perceived frequency — a process called <strong style={{ color: 'var(--text-primary)' }}>brainwave entrainment</strong>. Different frequencies are associated with different mental states.
          </p>
        </div>
      </div>

      {/* Section 2: Brainwave Bands */}
      <div className="section-block">
        <div className="section-card">
          <button className="edu-expand-btn" onClick={() => toggle('brainwaves')}>
            <span className="section-title" style={{ margin: 0 }}>Brainwave Bands</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{expanded['brainwaves'] ? '▲' : '▼'}</span>
          </button>
          {expanded['brainwaves'] && (
            <div className="edu-expand-content">
              <div className="edu-band-cards">
                {BANDS.map(band => (
                  <div
                    key={band.key}
                    className="edu-band-card"
                    style={{ '--band-color': band.color, borderLeft: `3px solid ${band.color}` } as React.CSSProperties}
                  >
                    <div className="edu-band-header">
                      <span
                        style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: band.color, display: 'inline-block', flexShrink: 0,
                        }}
                      />
                      <span className="edu-band-name">{band.name}</span>
                      <span className="edu-band-hz">{band.hz}</span>
                    </div>
                    <div className="edu-band-tags">
                      {band.tags.map(t => (
                        <span key={t} className="edu-band-tag">{t}</span>
                      ))}
                    </div>
                    <p className="edu-band-desc">{band.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Solfeggio Frequencies */}
      <div className="section-block">
        <div className="section-card">
          <button className="edu-expand-btn" onClick={() => toggle('solfeggio')}>
            <span className="section-title" style={{ margin: 0 }}>Solfeggio Frequencies</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{expanded['solfeggio'] ? '▲' : '▼'}</span>
          </button>
          {expanded['solfeggio'] && (
            <div className="edu-expand-content">
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                Solfeggio frequencies are specific tones used in ancient sacred music. Each is said to carry particular healing or transformational properties.
              </p>
              <div className="edu-solfeggio-list">
                {SOLFEGGIO.map(item => (
                  <div key={item.hz} className="edu-solfeggio-item">
                    <span className="edu-solfeggio-hz">{item.hz}</span>
                    <span className="edu-solfeggio-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 4: How to Use Liminal */}
      <div className="section-block">
        <div className="section-title">How to Use Liminal</div>
        <div className="section-card">
          <div className="edu-steps">
            {STEPS.map((step, i) => (
              <div key={i} className="edu-step">
                <div className="edu-step-num">{i + 1}</div>
                <div className="edu-step-text">
                  <strong>{step.label}</strong> — {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 5: Science & Research */}
      <div className="section-block">
        <div className="section-card">
          <button className="edu-expand-btn" onClick={() => toggle('science')}>
            <span className="section-title" style={{ margin: 0 }}>Science &amp; Research</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{expanded['science'] ? '▲' : '▼'}</span>
          </button>
          {expanded['science'] && (
            <div className="edu-expand-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Frequency Following Response (FFR)</strong> is the brain's tendency to synchronize its electrical activity to external rhythmic stimuli. When binaural beats present a steady difference frequency — say 10 Hz — the brain begins to produce more 10 Hz brainwave activity over time. This is well-documented in EEG research and forms the scientific basis of audio-guided entrainment.
              </p>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: 'var(--text-primary)' }}>What the research shows:</strong> Multiple peer-reviewed studies have found that binaural beats in the theta and alpha range (4–12 Hz) can meaningfully reduce anxiety and improve self-reported relaxation. Delta-range sessions (0.5–4 Hz) have been associated with improved sleep onset in some clinical trials. The effects are real, though individual responses vary — genetics, prior meditation experience, and session consistency all influence outcomes.
              </p>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Important caveats:</strong> The research field is still maturing. Many studies have small sample sizes, and placebo effects are difficult to eliminate. Binaural beats are not a medical treatment and should not replace professional care for sleep disorders, anxiety, or other conditions. Think of them as a tool for mental hygiene — one that complements meditation, exercise, and good sleep habits rather than replacing them.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section 6: Safety & Disclaimers */}
      <div className="section-block">
        <div className="section-card">
          <button className="edu-expand-btn" onClick={() => toggle('safety')}>
            <span className="section-title" style={{ margin: 0 }}><IconRelief size={16} /> Safety &amp; Disclaimers</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{expanded['safety'] ? '▲' : '▼'}</span>
          </button>
          {expanded['safety'] && (
            <div className="edu-expand-content">
              <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {SAFETY.map((item, i) => (
                  <li key={i} style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
