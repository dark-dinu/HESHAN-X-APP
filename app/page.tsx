'use client'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { PLATFORMS, detectPlatform, PlatformConfig } from '@/config/platforms'
import CompactProgress from '@/components/CompactProgress'
import ResultCard from '@/components/ResultCard'
import LiveStats from '@/components/LiveStats'
import ChannelPromo from '@/components/ChannelPromo'
import FullScreenAdModal from '@/components/FullScreenAdModal'
import LimitShareModal from '@/components/LimitShareModal'
import { useDownloader } from '@/hooks/useDownloader'
import {
  PlanTier,
  QuotaState,
  getQuotaState,
  getRemainingDownloads,
  getTotalLimit,
  recordDownloadUsage,
} from '@/lib/quota'

export default function HomePage() {
  const [plat, setPlat] = useState<PlatformConfig>(PLATFORMS[0])
  const [fmtIdx, setFmtIdx] = useState(0)
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dl = useDownloader()

  const [tier, setTier] = useState<PlanTier>('guest')
  const [quota, setQuota] = useState<QuotaState>(() => getQuotaState())
  const [showAd, setShowAd] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const prevBusyRef = useRef(false)

  // Check logged-in user plan (guest / normal / premium)
  useEffect(() => {
    setQuota(getQuotaState())
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const u = data?.user
        if (!u) {
          setTier('guest')
        } else if (u.isOwner || u.plan === 'premium') {
          setTier('premium')
        } else {
          setTier('normal')
        }
      })
      .catch(() => setTier('guest'))
  }, [])

  // Trigger usage count & every-2nd-download full-screen skippable ad when download finishes
  useEffect(() => {
    if (prevBusyRef.current && !dl.busy && dl.result && !dl.error) {
      const { nextState, shouldShowAd } = recordDownloadUsage(tier)
      setQuota(nextState)
      if (shouldShowAd) {
        setShowAd(true)
      }
    }
    prevBusyRef.current = dl.busy
  }, [dl.busy, dl.result, dl.error, tier])

  useEffect(() => {
    const s = document.documentElement.style
    s.setProperty('--a', plat.colorPrimary)
    s.setProperty('--a2', plat.colorSecondary)
  }, [plat])

  function pick(p: PlatformConfig) {
    setPlat(p)
    setFmtIdx(0)
    dl.reset()
  }

  function onInput(val: string) {
    setUrl(val)
    const d = detectPlatform(val)
    if (d && d.id !== plat.id) {
      setPlat(d)
      setFmtIdx(0)
      dl.reset()
    }
  }

  async function clip() {
    if (url) {
      setUrl('')
      dl.reset()
      inputRef.current?.focus()
      return
    }
    try {
      const text = await navigator.clipboard.readText()
      if (text) onInput(text)
    } catch {
      inputRef.current?.focus()
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!url.trim() || dl.busy) return

    const latest = getQuotaState()
    setQuota(latest)
    const left = getRemainingDownloads(tier, latest)
    if (left <= 0) {
      setShowLimitModal(true)
      return
    }

    dl.run({ url: url.trim(), platform: plat.id, format: plat.formats[fmtIdx]?.id || 'hd' })
  }

  const remaining = getRemainingDownloads(tier, quota)
  const totalLimit = getTotalLimit(tier, quota)

  return (
    <>
      <div className="hero-tag fade" style={{ ['--i' as any]: 0 }}>
        <span /> Encrypted Proxy • All-In-One Media Engine
      </div>
      <h1 className="fade" style={{ ['--i' as any]: 1 }}>
        Download <em key={plat.id}>{plat.name}</em> Media
      </h1>
      <p className="sub fade" style={{ ['--i' as any]: 2 }}>
        Paste any link or number. Platform will be auto-detected.
      </p>

      {/* Daily Quota & Bonus Status Bar */}
      <div
        className="fade"
        style={{
          ['--i' as any]: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          maxWidth: 680,
          margin: '0 auto 14px',
          padding: '8px 14px',
          borderRadius: 14,
          background: 'rgba(15, 23, 42, 0.72)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: 12.5,
        }}
      >
        {tier === 'premium' ? (
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>
            👑 VIP Premium Active • Unlimited Downloads &amp; Zero Ads
          </span>
        ) : (
          <>
            <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
              ⚡ Today&apos;s Downloads:{' '}
              <strong style={{ color: remaining > 0 ? '#4ade80' : '#f87171' }}>
                {remaining} / {totalLimit} Left
              </strong>
              {quota.bonus > 0 && (
                <span style={{ color: '#38bdf8', marginLeft: 6 }}>(+5 Bonus Active)</span>
              )}
            </span>

            {!quota.bonusClaimed && (
              <button
                type="button"
                onClick={() => setShowLimitModal(true)}
                style={{
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  background: 'rgba(34, 197, 94, 0.14)',
                  color: '#4ade80',
                  padding: '4px 10px',
                  borderRadius: 9,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                +5 Free (WhatsApp Share)
              </button>
            )}
          </>
        )}
      </div>

      <div className="plats fade" style={{ ['--i' as any]: 3 }}>
        {PLATFORMS.map((p) => (
          <button key={p.id} type="button" className={p.id === plat.id ? 'on' : ''} onClick={() => pick(p)}>
            <i>{p.icon}</i>
            {p.name}
          </button>
        ))}
      </div>

      <form className="box fade" style={{ ['--i' as any]: 4 }} onSubmit={submit}>
        <div className="row">
          <div className="input-wrap">
            <input
              ref={inputRef}
              value={url}
              onChange={(e) => onInput(e.target.value)}
              placeholder={plat.placeholder}
              inputMode={plat.id === 'whatsapp' ? 'tel' : 'url'}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className="action-chip" onClick={clip}>
              {url ? 'Clear' : 'Paste'}
            </button>
          </div>
          <button className="btn" type="submit" disabled={busy(dl.busy, url)}>
            {dl.busy ? <span className="spin" /> : 'Download'}
          </button>
        </div>

        <div className="fmt">
          {plat.formats.map((f, i) => (
            <button key={f.id} type="button" className={i === fmtIdx ? 'on' : ''} onClick={() => setFmtIdx(i)}>
              {f.label}
            </button>
          ))}
        </div>

        <CompactProgress percent={dl.pct} status={dl.stat} error={dl.error} />
        {dl.result && <ResultCard result={dl.result} icon={plat.icon} name={plat.name} />}
      </form>

      <LiveStats />

      {/* Hide promo ads for Premium / Owner users */}
      {tier !== 'premium' && <ChannelPromo />}

      {/* Every 2nd download Full-Screen 5s Skippable Ad (Disabled for Premium) */}
      <FullScreenAdModal open={showAd && tier !== 'premium'} onClose={() => setShowAd(false)} />

      {/* Daily Limit & WhatsApp 5-Share +5 Bonus Modal */}
      <LimitShareModal
        open={showLimitModal}
        tier={tier}
        quota={quota}
        onClose={() => setShowLimitModal(false)}
        onQuotaUpdate={(next) => setQuota(next)}
      />
    </>
  )
}

const busy = (b: boolean, u: string) => b || !u.trim()
