'use client'
import { useState } from 'react'
import { PlanTier, QuotaState, recordWhatsAppShare } from '@/lib/quota'

export default function LimitShareModal({
  open,
  tier,
  quota,
  onClose,
  onQuotaUpdate,
}: {
  open: boolean
  tier: PlanTier
  quota: QuotaState
  onClose: () => void
  onQuotaUpdate: (next: QuotaState) => void
}) {
  const [sharingWait, setSharingWait] = useState(false)

  if (!open) return null

  const sharesDone = Math.min(5, quota.shares || 0)
  const bonusAlreadyClaimed = quota.bonusClaimed

  const handleWhatsAppShare = () => {
    if (sharingWait) return
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hesh-ofc.onrender.com'
    const shareText =
      `🔥 *HESHAN OFC – All-In-One HD Media & Music Downloader* ⚡\n\n` +
      `✅ Download YouTube, TikTok (No Watermark), Instagram, Facebook & Pinterest Videos in Full HD\n` +
      `🎧 Stream & Download Spotify / YouTube Songs in 320kbps MP3\n` +
      `📲 Fast, Free & Mobile Friendly!\n\n` +
      `👉 Try it free now: ${siteUrl}`

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')

    // Count share after short delay so user actually opens WhatsApp
    setSharingWait(true)
    setTimeout(() => {
      const updated = recordWhatsAppShare()
      onQuotaUpdate(updated)
      setSharingWait(false)
      if (updated.bonusClaimed && updated.used < (tier === 'normal' ? 8 : 4) + updated.bonus) {
        onClose()
      }
    }, 1800)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(14px)',
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
          maxWidth: 420,
          borderRadius: 24,
          background: 'linear-gradient(180deg, #111827, #070b14)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '24px 20px 20px',
          color: '#f8fafc',
          boxShadow: '0 30px 80px rgba(0,0,0,0.85)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.06)',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        <div
          style={{
            display: 'inline-block',
            padding: '5px 11px',
            borderRadius: 999,
            background: 'rgba(239, 68, 68, 0.16)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            fontSize: 11,
            fontWeight: 800,
            marginBottom: 10,
          }}
        >
          DAILY LIMIT REACHED
        </div>

        <h3 style={{ margin: '0 0 6px', fontSize: 21, fontWeight: 800, color: '#fff' }}>
          Unlock +5 Bonus Downloads Free! 🎁
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.55, color: '#94a3b8' }}>
          {bonusAlreadyClaimed
            ? 'You have already claimed your +5 WhatsApp share bonus today! Upgrade to VIP Premium for unlimited downloads.'
            : 'Share HESHAN OFC with 5 friends or groups on WhatsApp to instantly unlock 5 extra downloads today!'}
        </p>

        {/* WhatsApp 5-Share Progress Bar */}
        {!bonusAlreadyClaimed && (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 16,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
              <span style={{ color: '#e2e8f0' }}>WhatsApp Share Progress</span>
              <span style={{ color: '#4ade80' }}>{sharesDone} / 5 Friends</span>
            </div>

            <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 12 }}>
              <div
                style={{
                  width: `${(sharesDone / 5) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #22c55e, #10b981)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              disabled={sharingWait}
              style={{
                width: '100%',
                height: 45,
                borderRadius: 13,
                border: 0,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 800,
                cursor: sharingWait ? 'wait' : 'pointer',
                boxShadow: '0 10px 24px -6px rgba(34, 197, 94, 0.65)',
              }}
            >
              {sharingWait
                ? 'Verifying Share...'
                : `📲 Share on WhatsApp (${sharesDone}/5) → Get +5`}
            </button>
          </div>
        )}

        {/* Guest Hint: Sign in for 8/day */}
        {tier === 'guest' && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 13,
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              fontSize: 12.5,
              color: '#bae6fd',
              marginBottom: 12,
            }}
          >
            💡 <strong>Tip:</strong> Tap <strong>Sign In</strong> at the top right to increase your daily free limit from <strong>4</strong> to <strong>8 downloads/day</strong>!
          </div>
        )}

        {/* VIP Unlimited Upgrade */}
        <a
          href="https://wa.me/94719845166?text=Hi%20HESHAN%20OFC%2C%20I%20want%20to%20unlock%20VIP%20Premium%20(Unlimited%20Downloads%20%2B%20Zero%20Ads)!"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            height: 42,
            borderRadius: 13,
            background: 'rgba(251, 191, 36, 0.14)',
            border: '1px solid rgba(251, 191, 36, 0.38)',
            color: '#fde68a',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          👑 Unlock VIP Unlimited &amp; No Ads
        </a>
      </div>
    </div>
  )
}
