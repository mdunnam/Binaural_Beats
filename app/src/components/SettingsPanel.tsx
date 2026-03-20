import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { NotificationSettings } from './NotificationSettings'
import { IconCheck, IconSunrise, IconMoon, IconLock } from './Icons'

type SettingsPanelProps = {
  onClose: () => void
  onError?: (msg: string) => void
}

export function SettingsPanel({ onClose, onError }: SettingsPanelProps) {
  const { user, isPro, profile } = useAuth()
  const { openUpgradeModal } = useSubscription()

  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('liminal-display-name') ?? ''
  )
  const [headphoneReminder, setHeadphoneReminder] = useState(
    () => localStorage.getItem('liminal-headphone-reminder') === 'true'
  )
  const [theme, setTheme] = useState(
    () => localStorage.getItem('liminal-theme') ?? 'dark'
  )
  const [portalLoading, setPortalLoading] = useState(false)

  function saveDisplayName() {
    localStorage.setItem('liminal-display-name', displayName)
  }

  function applyTheme(t: string) {
    setTheme(t)
    localStorage.setItem('liminal-theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  function toggleHeadphoneReminder() {
    const next = !headphoneReminder
    setHeadphoneReminder(next)
    localStorage.setItem('liminal-headphone-reminder', String(next))
  }

  async function openBillingPortal() {
    if (!user?.email) return
    setPortalLoading(true)
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        const msg = data.error ?? 'Could not open billing portal'
        if (onError) onError(msg); else alert(msg)
      }
    } catch {
      const msg = 'Could not open billing portal'
      if (onError) onError(msg); else alert(msg)
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="settings-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        {/* Account */}
        <div className="section-block">
          <div className="section-title">Account</div>
          <div className="section-card">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Email
            </label>
            <input
              className="text-input"
              type="text"
              value={user?.email ?? ''}
              readOnly
              style={{ marginBottom: '0.75rem', opacity: 0.7 }}
            />
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Display Name
            </label>
            <input
              className="text-input"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              style={{ marginBottom: '0.75rem' }}
            />
            <button className="soft-button soft-button--accent" onClick={saveDisplayName}>Save</button>
          </div>
        </div>

        {/* Subscription */}
        <div className="section-block">
          <div className="section-title">Subscription</div>
          <div className="section-card">
            {isPro ? (
              <>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><IconCheck size={14} /> Pro subscriber</p>
                <a className="soft-button soft-button--accent" href="#" style={{ display: 'inline-block', textDecoration: 'none' }}
                  onClick={e => { e.preventDefault(); void openBillingPortal() }}>
                  {portalLoading ? 'Opening…' : 'Manage subscription'}
                </a>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Current plan: <strong>Free</strong></p>
                <button className="soft-button soft-button--accent" onClick={() => openUpgradeModal('Settings')}>
                  Upgrade to Pro →
                </button>
              </>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="section-block">
          <div className="section-title">Notifications</div>
          <div className="section-card">
            <NotificationSettings />
          </div>
        </div>

        {/* Preferences */}
        <div className="section-block">
          <div className="section-title">Preferences</div>
          <div className="section-card">
            <div style={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Default theme
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className={`soft-button${theme === 'light' ? '' : ''}`}
                  style={{ opacity: theme === 'light' ? 1 : 0.5 }}
                  onClick={() => applyTheme('light')}
                >
                  <IconSunrise size={14} /> Light
                </button>
                <button
                  className="soft-button"
                  style={{ opacity: theme === 'dark' ? 1 : 0.5 }}
                  onClick={() => applyTheme('dark')}
                >
                  <IconMoon size={14} /> Dark
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Headphone reminder</span>
              <button
                className="soft-button soft-button--accent"
                style={{ minWidth: 56, fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                onClick={toggleHeadphoneReminder}
              >
                {headphoneReminder ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="section-block">
          <div className="section-title">About</div>
          <div className="section-card" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <div>Liminal v1.0</div>
            <div><a href="https://theliminal.app" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>theliminal.app</a></div>
            <div>© 2025 Liminal. All rights reserved.</div>
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <a href="/landing/terms.html" target="_blank" rel="noopener" className="link-btn">Terms of Service</a>
              <a href="/landing/privacy.html" target="_blank" rel="noopener" className="link-btn">Privacy Policy</a>
              <a href="/landing/eula.html" target="_blank" rel="noopener" className="link-btn">EULA</a>
              {profile?.is_admin && (
                <button
                  className="link-btn"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, color: 'var(--accent, #a78bfa)' }}
                  onClick={() => { window.location.href = '/admin' }}
                >
                  <IconLock size={14} /> Admin Console
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
