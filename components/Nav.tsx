'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AuthModal, { AuthUser } from './AuthModal'
import AdminModal from './AdminModal'

type ExtendedUser = AuthUser & {
  plan?: 'normal' | 'premium'
  isOwner?: boolean
}

export default function Nav() {
  const path = usePathname()
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d?.user) setUser(d.user) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const logout = async () => {
    setMenuOpen(false)
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    setUser(null)
  }

  const isOwner = user?.isOwner || user?.email?.toLowerCase() === 'damiyamalinda@gmail.com'
  const isPremium = isOwner || user?.plan === 'premium'

  return (
    <>
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '10px 12px',
          flexWrap: 'nowrap',
        }}
      >
        <Link
          href="/"
          className="logo"
          style={{
            whiteSpace: 'nowrap',
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: '-0.3px',
            flexShrink: 0,
          }}
        >
          HESHAN <b>OFC</b>
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 999,
            padding: 3,
            flexShrink: 0,
          }}
        >
          <Link
            href="/"
            style={{
              whiteSpace: 'nowrap',
              fontSize: 11.5,
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 999,
              textDecoration: 'none',
              color: path === '/' ? '#fff' : '#94a3b8',
              background: path === '/' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent',
              transition: 'all 0.2s ease',
            }}
          >
            Downloader
          </Link>
          <Link
            href="/music"
            style={{
              whiteSpace: 'nowrap',
              fontSize: 11.5,
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 999,
              textDecoration: 'none',
              color: path.startsWith('/music') ? '#fff' : '#94a3b8',
              background: path.startsWith('/music') ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent',
              transition: 'all 0.2s ease',
            }}
          >
            Music
          </Link>
        </div>

        {user ? (
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: isOwner
                  ? 'rgba(250, 204, 21, 0.14)'
                  : 'rgba(255, 255, 255, 0.07)',
                border: isOwner
                  ? '1px solid rgba(250, 204, 21, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.14)',
                color: '#f8fafc',
                padding: '4px 9px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 11 }}>{isOwner ? '👑' : isPremium ? '⭐' : '👤'}</span>
              <span>{user.name.split(' ')[0]}</span>
              <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  minWidth: 205,
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 14,
                  padding: 10,
                  boxShadow: '0 14px 35px rgba(0,0,0,0.65)',
                  zIndex: 999,
                }}
              >
                <div style={{ padding: '4px 8px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{user.name}</span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 999,
                        background: isOwner
                          ? 'rgba(250, 204, 21, 0.18)'
                          : isPremium
                          ? 'rgba(56, 189, 248, 0.18)'
                          : 'rgba(148, 163, 184, 0.15)',
                        color: isOwner ? '#facc15' : isPremium ? '#38bdf8' : '#94a3b8',
                      }}
                    >
                      {isOwner ? 'OWNER' : isPremium ? 'PREMIUM' : 'NORMAL'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                    {user.email}
                  </div>
                </div>

                {isOwner && (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      setAdminOpen(true)
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'rgba(250, 204, 21, 0.14)',
                      border: '1px solid rgba(250, 204, 21, 0.3)',
                      color: '#facc15',
                      padding: '7px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginBottom: 6,
                    }}
                  >
                    👑 Owner Admin Panel
                  </button>
                )}

                <button
                  onClick={logout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: 'none',
                    color: '#fca5a5',
                    padding: '7px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            style={{
              whiteSpace: 'nowrap',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
              border: 'none',
              color: '#fff',
              padding: '6px 11px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            }}
          >
            Sign In
          </button>
        )}
      </nav>

      <AuthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(u) => setUser(u)}
      />

      {isOwner && (
        <AdminModal
          open={adminOpen}
          onClose={() => setAdminOpen(false)}
        />
      )}
    </>
  )
}
