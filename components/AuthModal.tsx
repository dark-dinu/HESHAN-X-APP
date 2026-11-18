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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#fff' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h3>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Close">✕</button>
        </div>

        <p style={{ margin: '0 0 18px', fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
          {mode === 'login'
            ? 'ඔබගේ Gmail සහ Password ලබා දී ගිණුමට පිවිසෙන්න.'
            : 'නම, Gmail සහ Password ලබා දී නව ගිණුමක් සාදන්න.'}
        </p>

        {/* Tab Switcher */}
        <div style={tabContainerStyle}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError('') }}
            style={mode === 'login' ? activeTabStyle : inactiveTabStyle}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError('') }}
            style={mode === 'register' ? activeTabStyle : inactiveTabStyle}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <div>
              <label style={labelStyle}>Your Name</label>
              <input
                type="text"
                placeholder="උදා: Dinidu Heshan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>Gmail Address</label>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              placeholder="අවම අකුරු 6ක්"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', padding: '9px 12px', borderRadius: 10, fontSize: 12.5 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={submitBtnStyle}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 6, 23, 0.8)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 9999,
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 380,
  background: '#0f172a',
  border: '1px solid rgba(56, 189, 248, 0.25)',
  borderRadius: 20,
  padding: 22,
  boxShadow: '0 20px 50px rgba(0,0,0,0.65)',
}

const closeBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: 'none',
  color: '#cbd5e1',
  width: 30,
  height: 30,
  borderRadius: 999,
  cursor: 'pointer',
  fontSize: 13,
}

const tabContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 6,
  background: 'rgba(2, 6, 23, 0.6)',
  padding: 4,
  borderRadius: 12,
  marginBottom: 16,
  border: '1px solid rgba(148, 163, 184, 0.12)',
}

const activeTabStyle: React.CSSProperties = {
  padding: '8px',
  borderRadius: 9,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
}

const inactiveTabStyle: React.CSSProperties = {
  padding: '8px',
  borderRadius: 9,
  border: 'none',
  background: 'transparent',
  color: '#94a3b8',
  fontWeight: 500,
  fontSize: 13,
  cursor: 'pointer',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11.5,
  color: '#94a3b8',
  marginBottom: 5,
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 11,
  background: 'rgba(2, 6, 23, 0.7)',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  color: '#fff',
  fontSize: 13.5,
  outline: 'none',
  boxSizing: 'border-box',
}

const submitBtnStyle: React.CSSProperties = {
  marginTop: 6,
  padding: '12px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
}
