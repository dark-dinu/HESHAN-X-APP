'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AuthModal, { AuthUser } from './AuthModal'

export default function Nav() {
  const path = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d?.user) setUser(d.user) })
      .catch(() => {})
  }, [])

  const logout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    setUser(null)
  }

  return (
    <>
      <nav>
        <Link href="/" className="logo">HESHAN <b>OFC</b></Link>
        <div className="links" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/" className={path === '/' ? 'on' : ''}>Downloader</Link>
          <Link href="/music" className={path.startsWith('/music') ? 'on' : ''}>Music Hub</Link>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
              <span
                title={user.email}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(56, 189, 248, 0.14)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#e0f2fe',
                  padding: '5px 11px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                ) : (
                  <span>👤</span>
                )}
                <span>{user.name.split(' ')[0]}</span>
              </span>
              <button
                onClick={logout}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  padding: '5px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Exit
              </button>
            </div>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                border: 'none',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                marginLeft: 4,
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      <AuthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(u) => setUser(u)}
      />
    </>
  )
}
