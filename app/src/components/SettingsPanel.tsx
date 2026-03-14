import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'

type SettingsPanelProps = {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { user, isPro } = useAuth()
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
            <button className="soft-button" onClick={saveDisplayName}>Save</button>
          </div>
        </div>

        {/* Subscription */}
        <div className="section-block">
          <div className="section-title">Subscription</div>
          <div className="section-card">
            {isPro ? (
              <>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>✅ Pro subscriber</p>
                <a className="soft-button" href="#" style={{ display: 'inline-block', textDecoration: 'none' }}>
                  Manage subscription
                </a>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Current plan: <strong>Free</strong></p>
                <button className="soft-button" onClick={() => openUpgradeModal('Settings')}>
                  Upgrade to Pro →
                </button>
              </>
            )}
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
                  ☀️ Light
                </button>
                <button
                  className="soft-button"
                  style={{ opacity: theme === 'dark' ? 1 : 0.5 }}
                  onClick={() => applyTheme('dark')}
                >
                  🌙 Dark
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Headphone reminder</span>
              <button
                className="soft-button"
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
          </div>
        </div>
      </div>
    </div>
  )
}
