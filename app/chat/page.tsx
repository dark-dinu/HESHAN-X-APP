'use client'
import { useEffect, useRef, useState } from 'react'
import AuthModal, { AuthUser } from '@/components/AuthModal'

type ChatMsg = {
  _id: string
  userEmail: string
  userName: string
  role?: 'owner' | 'premium' | 'normal'
  text: string
  replyTo?: {
    id: string
    userName: string
    text: string
  }
  createdAt: string
}

export default function CommunityChatPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const isOwner = user?.email?.toLowerCase() === 'damiyamalinda@gmail.com'

  const loadMessages = async (scrollToBottom = false) => {
    try {
      const res = await fetch('/api/chat', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && Array.isArray(data.messages)) {
        setMessages(data.messages)
        if (scrollToBottom) {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
        }
      }
    } catch {}
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) setUser(d.user)
      })
      .catch(() => {})

    loadMessages(true)

    const interval = setInterval(() => loadMessages(false), 4000)
    return () => clearInterval(interval)
  }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    const clean = text.trim()
    if (!clean || sending) return

    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          replyTo: replyTo
            ? {
                id: replyTo._id,
                userName: replyTo.userName,
                text: replyTo.text,
              }
            : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not send message.')
      } else {
        setText('')
        setReplyTo(null)
        setMessages((prev) => [...prev, data.message])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/chat?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m._id !== id))
      }
    } catch {}
  }

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <main className="ch-root">
      <style>{css}</style>

      <div className="ch-container">
        <header className="ch-head">
          <div>
            <div className="ch-badge">
              <span className="ch-live-dot" />
              <span>LIVE COMMUNITY</span>
              <span>•</span>
              <span className="ch-ttl">AUTO-DELETE 24H</span>
            </div>
            <h1 className="ch-title">
              HESHAN OFC <span>Chat</span>
            </h1>
          </div>
          <div className="ch-count">{messages.length} msgs</div>
        </header>

        <section className="ch-feed">
          <div className="ch-notice">
            ⏳ All messages automatically delete from the database after 24 hours.
          </div>

          {loading ? (
            <div className="ch-empty">Loading live chat...</div>
          ) : messages.length === 0 ? (
            <div className="ch-empty">
              No messages in the last 24 hours. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isMine =
                user?.email &&
                msg.userEmail.toLowerCase() === user.email.toLowerCase()
              const canDelete = isMine || isOwner
              const badgeRole = msg.role || 'normal'

              return (
                <div key={msg._id} className={`ch-row ${isMine ? 'mine' : ''}`}>
                  <div className={`ch-bubble ${isMine ? 'mine' : ''}`}>
                    <div className="ch-meta">
                      <span className="ch-sender">
                        {badgeRole === 'owner'
                          ? '👑 '
                          : badgeRole === 'premium'
                          ? '⭐ '
                          : ''}
                        {msg.userName}
                      </span>
                      {badgeRole !== 'normal' && (
                        <span className={`ch-role ${badgeRole}`}>
                          {badgeRole.toUpperCase()}
                        </span>
                      )}
                      <span className="ch-time">{formatTime(msg.createdAt)}</span>
                    </div>

                    {msg.replyTo?.text && (
                      <div className="ch-quote">
                        <div className="ch-quote-name">
                          ↩ {msg.replyTo.userName}
                        </div>
                        <div className="ch-quote-text">{msg.replyTo.text}</div>
                      </div>
                    )}

                    <p className="ch-text">{msg.text}</p>

                    <div className="ch-actions">
                      <button
                        type="button"
                        className="ch-act-btn"
                        onClick={() => {
                          if (!user) {
                            setAuthModalOpen(true)
                            return
                          }
                          setReplyTo(msg)
                          inputRef.current?.focus()
                        }}
                      >
                        ↩ Reply
                      </button>

                      {canDelete && (
                        <button
                          type="button"
                          className="ch-act-btn del"
                          onClick={() => handleDelete(msg._id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </section>

        {error && <div className="ch-err">{error}</div>}

        <footer className="ch-composer-wrap">
          {user ? (
            <form onSubmit={handleSend} className="ch-form">
              {replyTo && (
                <div className="ch-reply-bar">
                  <div className="ch-reply-info">
                    <span>
                      Replying to <b>{replyTo.userName}</b>:
                    </span>
                    <p>{replyTo.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="ch-reply-x"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="ch-input-row">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message (auto-deletes in 24h)..."
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="ch-send-btn"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            </form>
          ) : (
            <div className="ch-locked">
              <span>🔒 Sign in to send messages &amp; reply in chat</span>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="ch-signin-btn"
              >
                Sign In
              </button>
            </div>
          )}
        </footer>
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => setUser(u)}
      />
    </main>
  )
}

const css = `
.ch-root{min-height:calc(100vh - 60px);padding:12px 14px 100px;color:#f8fafc;
  background:#05070d;font-family:Inter,system-ui,-apple-system,sans-serif}
.ch-container{max-width:620px;margin:0 auto;display:flex;flex-direction:column;height:calc(100vh - 140px);min-height:480px}

.ch-head{display:flex;align-items:center;justify-content:space-between;padding:12px 15px;
  border-radius:18px;background:rgba(15,23,42,.85);border:1px solid rgba(255,255,255,.08);margin-bottom:10px}
.ch-badge{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;letter-spacing:.06em;color:#94a3b8}
.ch-live-dot{width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981}
.ch-ttl{color:#34d399}
.ch-title{margin:3px 0 0;font-size:20px;font-weight:800;color:#fff}
.ch-title span{color:#ef4444}
.ch-count{font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;
  background:rgba(239,68,68,.15);color:#fca5a5;border:1px solid rgba(239,68,68,.3)}

.ch-feed{flex:1;overflow-y:auto;padding:12px;border-radius:20px;
  background:rgba(9,13,22,.9);border:1px solid rgba(255,255,255,.07);
  display:flex;flex-direction:column;gap:10px}
.ch-notice{text-align:center;font-size:11px;color:#94a3b8;padding:7px 10px;border-radius:10px;
  background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.08)}
.ch-empty{text-align:center;color:#64748b;font-size:13px;margin:auto 0}

.ch-row{display:flex;justify-content:flex-start}
.ch-row.mine{justify-content:flex-end}
.ch-bubble{max-width:84%;padding:10px 13px;border-radius:16px 16px 16px 4px;
  background:rgba(30,41,59,.78);border:1px solid rgba(255,255,255,.08)}
.ch-bubble.mine{border-radius:16px 16px 4px 16px;
  background:linear-gradient(135deg,rgba(239,68,68,.24),rgba(153,27,27,.26));
  border-color:rgba(239,68,68,.38)}

.ch-meta{display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap}
.ch-sender{font-size:11.5px;font-weight:700;color:#e2e8f0}
.ch-role{font-size:9px;font-weight:800;padding:1px 5px;border-radius:5px}
.ch-role.owner{background:rgba(250,204,21,.2);color:#facc15}
.ch-role.premium{background:rgba(56,189,248,.2);color:#38bdf8}
.ch-time{font-size:10px;color:#64748b;margin-left:auto}

.ch-quote{padding:6px 9px;margin-bottom:6px;border-radius:9px;
  background:rgba(0,0,0,.35);border-left:2.5px solid #ef4444}
.ch-quote-name{font-size:10.5px;font-weight:700;color:#fca5a5}
.ch-quote-text{font-size:11.5px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.ch-text{margin:0;font-size:13.5px;line-height:1.45;color:#f8fafc;word-break:break-word}
.ch-actions{display:flex;align-items:center;gap:10px;margin-top:6px}
.ch-act-btn{border:0;background:transparent;padding:0;font:600 11px inherit;color:#94a3b8;cursor:pointer}
.ch-act-btn:hover{color:#fff}
.ch-act-btn.del:hover{color:#f87171}

.ch-err{margin-top:8px;padding:8px 12px;border-radius:10px;font-size:12px;
  background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.35);color:#fecaca}

.ch-composer-wrap{margin-top:10px}
.ch-form{background:rgba(15,23,42,.95);border:1px solid rgba(255,255,255,.1);
  border-radius:16px;padding:8px}
.ch-reply-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:6px 10px;margin-bottom:7px;border-radius:10px;
  background:rgba(239,68,68,.12);border-left:3px solid #ef4444}
.ch-reply-info{min-width:0;flex:1}
.ch-reply-info span{font-size:11px;color:#fca5a5}
.ch-reply-info p{margin:2px 0 0;font-size:11.5px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ch-reply-x{border:0;background:rgba(255,255,255,.1);color:#fff;width:24px;height:24px;
  border-radius:50%;cursor:pointer;font-size:11px}

.ch-input-row{display:flex;align-items:center;gap:8px}
.ch-input-row input{flex:1;min-width:0;height:40px;padding:0 12px;border-radius:11px;
  border:1px solid rgba(255,255,255,.09);background:rgba(3,7,18,.8);color:#fff;
  font-size:13.5px;outline:none}
.ch-input-row input:focus{border-color:#ef4444}
.ch-send-btn{height:40px;padding:0 18px;border-radius:11px;border:0;
  background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font:700 13px inherit;cursor:pointer}
.ch-send-btn:disabled{opacity:.5;cursor:not-allowed}

.ch-locked{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:12px 14px;border-radius:16px;background:rgba(15,23,42,.92);
  border:1px solid rgba(255,255,255,.1);font-size:12.5px;color:#cbd5e1}
.ch-signin-btn{padding:7px 14px;border-radius:10px;border:0;
  background:linear-gradient(135deg,#2563eb,#38bdf8);color:#fff;font:700 12px inherit;cursor:pointer;flex-shrink:0}
`
