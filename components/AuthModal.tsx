'use client'
import { useState } from 'react'

export type AuthUser = {
  id: string
  name: string
  email: string
  avatar?: string
}

export default function AuthModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: (user: AuthUser) => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, name, email, password }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        onSuccess(data.user)
        onClose()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#fff' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h3>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Close">✕</button>
        </div>

        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#94a3b8' }}>
          {mode === 'login'
            ? 'ඔබගේ ගිණුමට පිවිස ඔබගේ පෞද්ගලික ඉතිහාසය ආරක්ෂිතව තබාගන්න.'
            : 'Gmail සහ Password ලබා දී නව ගිණුමක් සාදන්න.'}
        </p>

        {/* Google Login Button */}
        <a href="/api/auth/google" style={googleBtnStyle}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          <span>Continue with Google</span>
        </a>

        <div style={dividerStyle}>
          <span style={{ background: '#0f172a', padding: '0 10px', color: '#64748b', fontSize: 12 }}>OR</span>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Your Name (උදා: Dinidu Heshan)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Gmail Address (example@gmail.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password (අවම අකුරු 6ක්)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', padding: '9px 12px', borderRadius: 10, fontSize: 12.5 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={submitBtnStyle}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
          {mode === 'login' ? (
            <>
              ගිණුමක් නැද්ද?{' '}
              <button type="button" onClick={() => { setMode('register'); setError('') }} style={switchLinkStyle}>
                Register වන්න
              </button>
            </>
          ) : (
            <>
              දැනටමත් ගිණුමක් තියෙනවද?{' '}
              <button type="button" onClick={() => { setMode('login'); setError('') }} style={switchLinkStyle}>
                Login වන්න
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 6, 23, 0.78)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 9999,
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 400,
  background: '#0f172a',
  border: '1px solid rgba(56, 189, 248, 0.25)',
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
}

const closeBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: 'none',
  color: '#cbd5e1',
  width: 30,
  height: 30,
  borderRadius: 999,
  cursor: 'pointer',
  fontSize: 14,
}

const googleBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  width: '100%',
  padding: '11px 16px',
  borderRadius: 12,
  background: '#ffffff',
  color: '#0f172a',
  fontWeight: 600,
  fontSize: 14,
  textDecoration: 'none',
  boxSizing: 'border-box',
}

const dividerStyle: React.CSSProperties = {
  position: 'relative',
  textAlign: 'center',
  margin: '18px 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
  lineHeight: '0.1em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  background: 'rgba(15, 23, 42, 0.9)',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const submitBtnStyle: React.CSSProperties = {
  marginTop: 4,
  padding: '12px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 14.5,
  cursor: 'pointer',
}

const switchLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#38bdf8',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  fontSize: 13,
}
