import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

type Props = {
  onClose: () => void
}

export function AuthModal({ onClose }: Props) {
  const { signIn, signUp, refreshProfile } = useAuth()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handle = async () => {
    setLoading(true)
    setError(null)
    const err = tab === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    if (tab === 'signup') {
      setSuccess(true)
      return
    }
    await refreshProfile()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box auth-modal">
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        <h2 className="modal-title">Welcome to Liminal</h2>

        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <p>📧 Check your email to confirm your account, then sign in!</p>
            <button className="soft-button" style={{ marginTop: '1rem' }} onClick={() => setTab('signin')}>
              Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button className={tab === 'signin' ? 'auth-tab active' : 'auth-tab'} onClick={() => setTab('signin')}>Sign In</button>
              <button className={tab === 'signup' ? 'auth-tab active' : 'auth-tab'} onClick={() => setTab('signup')}>Sign Up</button>
            </div>
            <div className="grid" style={{ gap: '0.75rem' }}>
              <input
                className="text-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
              <input
                className="text-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handle()}
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              />
              {error && <p className="upgrade-error">{error}</p>}
              <button className="start-button" onClick={() => void handle()} disabled={loading}>
                {loading ? '⏳ Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
