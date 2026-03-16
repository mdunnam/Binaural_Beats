// AdminConsole.tsx - Liminal Admin Dashboard
// SQL to create app_config table:
// CREATE TABLE IF NOT EXISTS app_config (key text PRIMARY KEY, value text, updated_at timestamptz DEFAULT now());
// AI usage tracking
// CREATE TABLE IF NOT EXISTS ai_usage (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
//   created_at timestamptz DEFAULT now(),
//   feature text,
//   model text,
//   input_tokens int DEFAULT 0,
//   output_tokens int DEFAULT 0,
//   tts_chars int DEFAULT 0,
//   estimated_cost_usd numeric(10,6) DEFAULT 0
// );
// Feature usage events
// CREATE TABLE IF NOT EXISTS feature_usage (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
//   created_at timestamptz DEFAULT now(),
//   feature text NOT NULL,        -- e.g. 'tones', 'studio', 'soundscape', 'ai_meditation', 'journey', 'music', 'pad', 'breath_guide', 'panic_mode', 'export_wav'
//   action text,                  -- e.g. 'start', 'stop', 'generate', 'export', 'open'
//   metadata jsonb DEFAULT '{}'   -- optional extra data (duration_seconds, preset_name, etc.)
// );

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/supabase'
import './AdminConsole.css'

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'customers' | 'revenue' | 'health' | 'controls' | 'reports' | 'ai' | 'faq' | 'usage'

interface RevenueData {
  mrr: number
  activeCount: number
  monthlyCount: number
  annualCount: number
  recentTransactions: {
    date: string
    amount: number
    currency: string
    customerEmail: string
    status: string
  }[]
}

interface HealthStatus {
  status: 'loading' | 'ok' | 'error'
  value?: string
}

interface AppConfig {
  ai_enabled: boolean
  new_signups_enabled: boolean
  maintenance_mode: boolean
  broadcast_message: string
}

// ─── Customers Tab ──────────────────────────────────────────────────────────

function CustomersTab() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'free' | 'pro'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setProfiles((data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = profiles.filter(p => {
    if (filter === 'pro' && !p.is_pro) return false
    if (filter === 'free' && p.is_pro) return false
    if (search && !(p.email ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function togglePro(p: Profile) {
    await supabase.from('profiles').update({ is_pro: !p.is_pro }).eq('id', p.id)
    load()
  }

  function exportCSV() {
    const header = 'Email,Plan,Joined,is_admin'
    const rows = profiles.map(p =>
      `${p.email ?? ''},${p.is_pro ? 'Pro' : 'Free'},${p.created_at},${p.is_admin}`
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'liminal-customers.csv'
    a.click()
  }

  return (
    <div>
      <div className="admin-controls-row">
        <input
          className="admin-search"
          placeholder="Search by email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {(['all', 'free', 'pro'] as const).map(f => (
          <button key={f} className={`admin-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button className="admin-btn-accent" onClick={exportCSV}>⬇ Export CSV</button>
      </div>

      {loading ? (
        <div className="admin-loading">Loading…</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Plan</th>
                <th>Joined</th>
                <th>Admin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>{p.email ?? '-'}</td>
                  <td><span className={`plan-badge ${p.is_pro ? 'pro' : 'free'}`}>{p.is_pro ? 'Pro' : 'Free'}</span></td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>{p.is_admin ? '✅' : '-'}</td>
                  <td>
                    <button
                      className={`admin-btn admin-btn-sm`}
                      onClick={() => togglePro(p)}
                    >
                      {p.is_pro ? 'Revoke Pro' : 'Grant Pro'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No results</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Revenue Tab ─────────────────────────────────────────────────────────────

function RevenueTab() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch('/api/admin/stripe-summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="admin-loading">Loading revenue data…</div>
  if (error) return <div className="admin-loading" style={{ color: '#f87171' }}>Error: {error}</div>
  if (!data) return null

  return (
    <div>
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="stat-label">MRR</div>
          <div className="stat-value">${(data.mrr / 100).toFixed(2)}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Active Subs</div>
          <div className="stat-value">{data.activeCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Monthly</div>
          <div className="stat-value">{data.monthlyCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Annual</div>
          <div className="stat-value">{data.annualCount}</div>
        </div>
      </div>

      <div className="section-heading">Recent Transactions</div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Customer</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.recentTransactions.map((t, i) => (
              <tr key={i}>
                <td>{new Date(t.date).toLocaleDateString()}</td>
                <td>{(t.amount / 100).toFixed(2)} {t.currency.toUpperCase()}</td>
                <td>{t.customerEmail}</td>
                <td>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Site Health Tab ─────────────────────────────────────────────────────────

function HealthTab() {
  const [sbStatus, setSbStatus] = useState<HealthStatus>({ status: 'loading' })
  const [psStatus, setPsStatus] = useState<HealthStatus>({ status: 'loading' })
  const [vercelStatus, setVercelStatus] = useState<HealthStatus>({ status: 'loading' })

  const checkAll = useCallback(async () => {
    setSbStatus({ status: 'loading' })
    setPsStatus({ status: 'loading' })
    setVercelStatus({ status: 'loading' })

    // Supabase ping
    const t0 = Date.now()
    supabase.from('profiles').select('id').limit(1).then(({ error }) => {
      const ms = Date.now() - t0
      if (error) setSbStatus({ status: 'error', value: error.message })
      else setSbStatus({ status: 'ok', value: `OK - ${ms}ms` })
    })

    // PageSpeed
    fetch('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://www.theliminal.app&strategy=mobile')
      .then(r => r.json())
      .then(d => {
        const cats = d?.lighthouseResult?.categories
        const score = Math.round((cats?.performance?.score ?? 0) * 100)
        const lcp = d?.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue ?? '-'
        const cls = d?.lighthouseResult?.audits?.['cumulative-layout-shift']?.displayValue ?? '-'
        setPsStatus({ status: 'ok', value: `Score: ${score} | LCP: ${lcp} | CLS: ${cls}` })
      })
      .catch(e => setPsStatus({ status: 'error', value: e.message }))

    // Vercel
    fetch('/api/admin/vercel-status')
      .then(r => r.json())
      .then(d => {
        setVercelStatus({ status: 'ok', value: `${d.state} - ${d.meta?.githubCommitSha?.slice(0, 7) ?? d.deploymentId?.slice(0, 8)} - ${new Date(d.createdAt).toLocaleString()}` })
      })
      .catch(e => setVercelStatus({ status: 'error', value: e.message }))
  }, [])

  useEffect(() => { checkAll() }, [checkAll])

  const rows = [
    { label: '🗄 Supabase', st: sbStatus },
    { label: '⚡ PageSpeed', st: psStatus },
    { label: '🚀 Vercel Deploy', st: vercelStatus },
  ]

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="admin-btn-accent" onClick={checkAll}>↻ Refresh All</button>
      </div>
      {rows.map(({ label, st }) => (
        <div className="health-row" key={label}>
          <div className={`health-dot ${st.status}`} />
          <div className="health-label">{label}</div>
          <div className="health-value">{st.status === 'loading' ? 'Checking…' : st.value}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Controls Tab ────────────────────────────────────────────────────────────

function ControlsTab() {
  const [config, setConfig] = useState<AppConfig>({
    ai_enabled: true,
    new_signups_enabled: true,
    maintenance_mode: false,
    broadcast_message: '',
  })
  const [loading, setLoading] = useState(true)
  const [broadcastInput, setBroadcastInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('app_config').select('*').then(({ data }) => {
      if (!data) { setLoading(false); return }
      const m: Record<string, string> = {}
      for (const row of data) m[row.key] = row.value
      setConfig({
        ai_enabled: m['ai_enabled'] !== 'false',
        new_signups_enabled: m['new_signups_enabled'] !== 'false',
        maintenance_mode: m['maintenance_mode'] === 'true',
        broadcast_message: m['broadcast_message'] ?? '',
      })
      setBroadcastInput(m['broadcast_message'] ?? '')
      setLoading(false)
    })
  }, [])

  async function upsertConfig(key: string, value: string) {
    await supabase.from('app_config').upsert({ key, value, updated_at: new Date().toISOString() })
  }

  async function toggleSwitch(key: keyof AppConfig) {
    const newVal = !config[key]
    setConfig(prev => ({ ...prev, [key]: newVal }))
    await upsertConfig(key, String(newVal))
  }

  async function saveBroadcast() {
    setSaving(true)
    await upsertConfig('broadcast_message', broadcastInput)
    setConfig(prev => ({ ...prev, broadcast_message: broadcastInput }))
    setSaving(false)
  }

  const toggleDefs = [
    { key: 'ai_enabled' as const, label: 'AI Enabled', desc: 'Allow AI meditation features' },
    { key: 'new_signups_enabled' as const, label: 'New Signups Enabled', desc: 'Allow new user registrations' },
    { key: 'maintenance_mode' as const, label: 'Maintenance Mode', desc: 'Show maintenance banner to all users' },
  ]

  if (loading) return <div className="admin-loading">Loading config…</div>

  return (
    <div>
      <div className="section-heading">Kill Switches</div>
      {toggleDefs.map(({ key, label, desc }) => (
        <div className="toggle-row" key={key}>
          <div className="toggle-info">
            <div className="toggle-label">{label}</div>
            <div className="toggle-desc">{desc}</div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={config[key] as boolean}
              onChange={() => toggleSwitch(key)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      ))}

      <div className="section-heading">Broadcast Message</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
        Shown as a banner to all users. Leave empty to hide.
      </div>
      <div className="broadcast-row">
        <input
          className="admin-text-input"
          placeholder="Enter broadcast message…"
          value={broadcastInput}
          onChange={e => setBroadcastInput(e.target.value)}
        />
        <button className="admin-btn-accent" onClick={saveBroadcast} disabled={saving}>
          {saving ? 'Saving…' : 'Set'}
        </button>
      </div>
    </div>
  )
}

// ─── Reports Tab ─────────────────────────────────────────────────────────────

function ReportsTab() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProfiles((data as Profile[]) ?? []); setLoading(false) })
  }, [])

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const total = profiles.length
  const pro = profiles.filter(p => p.is_pro).length
  const free = total - pro
  const newWeek = profiles.filter(p => new Date(p.created_at) >= weekAgo).length
  const newMonth = profiles.filter(p => new Date(p.created_at) >= monthAgo).length

  function exportCSV() {
    const header = 'Email,Plan,Joined,is_admin'
    const rows = profiles.map(p =>
      `${p.email ?? ''},${p.is_pro ? 'Pro' : 'Free'},${p.created_at},${p.is_admin}`
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'liminal-users.csv'
    a.click()
  }

  function exportJSON() {
    const summary = { total, pro, free, newWeek, newMonth, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'liminal-summary.json'
    a.click()
  }

  if (loading) return <div className="admin-loading">Loading…</div>

  return (
    <div>
      <div className="admin-stats-row">
        {[
          { label: 'Total Users', value: total },
          { label: 'Pro Users', value: pro },
          { label: 'Free Users', value: free },
          { label: 'New This Week', value: newWeek },
          { label: 'New This Month', value: newMonth },
        ].map(s => (
          <div className="admin-stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="admin-controls-row" style={{ marginTop: '1rem' }}>
        <button className="admin-btn-accent" onClick={exportCSV}>⬇ Export Users CSV</button>
        <button className="admin-btn-accent" onClick={exportJSON}>⬇ Export Summary JSON</button>
      </div>
    </div>
  )
}

// ─── Main AdminConsole ────────────────────────────────────────────────────────


// ─── AI Usage Tab ─────────────────────────────────────────────────────────────

interface AiUsageRow {
  id: string
  user_id: string | null
  created_at: string
  feature: string
  model: string
  input_tokens: number
  output_tokens: number
  tts_chars: number
  estimated_cost_usd: number
}

function AiUsageTab() {
  const [rows, setRows] = useState<AiUsageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase.from('ai_usage').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setRows((data as AiUsageRow[]) ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const totalCalls = rows.length
  const totalCost = rows.reduce((sum, r) => sum + Number(r.estimated_cost_usd), 0)
  const callsToday = rows.filter(r => new Date(r.created_at) >= today).length
  const callsThisWeek = rows.filter(r => new Date(r.created_at) >= weekAgo).length

  const userCostMap = new Map<string, number>()
  rows.forEach(r => {
    const key = r.user_id ?? 'anonymous'
    userCostMap.set(key, (userCostMap.get(key) ?? 0) + Number(r.estimated_cost_usd))
  })
  const topUsers = Array.from(userCostMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)

  if (loading) return <div className="admin-loading">Loading AI usage data...</div>

  return (
    <div>
      <div className="admin-stats-row">
        {[
          { label: 'Total Calls', value: totalCalls },
          { label: 'Total Cost', value: `$${totalCost.toFixed(4)}` },
          { label: 'Calls Today', value: callsToday },
          { label: 'Calls This Week', value: callsThisWeek },
        ].map(s => (
          <div className="admin-stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="section-heading" style={{ marginTop: '1.5rem' }}>Recent AI Calls</div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th><th>User ID</th><th>Feature</th><th>Model</th><th>Tokens in/out</th><th>TTS Chars</th><th>Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td style={{ fontSize: '0.75rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.user_id ?? 'anon'}</td>
                <td>{r.feature}</td>
                <td>{r.model}</td>
                <td>{r.input_tokens} / {r.output_tokens}</td>
                <td>{r.tts_chars}</td>
                <td>${Number(r.estimated_cost_usd).toFixed(5)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No AI usage recorded yet</td></tr>}
          </tbody>
        </table>
      </div>
      {topUsers.length > 0 && (
        <>
          <div className="section-heading" style={{ marginTop: '1.5rem' }}>Top Users by AI Cost</div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>User ID</th><th>Total Cost</th></tr></thead>
              <tbody>
                {topUsers.map(([uid, cost]) => (
                  <tr key={uid}><td style={{ fontSize: '0.75rem' }}>{uid}</td><td>${cost.toFixed(5)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ─── FAQ Admin Tab ────────────────────────────────────────────────────────────

type FaqEntry = {
  id: string
  category: string
  question: string
  answer: string
  order: number
}

const FAQ_CATEGORIES = ['Getting Started', 'Audio & Science', 'Subscription', 'Account', 'Technical'] as const

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

function FaqAdminTab() {
  const [entries, setEntries] = useState<FaqEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<Partial<FaqEntry>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('app_config').select('value').eq('key', 'faq_entries').single()
    try {
      if (data?.value) setEntries(JSON.parse(data.value) as FaqEntry[])
      else setEntries(DEFAULT_FAQ)
    } catch { setEntries(DEFAULT_FAQ) }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const save = async (updated: FaqEntry[]) => {
    setSaving(true)
    await supabase.from('app_config').upsert({ key: 'faq_entries', value: JSON.stringify(updated), updated_at: new Date().toISOString() })
    setEntries(updated)
    setSaving(false)
  }

  const deleteEntry = (id: string) => { void save(entries.filter(e => e.id !== id)) }

  const submitForm = () => {
    if (!form.category || !form.question || !form.answer) return
    const id = form.id ?? `faq-${Date.now()}`
    const entry: FaqEntry = { id, category: form.category, question: form.question, answer: form.answer, order: form.order ?? 99 }
    const updated = editingId ? entries.map(e => e.id === editingId ? entry : e) : [...entries, entry]
    void save(updated)
    setEditingId(null); setShowAddForm(false); setForm({})
  }

  const startEdit = (e: FaqEntry) => { setForm(e); setEditingId(e.id); setShowAddForm(true) }

  if (loading) return <div className="admin-loading">Loading FAQ...</div>

  return (
    <div>
      <div className="admin-controls-row" style={{ marginBottom: '1rem' }}>
        <button className="admin-btn-accent" onClick={() => { setForm({}); setEditingId(null); setShowAddForm(true) }}>+ Add Entry</button>
        {saving && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Saving...</span>}
      </div>
      {(showAddForm || editingId) && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10, padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <select className="admin-search" value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option value="">-- Category --</option>
            {FAQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="admin-search" placeholder="Question" value={form.question ?? ''} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
          <textarea className="admin-search" rows={4} placeholder="Answer" style={{ resize: 'vertical' }} value={form.answer ?? ''} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} />
          <input className="admin-search" type="number" placeholder="Order (1=top)" value={form.order ?? ''} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="admin-btn-accent" onClick={submitForm}>{editingId ? 'Update' : 'Add'}</button>
            <button className="admin-btn" onClick={() => { setShowAddForm(false); setEditingId(null); setForm({}) }}>Cancel</button>
          </div>
        </div>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Category</th><th>Question</th><th>Order</th><th>Actions</th></tr></thead>
          <tbody>
            {[...entries].sort((a, b) => a.order - b.order).map(e => (
              <tr key={e.id}>
                <td><span style={{ fontSize: '0.78rem' }}>{e.category}</span></td>
                <td style={{ maxWidth: 300 }}>{e.question}</td>
                <td>{e.order}</td>
                <td>
                  <button className="admin-btn admin-btn-sm" onClick={() => startEdit(e)} style={{ marginRight: '0.3rem' }}>Edit</button>
                  <button className="admin-btn admin-btn-sm" style={{ color: '#f87171' }} onClick={() => deleteEntry(e.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No entries yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
// ─── Feature Usage Tab ────────────────────────────────────────────────────────

interface FeatureUsageRow {
  id: string
  user_id: string | null
  created_at: string
  feature: string
  action: string | null
  metadata: Record<string, unknown>
}

function FeatureUsageTab() {
  const [rows, setRows] = useState<FeatureUsageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase.from('feature_usage')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => { setRows((data as FeatureUsageRow[]) ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)

  const todayRows = rows.filter(r => new Date(r.created_at) >= todayStart)
  const weekRows = rows.filter(r => new Date(r.created_at) >= weekAgo)

  // Most used feature
  const featureCount = new Map<string, number>()
  rows.forEach(r => featureCount.set(r.feature, (featureCount.get(r.feature) ?? 0) + 1))
  const mostUsed = [...featureCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-'

  // Unique users today
  const uniqueUsersToday = new Set(todayRows.map(r => r.user_id ?? 'anon')).size

  // Feature breakdown
  const featureStats = Array.from(featureCount.entries()).map(([feature, count]) => {
    const featureRows = rows.filter(r => r.feature === feature)
    const uniqueUsers = new Set(featureRows.map(r => r.user_id ?? 'anon')).size
    const lastUsed = featureRows[0]?.created_at ?? ''
    return { feature, count, uniqueUsers, lastUsed }
  }).sort((a, b) => b.count - a.count)

  const maxCount = featureStats[0]?.count ?? 1
  const recent50 = rows.slice(0, 50)

  if (loading) return <div className="admin-loading">Loading feature usage…</div>

  return (
    <div>
      {/* Stats cards */}
      <div className="admin-stats-row">
        {[
          { label: 'Events Today', value: todayRows.length },
          { label: 'Events This Week', value: weekRows.length },
          { label: 'Most Used Feature', value: mostUsed },
          { label: 'Unique Users Today', value: uniqueUsersToday },
        ].map(s => (
          <div className="admin-stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={typeof s.value === 'string' && s.value.length > 8 ? { fontSize: '1.1rem' } : {}}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Top features bar chart */}
      {featureStats.length > 0 && (
        <>
          <div className="section-heading">Top Features</div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem' }}>
            {featureStats.slice(0, 10).map(({ feature, count }) => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                <div style={{ width: '110px', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                  {feature}
                </div>
                <div style={{ flex: 1, background: 'var(--bg-section)', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.round((count / maxCount) * 100)}%`,
                    background: 'var(--accent, #a78bfa)',
                    height: '100%',
                    borderRadius: 4,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ width: 32, fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Feature breakdown table */}
      <div className="section-heading">Feature Breakdown</div>
      <div className="admin-table-wrap" style={{ marginBottom: '1.5rem' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Total Opens</th>
              <th>Unique Users</th>
              <th>Last Used</th>
            </tr>
          </thead>
          <tbody>
            {featureStats.map(({ feature, count, uniqueUsers, lastUsed }) => (
              <tr key={feature}>
                <td>{feature}</td>
                <td>{count}</td>
                <td>{uniqueUsers}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {lastUsed ? new Date(lastUsed).toLocaleString() : '-'}
                </td>
              </tr>
            ))}
            {featureStats.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No feature usage recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recent events */}
      <div className="section-heading">Recent Events</div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Feature</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {recent50.map(r => (
              <tr key={r.id}>
                <td style={{ fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleString()}</td>
                <td style={{ fontSize: '0.75rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.user_id ? r.user_id.slice(0, 8) + '…' : 'anon'}
                </td>
                <td>{r.feature}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.action ?? '-'}</td>
              </tr>
            ))}
            {recent50.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No events yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminConsole() {
  const [activeTab, setActiveTab] = useState<Tab>('customers')

  const navItems: { id: Tab; icon: string; label: string; title: string; subtitle: string }[] = [
    { id: 'customers', icon: '👥', label: 'Customers',    title: 'Customer Management',  subtitle: 'View and manage all user accounts' },
    { id: 'revenue',   icon: '💳', label: 'Revenue',      title: 'Revenue & Billing',     subtitle: 'Stripe subscription data and transactions' },
    { id: 'health',    icon: '🏥', label: 'Site Health',  title: 'Site Health',           subtitle: 'System status and performance metrics' },
    { id: 'controls',  icon: '⚙️', label: 'Controls',     title: 'App Controls',          subtitle: 'Global settings and kill switches' },
    { id: 'ai',        icon: '🤖', label: 'AI Usage',     title: 'AI Usage',              subtitle: 'Meditation generation stats and costs' },
    { id: 'reports',   icon: '📊', label: 'Reports',      title: 'Reports & Exports',     subtitle: 'Data exports and analytics summaries' },
    { id: 'faq',       icon: '❓', label: 'FAQ',          title: 'Help Center FAQ',       subtitle: 'Manage user-facing FAQ content' },
    { id: 'usage',     icon: '📈', label: 'Feature Usage',title: 'Feature Usage',         subtitle: 'See which features users are actually using' },
  ]

  const active = navItems.find(n => n.id === activeTab)!

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-title">Admin Console</div>
          <div className="admin-sidebar-logo">🔐 Liminal</div>
        </div>
        <nav className="admin-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`admin-nav-item${activeTab === item.id ? ' active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-back-btn" onClick={() => { window.location.href = '/app' }}>
            ← Back to App
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="admin-content">
        <div className="admin-content-header">
          <h2 className="admin-content-title">{active.title}</h2>
          <p className="admin-content-subtitle">{active.subtitle}</p>
        </div>

        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'revenue'   && <RevenueTab />}
        {activeTab === 'health'    && <HealthTab />}
        {activeTab === 'controls'  && <ControlsTab />}
        {activeTab === 'reports'   && <ReportsTab />}
        {activeTab === 'ai'        && <AiUsageTab />}
        {activeTab === 'faq'       && <FaqAdminTab />}
        {activeTab === 'usage'     && <FeatureUsageTab />}
      </main>
    </div>
  )
}
