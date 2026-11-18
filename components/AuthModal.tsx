'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

export type AuthUser = {
  id: string
  name: string
  email: string
  avatar?: string
}

type Mode = 'login' | 'register'

/* ---------- Icons ---------- */
const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
const UserIcon = () => <Icon><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></Icon>
const MailIcon = () => <Icon><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></Icon>
const LockIcon = () => <Icon><rect x="5" y="11" width="14" height="9" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>
const EyeIcon = () => <Icon><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Icon>
const EyeOffIcon = () => <Icon><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 4.2-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Icon>
const CloseIcon = () => <Icon><path d="M6 6l12 12M18 6 6 18" /></Icon>
const CheckIcon = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>

/* ---------- Password strength ---------- */
function getStrength(pw: string) {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']
  const s = pw.length === 0 ? -1 : pw.length < 6 ? 0 : score
  return { score: Math.max(s, 0), label: s < 0 ? '' : labels[s], color: s < 0 ? '#334155' : colors[s] }
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
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const strength = useMemo(() => getStrength(password), [password])

  // Close on Escape + lock background scroll while open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => firstFieldRef.current?.focus(), 80)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      clearTimeout(t)
    }
  }, [open, onClose, mode])

  if (!open) return null

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setShowPw(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, name: name.trim(), email: email.trim(), password }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setShake((n) => n + 1)
      } else {
        setSuccess(true)
        setTimeout(() => {
          onSuccess(data.user)
          onClose()
          setSuccess(false)
          setPassword('')
        }, 900)
      }
    } catch {
      setError('Network error. Check your connection and try again.')
      setShake((n) => n + 1)
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="am-overlay" onClick={onClose} role="presentation">
      <style>{css}</style>
      <div
        className="am-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="am-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="am-glow" aria-hidden="true" />

        {success ? (
          <div className="am-success">
            <div className="am-success-ring"><CheckIcon /></div>
            <h3>{isLogin ? 'Signed in' : 'Account created'}</h3>
            <p>{isLogin ? 'Welcome back. Redirecting you now.' : 'You’re all set. Taking you in.'}</p>
          </div>
        ) : (
          <>
            <button type="button" className="am-close" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>

            <header className="am-head">
              <h3 id="am-title">{isLogin ? 'Welcome back' : 'Create your account'}</h3>
              <p>
                {isLogin
                  ? 'Sign in with your email and password to continue.'
                  : 'Enter your details to get started in under a minute.'}
              </p>
            </header>

            <div className="am-tabs" role="tablist" data-mode={mode}>
              <span className="am-tab-pill" aria-hidden="true" />
              <button type="button" role="tab" aria-selected={isLogin} className={isLogin ? 'on' : ''} onClick={() => switchMode('login')}>
                Sign in
              </button>
              <button type="button" role="tab" aria-selected={!isLogin} className={!isLogin ? 'on' : ''} onClick={() => switchMode('register')}>
                Register
              </button>
            </div>

            <form onSubmit={submit} className="am-form" key={mode} noValidate={false}>
              {!isLogin && (
                <label className="am-field">
                  <span className="am-label">Full name</span>
                  <span className="am-input-wrap">
                    <span className="am-ico"><UserIcon /></span>
                    <input
                      ref={firstFieldRef}
                      type="text"
                      name="name"
                      autoComplete="name"
                      placeholder="e.g. Dinidu Heshan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </span>
                </label>
              )}

              <label className="am-field">
                <span className="am-label">Email address</span>
                <span className="am-input-wrap">
                  <span className="am-ico"><MailIcon /></span>
                  <input
                    ref={isLogin ? firstFieldRef : undefined}
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </span>
              </label>

              <label className="am-field">
                <span className="am-label">Password</span>
                <span className="am-input-wrap">
                  <span className="am-ico"><LockIcon /></span>
                  <input
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))}
                    onBlur={() => setCapsOn(false)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="am-eye"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    aria-pressed={showPw}
                  >
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </span>
                {capsOn && <span className="am-hint warn">Caps Lock is on</span>}
              </label>

              {!isLogin && password.length > 0 && (
                <div className="am-strength" aria-live="polite">
                  <div className="am-bars">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} style={{ background: i < Math.max(strength.score, 1) && password.length > 0 ? strength.color : undefined }} />
                    ))}
                  </div>
                  <span style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}

              {error && (
                <div key={shake} className="am-error" role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>
                  {error}
                </div>
              )}

              <button type="submit" className="am-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="am-spin" aria-hidden="true" />
                    {isLogin ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : isLogin ? (
                  'Sign in'
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <p className="am-foot">
              {isLogin ? 'New here?' : 'Already have an account?'}{' '}
              <button type="button" onClick={() => switchMode(isLogin ? 'register' : 'login')}>
                {isLogin ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const css = `
.am-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;
  background:radial-gradient(1200px 600px at 50% -10%,rgba(37,99,235,.18),transparent 60%),rgba(2,6,23,.78);
  backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);
  animation:am-fade .25s ease-out}
.am-card{position:relative;width:100%;max-width:400px;overflow:hidden;padding:28px 24px 22px;border-radius:26px;color:#e2e8f0;
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  background:linear-gradient(180deg,rgba(21,31,56,.92),rgba(10,16,34,.96));
  border:1px solid rgba(148,197,255,.16);
  box-shadow:0 0 0 1px rgba(255,255,255,.03) inset,0 1px 0 rgba(255,255,255,.08) inset,0 40px 90px -20px rgba(0,0,0,.75),0 0 80px -30px rgba(56,189,248,.35);
  animation:am-pop .38s cubic-bezier(.2,.9,.25,1.05)}
.am-glow{position:absolute;top:-120px;left:50%;width:320px;height:240px;transform:translateX(-50%);pointer-events:none;
  background:radial-gradient(closest-side,rgba(56,189,248,.28),rgba(37,99,235,.12) 55%,transparent);filter:blur(10px)}
.am-close{position:absolute;top:16px;right:16px;width:34px;height:34px;display:grid;place-items:center;border-radius:999px;border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.05);color:#94a3b8;cursor:pointer;transition:.18s}
.am-close:hover{background:rgba(255,255,255,.12);color:#fff;transform:rotate(90deg)}
.am-head{position:relative;margin:4px 40px 20px 0}
.am-head h3{margin:0 0 6px;font-size:23px;font-weight:700;letter-spacing:-.02em;color:#fff}
.am-head p{margin:0;font-size:13.5px;line-height:1.55;color:#94a3b8}
.am-tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:4px;margin-bottom:18px;border-radius:14px;
  background:rgba(2,6,23,.65);border:1px solid rgba(148,163,184,.12)}
.am-tab-pill{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:10px;
  background:linear-gradient(135deg,#2563eb,#38bdf8);box-shadow:0 6px 18px -4px rgba(37,99,235,.65);
  transition:transform .32s cubic-bezier(.3,.9,.3,1)}
.am-tabs[data-mode=register] .am-tab-pill{transform:translateX(100%)}
.am-tabs button{position:relative;z-index:1;padding:9px 0;border:0;background:transparent;border-radius:10px;cursor:pointer;
  font:600 13.5px inherit;font-family:inherit;color:#8aa0bd;transition:color .2s}
.am-tabs button.on{color:#fff}
.am-form{display:flex;flex-direction:column;gap:14px;animation:am-slide .3s ease-out}
.am-field{display:block}
.am-label{display:block;margin:0 0 6px 2px;font-size:12.5px;font-weight:500;color:#a9b8cf}
.am-input-wrap{position:relative;display:block}
.am-ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);display:grid;color:#64748b;pointer-events:none;transition:color .2s}
.am-input-wrap input{width:100%;box-sizing:border-box;height:48px;padding:0 46px 0 44px;border-radius:13px;font-size:14.5px;color:#fff;
  font-family:inherit;background:rgba(2,6,23,.6);border:1px solid rgba(148,163,184,.2);outline:none;transition:border-color .2s,box-shadow .2s,background .2s}
.am-input-wrap input::placeholder{color:#55657e}
.am-input-wrap input:hover{border-color:rgba(148,163,184,.38)}
.am-input-wrap input:focus{border-color:#38bdf8;background:rgba(2,6,23,.85);box-shadow:0 0 0 4px rgba(56,189,248,.16)}
.am-input-wrap:focus-within .am-ico{color:#38bdf8}
.am-input-wrap input:-webkit-autofill{-webkit-text-fill-color:#fff;-webkit-box-shadow:0 0 0 40px #0b1226 inset}
.am-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:10px;
  background:transparent;color:#7d8fa9;cursor:pointer;transition:.18s}
.am-eye:hover{color:#fff;background:rgba(255,255,255,.08)}
.am-eye:focus-visible,.am-close:focus-visible,.am-tabs button:focus-visible,.am-foot button:focus-visible,.am-submit:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
.am-hint{display:block;margin:6px 2px 0;font-size:12px}
.am-hint.warn{color:#fbbf24}
.am-strength{display:flex;align-items:center;gap:10px;margin-top:-4px;font-size:12px;font-weight:600}
.am-bars{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.am-bars span{height:4px;border-radius:99px;background:rgba(148,163,184,.18);transition:background .25s}
.am-error{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:12px;font-size:13px;line-height:1.45;color:#fecaca;
  background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.32);animation:am-shake .4s}
.am-error svg{flex:none;margin-top:1px}
.am-submit{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;height:50px;margin-top:4px;border:0;border-radius:14px;cursor:pointer;
  font:600 15px inherit;font-family:inherit;color:#fff;letter-spacing:.01em;background:linear-gradient(135deg,#2563eb 0%,#0ea5e9 60%,#38bdf8 100%);
  box-shadow:0 10px 28px -8px rgba(37,99,235,.8),0 1px 0 rgba(255,255,255,.25) inset;transition:transform .15s,box-shadow .2s,filter .2s}
.am-submit:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08);box-shadow:0 14px 32px -8px rgba(37,99,235,.9),0 1px 0 rgba(255,255,255,.3) inset}
.am-submit:active:not(:disabled){transform:translateY(0) scale(.99)}
.am-submit:disabled{opacity:.75;cursor:not-allowed}
.am-spin{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:am-rot .7s linear infinite}
.am-foot{margin:18px 0 0;text-align:center;font-size:13px;color:#8394ad}
.am-foot button{border:0;background:none;padding:0;font:600 13px inherit;font-family:inherit;color:#38bdf8;cursor:pointer;border-radius:4px}
.am-foot button:hover{text-decoration:underline}
.am-success{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:26px 0 18px}
.am-success-ring{width:68px;height:68px;display:grid;place-items:center;border-radius:50%;color:#fff;margin-bottom:16px;
  background:linear-gradient(135deg,#10b981,#38bdf8);box-shadow:0 0 0 8px rgba(16,185,129,.14),0 14px 36px -8px rgba(16,185,129,.7);animation:am-pop .45s cubic-bezier(.2,.9,.25,1.2)}
.am-success h3{margin:0 0 6px;font-size:21px;font-weight:700;color:#fff}
.am-success p{margin:0;font-size:13.5px;color:#94a3b8}
@keyframes am-fade{from{opacity:0}to{opacity:1}}
@keyframes am-pop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
@keyframes am-slide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes am-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
@keyframes am-rot{to{transform:rotate(360deg)}}
@media (max-width:420px){.am-card{padding:24px 18px 18px;border-radius:22px}}
@media (prefers-reduced-motion:reduce){.am-overlay,.am-card,.am-form,.am-error,.am-success-ring{animation:none}.am-tab-pill,.am-submit,.am-close{transition:none}}
`
