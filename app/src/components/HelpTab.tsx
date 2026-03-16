import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

type FaqEntry = {
  id: string
  category: string
  question: string
  answer: string
  order: number
}

const FAQ_CATEGORIES = ['Getting Started', 'Audio & Science', 'Subscription', 'Account', 'Technical']

const DEFAULT_FAQ: FaqEntry[] = [
  { id: 'gs1', category: 'Getting Started', question: 'Do I need headphones?', answer: 'Yes — headphones are required for binaural beats to work. The effect depends on each ear receiving a slightly different frequency, which only happens with stereo headphones. Earbuds work great too.', order: 1 },
  { id: 'gs2', category: 'Getting Started', question: 'How long should I listen?', answer: 'Start with 15–20 minutes. Brain entrainment takes time to develop, so short sessions are still effective. With regular practice, you may find deeper effects in longer sessions (30–60 min).', order: 2 },
  { id: 'gs3', category: 'Getting Started', question: "What's the difference between binaural and isochronic?", answer: 'Binaural beats require headphones — they work by sending slightly different frequencies to each ear. Isochronic tones pulse at the target frequency and can be heard through speakers, though headphones still enhance the experience.', order: 3 },
  { id: 'gs4', category: 'Getting Started', question: 'Why do I need to be still and relaxed?', answer: 'Physical and mental stillness helps your brain shift into the desired state. Movement and distraction keep your mind active. Close your eyes, breathe naturally, and let the audio do the work.', order: 4 },
  { id: 'as1', category: 'Audio & Science', question: 'What are brainwave frequencies?', answer: 'Your brain produces electrical activity that oscillates at different frequencies. Different ranges (delta, theta, alpha, beta, gamma) correspond to different mental states — from deep sleep to peak focus. Binaural beats encourage your brain to synchronize with a target frequency.', order: 1 },
  { id: 'as2', category: 'Audio & Science', question: 'What are solfeggio frequencies?', answer: 'Solfeggio frequencies are specific tones (174 Hz, 285 Hz, 396 Hz, etc.) used in ancient sacred music and modern sound healing. Each is associated with particular healing or transformational properties, though scientific evidence is limited.', order: 2 },
  { id: 'as3', category: 'Audio & Science', question: 'Is there scientific evidence for binaural beats?', answer: 'There is growing research supporting binaural beats for relaxation, focus, and sleep. Studies show measurable changes in EEG brainwave patterns. Effects vary by person — think of it as a tool for mental states, not a guaranteed cure.', order: 3 },
  { id: 'sub1', category: 'Subscription', question: "What's included in the free tier?", answer: 'Free users get access to basic tone generation, preset sessions, and the education content. Session length may be limited, and some advanced features like AI meditation generation are Pro-only.', order: 1 },
  { id: 'sub2', category: 'Subscription', question: 'What does Pro include?', answer: 'Pro unlocks unlimited session length, AI-generated guided meditations, the full soundscape library, advanced Studio features, session journaling, and priority support.', order: 2 },
  { id: 'sub3', category: 'Subscription', question: 'How do I cancel?', answer: 'You can cancel anytime from your account settings. Your Pro access continues until the end of your current billing period. No refund is issued for partial periods unless requested within 7 days.', order: 3 },
  { id: 'sub4', category: 'Subscription', question: 'Is there a refund policy?', answer: 'We offer a 7-day refund window for new subscriptions. Contact support@theliminal.app within 7 days of your charge and we will process a full refund, no questions asked.', order: 4 },
  { id: 'acc1', category: 'Account', question: 'How do I reset my password?', answer: 'On the login screen, tap "Forgot password" and enter your email. You will receive a reset link within a few minutes. Check your spam folder if it does not arrive.', order: 1 },
  { id: 'acc2', category: 'Account', question: 'Can I use Liminal on multiple devices?', answer: 'Yes — your account syncs across devices. Sign in with the same email on any browser or device and your settings and journal entries will be available.', order: 2 },
  { id: 'acc3', category: 'Account', question: 'How do I delete my account?', answer: 'To delete your account and all associated data, email support@theliminal.app with subject "Delete my account". We will process it within 48 hours. This action is permanent and cannot be undone.', order: 3 },
  { id: 'tech1', category: 'Technical', question: "The audio isn't working", answer: "First, make sure your device volume is turned up and not muted. Liminal requires browser permission to play audio — if prompted, allow it. Try refreshing the page. If the issue persists, try a different browser (Chrome/Edge work best).", order: 1 },
  { id: 'tech2', category: 'Technical', question: 'Why do I hear clicking/popping?', answer: 'Clicking or popping can occur if your device is under heavy load or your audio buffer is too small. Close other tabs, reduce background apps, and try lowering the volume slightly. Using wired headphones instead of Bluetooth may also help.', order: 2 },
  { id: 'tech3', category: 'Technical', question: 'Does it work on mobile?', answer: 'Yes — Liminal is a Progressive Web App (PWA) optimized for mobile. Add it to your home screen for the best experience. Background audio works on most mobile browsers; iOS Safari may require the screen to stay on.', order: 3 },
]

export function HelpTab() {
  const [entries, setEntries] = useState<FaqEntry[]>(DEFAULT_FAQ)
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  useEffect(() => {
    supabase.from('app_config').select('value').eq('key', 'faq_entries').single()
      .then(({ data }) => {
        if (data?.value) {
          try { setEntries(JSON.parse(data.value) as FaqEntry[]) } catch { /* use default */ }
        }
      })
      .catch(() => { /* use default */ })
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return entries.filter(e =>
      e.question.toLowerCase().includes(q) || e.answer.toLowerCase().includes(q)
    )
  }, [entries, search])

  const grouped = useMemo(() => {
    const map: Record<string, FaqEntry[]> = {}
    for (const cat of FAQ_CATEGORIES) map[cat] = []
    filtered.forEach(e => {
      if (!map[e.category]) map[e.category] = []
      map[e.category].push(e)
    })
    // sort by order within each category
    Object.values(map).forEach(arr => arr.sort((a, b) => a.order - b.order))
    return map
  }, [filtered])

  const toggleCat = (cat: string) => setExpandedCategories(s => ({ ...s, [cat]: !s[cat] }))
  const toggleItem = (id: string) => setExpandedItems(s => ({ ...s, [id]: !s[id] }))

  // Auto-expand categories when searching
  const effectiveExpandedCats = useMemo(() => {
    if (!search.trim()) return expandedCategories
    const expanded: Record<string, boolean> = {}
    FAQ_CATEGORIES.forEach(cat => {
      if (grouped[cat]?.length > 0) expanded[cat] = true
    })
    return expanded
  }, [search, grouped, expandedCategories])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Search */}
      <div className="section-block">
        <div className="section-card" style={{ padding: '0.75rem' }}>
          <input
            type="text"
            placeholder="🔍 Search help articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              background: 'var(--bg-section)',
              border: '1px solid var(--border-card)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* FAQ Categories */}
      {FAQ_CATEGORIES.map(cat => {
        const items = grouped[cat] ?? []
        if (items.length === 0) return null
        const isCatOpen = effectiveExpandedCats[cat] ?? false

        return (
          <div className="section-block" key={cat}>
            <div className="section-card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => toggleCat(cat)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                }}
              >
                <span className="section-title" style={{ margin: 0 }}>{cat}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{isCatOpen ? '▲' : '▼'} {items.length}</span>
              </button>

              {isCatOpen && (
                <div style={{ borderTop: '1px solid var(--border-card)' }}>
                  {items.map(item => {
                    const isOpen = expandedItems[item.id] ?? false
                    return (
                      <div key={item.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                        <button
                          onClick={() => toggleItem(item.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            textAlign: 'left',
                            gap: '0.5rem',
                          }}
                        >
                          <span style={{ fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.4, flex: 1 }}>{item.question}</span>
                          <span style={{ fontSize: '0.75rem', opacity: 0.5, flexShrink: 0, marginTop: 2 }}>{isOpen ? '▲' : '▼'}</span>
                        </button>
                        {isOpen && (
                          <div style={{
                            padding: '0 1rem 0.85rem',
                            fontSize: '0.84rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6,
                          }}>
                            {item.answer}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && search && (
        <div className="section-block">
          <div className="section-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem' }}>
            No results for "{search}" — try different keywords or contact support below.
          </div>
        </div>
      )}

      {/* Contact Support */}
      <div className="section-block">
        <div className="section-title">Contact Support</div>
        <div className="section-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            Can't find what you're looking for? We're here to help.
          </p>
          <a
            href="mailto:support@theliminal.app"
            style={{
              display: 'inline-block',
              padding: '0.6rem 1.2rem',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 8,
              fontSize: '0.86rem',
              fontWeight: 600,
              textDecoration: 'none',
              alignSelf: 'flex-start',
            }}
          >
            📧 Email Support
          </a>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            support@theliminal.app — we typically respond within 24 hours.
          </p>
        </div>
      </div>

    </div>
  )
}
