'use client'
import { useEffect, useRef, useState } from 'react'

// Paste your Adsterra / Monetag 300x250 script URL & container ID here when ready:
const AD_SCRIPT_SRC = ''
const AD_CONTAINER_ID = 'heshan-ad-slot-300x250'
const SKIP_SECONDS = 5

export default function FullScreenAdModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(SKIP_SECONDS)
  const slotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setSecondsLeft(SKIP_SECONDS)
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Inject Ad Network banner script if configured
    if (AD_SCRIPT_SRC && slotRef.current) {
      slotRef.current.innerHTML = ''
      const s = document.createElement('script')
      s.src = AD_SCRIPT_SRC
      s.async = true
      slotRef.current.appendChild(s)
    }

    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  const canClose = secondsLeft === 0

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(2, 6, 23, 0.94)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Bar with Countdown / Close Button */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          right: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#94a3b8',
            background: 'rgba(255,255,255,0.06)',
            padding: '6px 12px',
            borderRadius: 999,
          }}
        >
          Sponsored Ad • Supports Free Server
        </span>

        <button
          type="button"
          disabled={!canClose}
          onClick={onClose}
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 999,
            border: canClose ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
            background: canClose ? '#ef4444' : 'rgba(30, 41, 59, 0.8)',
            color: canClose ? '#fff' : '#94a3b8',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: canClose ? 'pointer' : 'not-allowed',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: '0.2s',
          }}
        >
          {canClose ? '✕ Close' : `Skip in ${secondsLeft}s`}
        </button>
      </div>

      {/* Main Ad Container */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 24,
          background: 'linear-gradient(160deg, #0f172a, #020617)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: 22,
          textAlign: 'center',
          boxShadow: '0 30px 70px rgba(0,0,0,0.85)',
        }}
      >
        {AD_SCRIPT_SRC ? (
          <div id={AD_CONTAINER_ID} ref={slotRef} style={{ minHeight: 250, display: 'grid', placeItems: 'center' }} />
        ) : (
          <div>
            <div
              style={{
                width: 64,
                height: 64,
                margin: '0 auto 14px',
                borderRadius: 18,
                background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 30,
                boxShadow: '0 12px 30px rgba(239, 68, 68, 0.45)',
              }}
            >
              👑
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.08em', marginBottom: 6 }}>
              HESHAN OFC VIP MEMBERSHIP
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, color: '#fff' }}>
              Tired of Limits &amp; Ads?
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.55, color: '#94a3b8' }}>
              Upgrade to <strong style={{ color: '#fff' }}>HESHAN OFC Premium</strong> for Unlimited HD Video &amp; 320kbps Music Downloads with Zero Ads!
            </p>
            <a
              href="https://wa.me/94719845166?text=Hi%20HESHAN%20OFC%2C%20I%20want%20to%20unlock%20VIP%20Premium%20(Unlimited%20%2B%20Ad-Free)!"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 44,
                borderRadius: 13,
                background: 'linear-gradient(135deg, #22c55e, #15803d)',
                color: '#fff',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 700,
                boxShadow: '0 10px 24px rgba(34, 197, 94, 0.4)',
              }}
            >
              Unlock VIP via WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
