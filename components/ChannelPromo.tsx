'use client'
import { useEffect, useState } from 'react'

const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbDwT0W8kyyLjvt3s23t'
const STORAGE_KEY = 'heshan_wa_promo_v1'
const MAX_PER_DAY = 3
const DURATION_SEC = 10

export default function ChannelPromo() {
  const [visible, setVisible] = useState(false)
  const [secLeft, setSecLeft] = useState(DURATION_SEC)

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
    }, 1500)

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

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 28px)',
        maxWidth: 400,
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(34, 197, 94, 0.35)',
        borderRadius: 16,
        padding: '11px 13px 13px',
        boxShadow: '0 14px 35px rgba(0, 0, 0, 0.75)',
        zIndex: 9998,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        {/* Left Icon + Bilingual Text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'rgba(34, 197, 94, 0.16)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 17,
              flexShrink: 0,
            }}
          >
            📢
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#f8fafc', lineHeight: 1.3 }}>
              Follow for Latest App & Web Updates!
            </div>
            <div style={{ fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.35, marginTop: 2 }}>
              අලුත්ම update දැනගන්න අපේ Channel එක follow කරන්න.
            </div>
          </div>
        </div>

        {/* Right Action Button + Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setVisible(false)}
            style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 10px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.35)',
            }}
          >
            Follow
          </a>

          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Close"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              width: 22,
              height: 22,
              borderRadius: '50%',
              fontSize: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* 10s Auto-Close Progress Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #22c55e, #4ade80)',
          transition: 'width 1s linear',
        }}
      />
    </div>
  )
}
