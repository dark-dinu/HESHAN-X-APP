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

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Downloader',
    desc: 'TikTok, YT, FB & IG 4K',
    icon: '⬇️',
    badge: 'FAST',
  },
  {
    href: '/music',
    label: 'Music Hub',
    desc: '320kbps HD Stream & MP3',
    icon: '🎵',
    badge: 'HD',
  },
  {
    href: '/chat',
    label: 'Community Chat',
    desc: '24h Auto-Delete Live Room',
    icon: '💬',
    badge: '24H',
  },
]

export default function Nav() {
  const path = usePathname()
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [navDropOpen, setNavDropOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) setUser(d.user)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (navDropRef.current && !navDropRef.current.contains(e.target as Node)) {
        setNavDropOpen(false)
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

  const currentItem =
    NAV_ITEMS.find((item) =>
      item.href === '/' ? path === '/' : path.startsWith(item.href)
    ) || NAV_ITEMS[0]

  return (
    <>
      <style>{`
        @keyframes navDropIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
        .heshan-nav-drop {
          animation: navDropIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .heshan-nav-opt:hover {
          background: rgba(239, 68, 68, 0.14) !important;
          border-color: rgba(239, 68, 68, 0.35) !important;
        }
      `}</style>

      <nav
        style={{
          position: 'relative',
          zIndex: 100,
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

        {/* Animated Center Mode Dropdown */}
        <div ref={navDropRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setNavDropOpen((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 13px',
              borderRadius: 999,
              border: navDropOpen
                ? '1px solid rgba(239, 68, 68, 0.7)'
                : '1px solid rgba(239, 68, 68, 0.38)',
              background:
                'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(15, 23, 42, 0.9))',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: navDropOpen
                ? '0 0 0 3px rgba(239, 68, 68, 0.18), 0 8px 20px rgba(0,0,0,0.5)'
                : '0 4px 14px rgba(239, 68, 68, 0.2)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 13 }}>{currentItem.icon}</span>
            <span>{currentItem.label}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: navDropOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                color: '#f87171',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {navDropOpen && (
            <div
              className="heshan-nav-drop"
              style={{
                position: 'absolute',
                left: '50%',
                top: 'calc(100% + 10px)',
                width: 245,
                background: 'rgba(10, 15, 28, 0.98)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 18,
                padding: 8,
                boxShadow: '0 22px 50px rgba(0, 0, 0, 0.88)',
                backdropFilter: 'blur(20px)',
                zIndex: 999,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: '#64748b',
                  padding: '3px 8px 2px',
                  textTransform: 'uppercase',
                }}
              >
                Select Mode
              </div>

              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === '/' ? path === '/' : path.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setNavDropOpen(false)}
                    className="heshan-nav-opt"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 10px',
                      borderRadius: 12,
                      textDecoration: 'none',
                      background: active
                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.24), rgba(220, 38, 38, 0.1))'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: active
                        ? '1px solid rgba(239, 68, 68, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: active
                          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                          : 'rgba(255, 255, 255, 0.06)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 15,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: '#fff',
                          }}
                        >
                          {item.label}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '2px 5px',
                            borderRadius: 6,
                            background:
                              item.badge === '24H'
                                ? 'rgba(16, 185, 129, 0.18)'
                                : 'rgba(239, 68, 68, 0.18)',
                            color:
                              item.badge === '24H' ? '#34d399' : '#f87171',
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: '#94a3b8',
                          marginTop: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* User Profile / Sign In */}
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
              <span style={{ fontSize: 11 }}>
                {isOwner ? '👑' : isPremium ? '⭐' : '👤'}
              </span>
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
                <div
                  style={{
                    padding: '4px 8px 8px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}
                    >
                      {user.name}
                    </span>
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
                        color: isOwner
                          ? '#facc15'
                          : isPremium
                          ? '#38bdf8'
                          : '#94a3b8',
                      }}
                    >
                      {isOwner ? 'OWNER' : isPremium ? 'PREMIUM' : 'NORMAL'}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#94a3b8',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}
                  >
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
        <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
      )}
    </>
  )
}
