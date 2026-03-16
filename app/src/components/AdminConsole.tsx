// AdminConsole.tsx — Liminal Admin Dashboard
// SQL to create app_config table:
// CREATE TABLE IF NOT EXISTS app_config (key text PRIMARY KEY, value text, updated_at timestamptz DEFAULT now());

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/supabase'
import './AdminConsole.css'

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'customers' | 'revenue' | 'health' | 'controls' | 'reports'

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
                  <td>{p.email ?? '—'}</td>
                  <td><span className={`plan-badge ${p.is_pro ? 'pro' : 'free'}`}>{p.is_pro ? 'Pro' : 'Free'}</span></td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>{p.is_admin ? '✅' : '—'}</td>
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
      else setSbStatus({ status: 'ok', value: `OK — ${ms}ms` })
    })

    // PageSpeed
    fetch('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://www.theliminal.app&strategy=mobile')
      .then(r => r.json())
      .then(d => {
        const cats = d?.lighthouseResult?.categories
        const score = Math.round((cats?.performance?.score ?? 0) * 100)
        const lcp = d?.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue ?? '—'
        const cls = d?.lighthouseResult?.audits?.['cumulative-layout-shift']?.displayValue ?? '—'
        setPsStatus({ status: 'ok', value: `Score: ${score} | LCP: ${lcp} | CLS: ${cls}` })
      })
      .catch(e => setPsStatus({ status: 'error', value: e.message }))

    // Vercel
    fetch('/api/admin/vercel-status')
      .then(r => r.json())
      .then(d => {
        setVercelStatus({ status: 'ok', value: `${d.state} — ${d.meta?.githubCommitSha?.slice(0, 7) ?? d.deploymentId?.slice(0, 8)} — ${new Date(d.createdAt).toLocaleString()}` })
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

export function AdminConsole() {
  const [activeTab, setActiveTab] = useState<Tab>('customers')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'customers', label: '👥 Customers' },
    { id: 'revenue', label: '💳 Revenue' },
    { id: 'health', label: '🏥 Site Health' },
    { id: 'controls', label: '⚙️ Controls' },
    { id: 'reports', label: '📊 Reports' },
  ]

  return (
    <div className="admin-console">
      <div className="admin-header">
        <button className="admin-back-btn" onClick={() => { window.location.href = '/app' }}>← Back</button>
        <h1>🔐 Admin Console</h1>
      </div>

      <div className="admin-tab-bar">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`admin-tab-pill ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-tab-content">
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'revenue' && <RevenueTab />}
        {activeTab === 'health' && <HealthTab />}
        {activeTab === 'controls' && <ControlsTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </div>
  )
}
