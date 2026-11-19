'use client'
import { useEffect, useState } from 'react'

type ManagedUser = {
  id: string
  name: string
  email: string
  plan: 'normal' | 'premium'
  isOwner?: boolean
}

export default function AdminModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/users', { cache: 'no-store' })
      const d = await r.json()
      if (r.ok && Array.isArray(d.users)) {
        setUsers(d.users)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      setMsg(null)
      loadUsers()
    }
  }, [open])

  if (!open) return null

  const updatePlan = async (targetEmail: string, plan: 'premium' | 'normal') => {
    const cleanEmail = targetEmail.trim().toLowerCase()
    if (!cleanEmail) {
      setMsg({ type: 'err', text: 'Email ලිපිනයක් ඇතුළත් කරන්න හෝ තෝරන්න.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, plan }),
      })
      const d = await r.json()
      if (!r.ok) {
        setMsg({ type: 'err', text: d.error || 'Failed to update' })
      } else {
        setMsg({
          type: 'ok',
          text: `${cleanEmail} → ${plan === 'premium' ? '⭐ PREMIUM Unlocked!' : 'Normal Plan'}`,
        })
        setUsers((prev) =>
          prev.map((u) => (u.email === cleanEmail ? { ...u, plan } : u))
        )
      }
    } catch {
      setMsg({ type: 'err', text: 'Network error' })
    }
    setSaving(false)
  }

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(emailInput.trim().toLowerCase()) ||
      u.name.toLowerCase().includes(emailInput.trim().toLowerCase())
  )

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>👑</span>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>
              Owner Admin Panel
            </h3>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#94a3b8' }}>
          පරිශීලකයාගේ Gmail ලිපිනය ඇතුළත් කර හෝ පහළ ලැයිස්තුවෙන් තෝරා <b>Premium</b> unlock කරන්න.
        </p>

        {/* Email Input + Quick Action Buttons */}
        <input
          type="email"
          placeholder="Search or enter user email..."
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          style={inputStyle}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            disabled={saving}
            onClick={() => updatePlan(emailInput, 'premium')}
            style={premiumBtnStyle}
          >
            {saving ? '...' : '⭐ Unlock Premium'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => updatePlan(emailInput, 'normal')}
            style={normalBtnStyle}
          >
            Set Normal
          </button>
        </div>

        {msg && (
          <div
            style={{
              marginTop: 10,
              padding: '8px 11px',
              borderRadius: 10,
              fontSize: 12,
              background: msg.type === 'ok' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(239, 68, 68, 0.14)',
              border: `1px solid ${msg.type === 'ok' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              color: msg.type === 'ok' ? '#86efac' : '#fca5a5',
            }}
          >
            {msg.text}
          </div>
        )}

        {/* Registered Users List */}
        <div style={{ marginTop: 14, fontSize: 11.5, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
          Registered Users ({filtered.length})
        </div>

        <div style={listContainerStyle}>
          {loading ? (
            <div style={{ padding: 14, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
              Loading users...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 14, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
              No users found
            </div>
          ) : (
            filtered.map((u) => (
              <div
                key={u.id}
                onClick={() => setEmailInput(u.email)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: emailInput === u.email ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.03)',
                  border: emailInput === u.email ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.name} {u.isOwner && <span style={{ color: '#facc15', fontSize: 10.5 }}>(Owner)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.email}
                  </div>
                </div>

                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: u.plan === 'premium' ? 'rgba(250, 204, 21, 0.16)' : 'rgba(148, 163, 184, 0.14)',
                    color: u.plan === 'premium' ? '#facc15' : '#cbd5e1',
                    border: u.plan === 'premium' ? '1px solid rgba(250, 204, 21, 0.35)' : '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  {u.plan === 'premium' ? '⭐ PREMIUM' : 'NORMAL'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 6, 23, 0.82)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 9999,
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 410,
  background: '#0f172a',
  border: '1px solid rgba(250, 204, 21, 0.28)',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
}

const closeBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: 'none',
  color: '#cbd5e1',
  width: 28,
  height: 28,
  borderRadius: 999,
  cursor: 'pointer',
  fontSize: 13,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 11,
  background: 'rgba(2, 6, 23, 0.75)',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const premiumBtnStyle: React.CSSProperties = {
  padding: '9px',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(135deg, #eab308, #f59e0b)',
  color: '#0f172a',
  fontWeight: 700,
  fontSize: 12.5,
  cursor: 'pointer',
}

const normalBtnStyle: React.CSSProperties = {
  padding: '9px',
  borderRadius: 10,
  border: '1px solid rgba(148, 163, 184, 0.25)',
  background: 'rgba(255, 255, 255, 0.06)',
  color: '#e2e8f0',
  fontWeight: 600,
  fontSize: 12.5,
  cursor: 'pointer',
}

const listContainerStyle: React.CSSProperties = {
  maxHeight: 220,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  paddingRight: 2,
}
