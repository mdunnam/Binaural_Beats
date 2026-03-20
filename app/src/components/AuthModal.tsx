import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { IconMail } from './Icons'

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

  const switchToSignIn = () => {
    setTab('signin')
    setSuccess(false)
    setError(null)
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box auth-modal">
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        <h2 className="modal-title">Welcome to Liminal</h2>

        {success ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}><IconMail size={40} /></div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Check your email!</p>
            <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              We sent a confirmation link to <strong>{email}</strong>. Click it to verify your account, then come back and sign in.
            </p>
            <button className="start-button" onClick={switchToSignIn}>
              Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button className={tab === 'signin' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setTab('signin'); setError(null) }}>Sign In</button>
              <button className={tab === 'signup' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setTab('signup'); setError(null) }}>Sign Up</button>
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
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handle()}
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              />
              {error && <p className="upgrade-error">{error}</p>}
              <button className="start-button" onClick={() => void handle()} disabled={loading}>
                {loading ? '⏳ Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
              {tab === 'signin' && (
                <p style={{ textAlign: 'center', fontSize: '0.85rem', opacity: 0.6 }}>
                  Don't have an account?{' '}
                  <button className="link-button" onClick={() => { setTab('signup'); setError(null) }}>Sign up free</button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
