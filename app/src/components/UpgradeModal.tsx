import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'

export function UpgradeModal() {
  const { user, isPro } = useAuth()
  const { showUpgradeModal, upgradeFeatureName, closeUpgradeModal } = useSubscription()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAuth, setShowAuth] = useState(false)

  if (!showUpgradeModal) return null

  const handleUpgrade = async (priceId: string) => {
    if (!user) {
      setShowAuth(true)
      return
    }
    setLoading(priceId)
    setError(null)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id, email: user.email }),
      })
      if (!res.ok) throw new Error('Failed to create checkout session')
      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeUpgradeModal() }}>
      <div className="modal-box upgrade-modal">
        <button className="modal-close-btn" onClick={closeUpgradeModal} aria-label="Close">✕</button>

        <div className="upgrade-header">
          <div className="upgrade-icon">✨</div>
          <h2 className="modal-title">Unlock Liminal Pro</h2>
          {upgradeFeatureName && upgradeFeatureName !== 'Pro' && (
            <p className="upgrade-feature-hint">🔒 {upgradeFeatureName} is a Pro feature</p>
          )}
        </div>

        <div className="upgrade-comparison">
          <div className="upgrade-col upgrade-col--free">
            <div className="upgrade-col-header">Free</div>
            <ul className="upgrade-feature-list">
              <li>✅ Binaural tones</li>
              <li>✅ 2 soundscapes</li>
              <li>✅ Sessions up to 15 min</li>
              <li>✅ Home dashboard</li>
              <li className="upgrade-locked">🔒 Journey builder</li>
              <li className="upgrade-locked">🔒 Studio mixer</li>
              <li className="upgrade-locked">🔒 AI meditation</li>
              <li className="upgrade-locked">🔒 Music player</li>
              <li className="upgrade-locked">🔒 Session journal</li>
              <li className="upgrade-locked">🔒 Unlimited soundscapes</li>
              <li className="upgrade-locked">🔒 Sessions up to 3 hours</li>
            </ul>
          </div>
          <div className="upgrade-col upgrade-col--pro">
            <div className="upgrade-col-header upgrade-col-header--pro">Pro ✨</div>
            <ul className="upgrade-feature-list">
              <li>✅ Everything in Free</li>
              <li>✅ All soundscapes</li>
              <li>✅ Sessions up to 3 hours</li>
              <li>✅ Journey builder</li>
              <li>✅ Studio mixer</li>
              <li>✅ AI meditation guide</li>
              <li>✅ Music player</li>
              <li>✅ Session journal</li>
              <li>✅ Future features</li>
            </ul>
          </div>
        </div>

        {!isPro && !showAuth && (
          <div className="upgrade-actions">
            <button
              className="upgrade-btn upgrade-btn--annual"
              onClick={() => void handleUpgrade(import.meta.env.VITE_STRIPE_PRICE_ANNUAL as string)}
              disabled={!!loading}
            >
              {loading === import.meta.env.VITE_STRIPE_PRICE_ANNUAL ? '⏳ Redirecting…' : '🌟 Pro Annual — $39.99/yr (best value)'}
            </button>
            <button
              className="upgrade-btn upgrade-btn--monthly"
              onClick={() => void handleUpgrade(import.meta.env.VITE_STRIPE_PRICE_MONTHLY as string)}
              disabled={!!loading}
            >
              {loading === import.meta.env.VITE_STRIPE_PRICE_MONTHLY ? '⏳ Redirecting…' : 'Pro Monthly — $5.99/mo'}
            </button>
            {!user && (
              <p className="upgrade-signin-hint">
                Already have an account? <button className="link-btn" onClick={() => setShowAuth(true)}>Sign in</button>
              </p>
            )}
            {error && <p className="upgrade-error">{error}</p>}
          </div>
        )}

        {showAuth && !user && (
          <InlineAuthForm onSuccess={() => setShowAuth(false)} />
        )}

        {isPro && (
          <p style={{ textAlign: 'center', color: '#a78bfa', fontWeight: 600 }}>
            ✨ You're already on Pro!
          </p>
        )}
      </div>
    </div>
  )
}

function InlineAuthForm({ onSuccess }: { onSuccess: () => void }) {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setLoading(true)
    setError(null)
    const err = tab === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    onSuccess()
  }

  return (
    <div className="inline-auth">
      <div className="auth-tabs">
        <button className={tab === 'signin' ? 'auth-tab active' : 'auth-tab'} onClick={() => setTab('signin')}>Sign In</button>
        <button className={tab === 'signup' ? 'auth-tab active' : 'auth-tab'} onClick={() => setTab('signup')}>Sign Up</button>
      </div>
      <input className="text-input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="text-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && void handle()} />
      {error && <p className="upgrade-error">{error}</p>}
      <button className="upgrade-btn upgrade-btn--annual" onClick={() => void handle()} disabled={loading}>
        {loading ? '⏳ Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
      </button>
    </div>
  )
}
