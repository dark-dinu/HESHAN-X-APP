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
      onClick={() => canClose && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        background: 'rgba(2, 6, 23, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 390,
          borderRadius: 22,
          background: '#0b1120',
          border: '1px solid rgba(255,255,255,0.14)',
          padding: '16px 20px 22px',
          textAlign: 'center',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
        }}
      >
        {/* Top Row Inside Card — Always Visible & Clickable */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            paddingBottom: 10,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: '#94a3b8',
            }}
          >
            Sponsored Ad
          </span>

          <button
            type="button"
            disabled={!canClose}
            onClick={onClose}
            style={{
              height: 32,
              padding: '0 13px',
              borderRadius: 999,
              border: 0,
              background: canClose ? '#ef4444' : 'rgba(255,255,255,0.1)',
              color: canClose ? '#fff' : '#cbd5e1',
              fontSize: 12,
              fontWeight: 800,
              cursor: canClose ? 'pointer' : 'not-allowed',
            }}
          >
            {canClose ? '✕ Close' : `Skip in ${secondsLeft}s`}
          </button>
        </div>

        {AD_SCRIPT_SRC ? (
          <div id={AD_CONTAINER_ID} ref={slotRef} style={{ minHeight: 250, display: 'grid', placeItems: 'center' }} />
        ) : (
          <div>
            <div
              style={{
                width: 58,
                height: 58,
                margin: '0 auto 12px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 28,
              }}
            >
              👑
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.08em', marginBottom: 5 }}>
              HESHAN OFC VIP MEMBERSHIP
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#fff' }}>
              Tired of Limits &amp; Ads?
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.5, color: '#94a3b8' }}>
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
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #22c55e, #15803d)',
                color: '#fff',
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: 700,
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
