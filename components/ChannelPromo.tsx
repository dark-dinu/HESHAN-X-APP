'use client'
import { useEffect, useState } from 'react'

const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbDwT0W8kyyLjvt3s23t'
// ඔයාගේ Channel Logo / Banner image link එකක් තියෙනවා නම් පහළ quotes ඇතුළට දාන්න (නැත්නම් default banner එක පේනවා)
const PROMO_IMAGE = ''

const STORAGE_KEY = 'heshan_wa_promo_v2'
const MAX_PER_DAY = 3
const DURATION_SEC = 10

export default function ChannelPromo() {
  const [visible, setVisible] = useState(false)
  const [secLeft, setSecLeft] = useState(DURATION_SEC)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const raw = localStorage.getItem(STORAGE_KEY)
        const parsed = raw ? JSON.parse(raw) : { date: today, count: 0 }
        const countToday = parsed.date === today ? Number(parsed.count || 0) : 0

        if (countToday >= MAX_PER_DAY) return

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ date: today, count: countToday + 1 })
        )
        setSecLeft(DURATION_SEC)
        setVisible(true)
      } catch {
        setVisible(true)
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setSecLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setVisible(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [visible])

  if (!visible) return null

  const pct = (secLeft / DURATION_SEC) * 100
  const showCustomImg = Boolean(PROMO_IMAGE) && !imgError

  return (
    <div
      onClick={() => setVisible(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 360,
          background: '#0f172a',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
          textAlign: 'center',
        }}
      >
        {/* Top Close & Countdown Pill */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 12,
            right: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 2,
          }}
        >
          <span
            style={{
              background: 'rgba(2, 6, 23, 0.72)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#86efac',
              fontSize: 10.5,
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 999,
            }}
          >
            Ad • {secLeft}s
          </span>

          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Close"
            style={{
              background: 'rgba(2, 6, 23, 0.75)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: '#f8fafc',
              width: 28,
              height: 28,
              borderRadius: '50%',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Large Top Photo / Visual Banner */}
        {showCustomImg ? (
          <img
            src={PROMO_IMAGE}
            alt="HESHAN OFC Official Channel"
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: 175,
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: 165,
              background: 'radial-gradient(circle at top, #166534 0%, #052e16 55%, #0f172a 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 14,
            }}
          >
            <div
              style={{
                width: 74,
                height: 74,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #15803d)',
                border: '3px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 10px 28px rgba(34, 197, 94, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 34,
                marginBottom: 8,
              }}
            >
              📢
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.5px',
                color: '#fff',
              }}
            >
              HESHAN <span style={{ color: '#4ade80' }}>OFC</span> CHANNEL
            </span>
          </div>
        )}

        {/* Content & Follow Button */}
        <div style={{ padding: '16px 18px 20px' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
            Follow Our Official Channel!
          </h3>

          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
            Stay connected for the latest App & Website updates, new features, and releases.
          </p>

          <p style={{ margin: '0 0 16px', fontSize: 11.5, color: '#94a3b8', lineHeight: 1.45 }}>
            ඇප් එකේ සහ වෙබ් අඩවියේ අලුත්ම update ඉක්මනින් දැනගන්න අපේ WhatsApp Channel එක follow කරලා තියාගන්න!
          </p>

          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setVisible(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '12px 16px',
              borderRadius: 13,
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 800,
              boxShadow: '0 8px 22px rgba(34, 197, 94, 0.4)',
              boxSizing: 'border-box',
            }}
          >
            <span>WhatsApp Channel Follow කරන්න</span>
            <span>↗</span>
          </a>
        </div>

        {/* 10s Bottom Countdown Progress Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 4,
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #22c55e, #4ade80)',
            transition: 'width 1s linear',
          }}
        />
      </div>
    </div>
  )
}
