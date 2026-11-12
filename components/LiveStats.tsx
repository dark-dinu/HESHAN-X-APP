'use client'
import { useEffect, useRef, useState } from 'react'
import { PLATFORMS } from '@/config/platforms'

type Stats = {
  db: boolean
  onlineUsers: number
  totalDownloads: number
  percentages: Record<string, number>
  recent: { p: string; t: string }[]
}

function Count({ value }: { value: number }) {
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const s = from.current, t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900)
      setV(Math.round(s + (value - s) * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{v.toLocaleString()}</>
}

function ago(t: string) {
  const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000)
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function LiveStats() {
  const [d, setD] = useState<Stats | null>(null)
  const [fail, setFail] = useState(false)

  useEffect(() => {
    let sid = ''
    try {
      sid = sessionStorage.getItem('sid') || ''
      if (!sid) {
        sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36)
        sessionStorage.setItem('sid', sid)
      }
    } catch {
      sid = Math.random().toString(36).slice(2, 14)
    }

    const sync = async () => {
      if (document.hidden) return
      try {
        const r = await fetch(`/api/stats?sid=${sid}`, { cache: 'no-store' })
        const json = await r.json()
        setD(json)
        setFail(!r.ok)
      } catch {
        setFail(true)
      }
    }
    sync()
    const timer = setInterval(sync, 12000)
    const vis = () => !document.hidden && sync()
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])

  const live = !!d?.db && !fail
  const top = d
    ? PLATFORMS.map((p) => ({ p, pct: d.percentages?.[p.id] || 0 }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5)
    : []
  const leader = top[0]?.pct ? top[0].p : null

  return (
    <section className="fade" style={{ ['--i' as any]: 5 }}>
      <div className="section-title">
        <span>Live Platform Activity</span>
        <span className={`status ${live ? 'ok' : ''}`}>
          <i /> {live ? 'Live' : 'Ready'}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-head"><span className="live-dot" /> Online Users</div>
          <div className={`stat-val ${d ? '' : 'skel'}`}>{d ? (live ? <Count value={d.onlineUsers} /> : '1') : ''}</div>
          <div className="stat-sub">Active on site now</div>
        </div>
        <div className="stat-card">
          <div className="stat-head">⚡ Total Downloads</div>
          <div className={`stat-val ${d ? '' : 'skel'}`}>{d ? (live ? <Count value={d.totalDownloads} /> : '—') : ''}</div>
          <div className="stat-sub alt">High-Speed Proxy</div>
        </div>
        <div className="stat-card">
          <div className="stat-head">🔥 Top Trending</div>
          <div className={`stat-val ${d ? '' : 'skel'}`}>{d ? (leader ? leader.name : 'YouTube') : ''}</div>
          <div className="stat-sub alt">{leader ? `${top[0].pct}% Share` : 'Fastest Server'}</div>
        </div>
      </div>

      <div className="trend-box">
        <div className="trend-title">Supported Platforms</div>
        {(live ? top : PLATFORMS.slice(0, 4).map((p) => ({ p, pct: 0 }))).map(({ p, pct }) => (
          <div className="trend-item" key={p.id}>
            <div className="trend-top">
              <span>{p.icon} {p.name}</span>
              <span>{live ? `${pct}%` : 'Active'}</span>
            </div>
            <div className="trend-bar">
              <div
                className="trend-fill"
                style={{
                  width: live ? `${pct}%` : '100%',
                  background: `linear-gradient(90deg,${p.colorPrimary},${p.colorSecondary})`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {live && d?.recent?.length > 0 && (
        <div className="trend-box">
          <div className="trend-title">Recent Activity</div>
          <ul className="recent">
            {d.recent.map((r, i) => {
              const p = PLATFORMS.find((x) => x.id === r.p)
              return (
                <li key={i} style={{ ['--i' as any]: i }}>
                  <span>{p?.icon} {p?.name || r.p}</span>
                  <em>{ago(r.t)}</em>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
