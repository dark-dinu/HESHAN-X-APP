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

type ModeKey = 'downloader' | 'music' | 'chat'

const NAV_ITEMS: {
  key: ModeKey
  href: string
  label: string
  desc: string
  badge: string
  accent: string
}[] = [
  {
    key: 'downloader',
    href: '/',
    label: 'Downloader',
    desc: 'TikTok, YT, FB & IG 4K',
    badge: 'FAST',
    accent: '#ef4444',
  },
  {
    key: 'music',
    href: '/music',
    label: 'Music Hub',
    desc: '320kbps HD Stream & MP3',
    badge: 'HD',
    accent: '#38bdf8',
  },
  {
    key: 'chat',
    href: '/chat',
    label: 'Community Chat',
    desc: '24h Auto-Delete Live Room',
    badge: '24H',
    accent: '#10b981',
  },
]

function ModeIcon({
  mode,
  size = 18,
  active = false,
}: {
  mode: ModeKey
  size?: number
  active?: boolean
}) {
  if (mode === 'downloader') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={active ? 'heshan-icon-bounce' : ''}
      >
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    )
  }

  if (mode === 'music') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={active ? 'heshan-icon-wave' : ''}
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? 'heshan-icon-pulse' : ''}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CrownIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ color: '#facc15', flexShrink: 0 }}
    >
      <path d="M2 19h20v2H2v-2zm1.5-11L7 12l5-7 5 7 3.5-4L19 17H5L3.5 8z" />
    </svg>
  )
}

function UserIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.8-3.6 5-5 8-5s6.2 1.4 8 5" />
    </svg>
  )
}

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
        @keyframes navMenuSpring {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-14px) scale(0.92);
            filter: blur(6px);
          }
          65% {
            opacity: 1;
            transform: translateX(-50%) translateY(2px) scale(1.01);
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
            filter: blur(0px);
          }
        }

        @keyframes navItemSlide {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes userDropSpring {
          0% {
            opacity: 0;
            transform: translateY(-10px) scale(0.94);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes iconFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(2px); }
        }

        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }

        .heshan-nav-drop {
          animation: navMenuSpring 0.34s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top center;
        }

        .heshan-nav-item-anim {
          opacity: 0;
          animation: navItemSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .heshan-user-drop {
          animation: userDropSpring 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top right;
        }

        .heshan-icon-bounce {
          animation: iconFloat 1.8s ease-in-out infinite;
        }

        .heshan-icon-wave,
        .heshan-icon-pulse {
          animation: iconPulse 2.2s ease-in-out infinite;
        }

        .heshan-mode-btn:active {
          transform: scale(0.96);
        }

        .heshan-nav-opt {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      background 0.2s ease,
                      border-color 0.2s ease,
                      box-shadow 0.2s ease !important;
        }

        .heshan-nav-opt:hover {
          transform: translateX(3px);
          background: rgba(255, 255, 255, 0.06) !important;
        }

        .heshan-nav-opt:active {
          transform: scale(0.98);
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

        {/* Premium Animated Vector Mode Selector */}
        <div ref={navDropRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            className="heshan-mode-btn"
            onClick={() => setNavDropOpen((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 13px',
              borderRadius: 999,
              border: navDropOpen
                ? '1px solid rgba(239, 68, 68, 0.8)'
                : '1px solid rgba(239, 68, 68, 0.42)',
              background:
                'linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(15, 23, 42, 0.94))',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: navDropOpen
                ? '0 0 0 3px rgba(239, 68, 68, 0.2), 0 10px 24px rgba(0, 0, 0, 0.6)'
                : '0 4px 16px rgba(239, 68, 68, 0.22)',
              transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171',
                filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.65))',
              }}
            >
              <ModeIcon mode={currentItem.key} size={15} active />
            </span>
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
                transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                color: '#fca5a5',
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
                width: 262,
                background:
                  'linear-gradient(180deg, rgba(13, 18, 34, 0.98), rgba(7, 10, 20, 0.99))',
                border: '1px solid rgba(239, 68, 68, 0.38)',
                borderRadius: 20,
                padding: 9,
                boxShadow:
                  '0 24px 60px rgba(0, 0, 0, 0.92), 0 0 0 1px rgba(255,255,255,0.04) inset',
                backdropFilter: 'blur(24px)',
                zIndex: 999,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.09em',
                  color: '#64748b',
                  padding: '3px 9px 2px',
                  textTransform: 'uppercase',
                }}
              >
                <span>Select Mode</span>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 8px #ef4444',
                  }}
                />
              </div>

              {NAV_ITEMS.map((item, index) => {
                const active =
                  item.href === '/' ? path === '/' : path.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setNavDropOpen(false)}
                    className="heshan-nav-opt heshan-nav-item-anim"
                    style={{
                      animationDelay: `${index * 55}ms`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      padding: '10px 11px',
                      borderRadius: 14,
                      textDecoration: 'none',
                      background: active
                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.24), rgba(153, 27, 27, 0.14))'
                        : 'rgba(255, 255, 255, 0.025)',
                      border: active
                        ? '1px solid rgba(239, 68, 68, 0.55)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      boxShadow: active
                        ? '0 8px 20px rgba(239, 68, 68, 0.16)'
                        : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: active
                          ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                          : 'rgba(255, 255, 255, 0.06)',
                        border: active
                          ? '1px solid rgba(255, 255, 255, 0.22)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        color: active ? '#ffffff' : item.accent,
                        boxShadow: active
                          ? '0 0 16px rgba(239, 68, 68, 0.5)'
                          : 'none',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ModeIcon mode={item.key} size={18} active={active} />
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
                            fontSize: 13,
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
                            padding: '2px 6px',
                            borderRadius: 6,
                            letterSpacing: '0.04em',
                            background:
                              item.badge === '24H'
                                ? 'rgba(16, 185, 129, 0.18)'
                                : item.badge === 'HD'
                                ? 'rgba(56, 189, 248, 0.18)'
                                : 'rgba(239, 68, 68, 0.2)',
                            color:
                              item.badge === '24H'
                                ? '#34d399'
                                : item.badge === 'HD'
                                ? '#38bdf8'
                                : '#f87171',
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: '#94a3b8',
                          marginTop: 2,
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
                  ? '1px solid rgba(250, 204, 21, 0.42)'
                  : '1px solid rgba(255, 255, 255, 0.14)',
                color: '#f8fafc',
                padding: '5px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {isOwner ? <CrownIcon size={13} /> : <UserIcon size={13} />}
              <span>{user.name.split(' ')[0]}</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                style={{
                  opacity: 0.75,
                  transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {menuOpen && (
              <div
                className="heshan-user-drop"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  minWidth: 210,
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 16,
                  padding: 10,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.75)',
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      background: 'rgba(250, 204, 21, 0.14)',
                      border: '1px solid rgba(250, 204, 21, 0.3)',
                      color: '#facc15',
                      padding: '8px 10px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginBottom: 6,
                    }}
                  >
                    <CrownIcon size={14} />
                    <span>Owner Admin Panel</span>
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
                    padding: '8px 10px',
                    borderRadius: 10,
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
