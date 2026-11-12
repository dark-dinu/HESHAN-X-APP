'use client'
import { useEffect, useState } from 'react'

export default function LiveStats() {
  const [data, setData] = useState({
    onlineUsers: 145,
    totalDownloads: 48920,
    percentages: { tiktok: 46, youtube: 31, instagram: 15, facebook: 8 },
  })

  useEffect(() => {
    const sid = Math.random().toString(36).slice(2)
    const sync = async () => {
      try {
        const res = await fetch(`/api/stats?sid=${sid}`)
        if (res.ok) setData(await res.json())
      } catch {}
    }
    sync()
    const timer = setInterval(sync, 10000)
    return () => clearInterval(timer)
  }, [])

  const trends = [
    { name: '♪ TikTok (No Watermark)', pct: data.percentages.tiktok, grad: 'linear-gradient(90deg,#25f4ee,#fe2c55)' },
    { name: '▶ YouTube (1080p / MP3)', pct: data.percentages.youtube, grad: 'linear-gradient(90deg,#ff2d2d,#ff7a3d)' },
    { name: '◎ Instagram Reels & Stories', pct: data.percentages.instagram, grad: 'linear-gradient(90deg,#e1306c,#f7a64a)' },
    { name: 'f Facebook HD Videos', pct: data.percentages.facebook, grad: 'linear-gradient(90deg,#1877f2,#5aa4ff)' },
  ]

  return (
    <>
      <div className="section-title">
        <span>Live Platform Activity</span>
        <span style={{ color: '#10b981', fontSize: 11 }}>● Real-time</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-head"><span className="live-dot" /> Online Users</div>
          <div className="stat-val">{data.onlineUsers.toLocaleString()}</div>
          <div className="stat-sub">දැන් වෙබ් අඩවියේ</div>
        </div>
        <div className="stat-card">
          <div className="stat-head">⚡ Total Downloads</div>
          <div className="stat-val">{data.totalDownloads.toLocaleString()}</div>
          <div className="stat-sub" style={{ color: 'var(--a2)' }}>High-Speed Proxy</div>
        </div>
        <div className="stat-card">
          <div className="stat-head">🔥 Top Trending</div>
          <div className="stat-val">TikTok</div>
          <div className="stat-sub" style={{ color: '#25f4ee' }}>{data.percentages.tiktok}% Share</div>
        </div>
      </div>

      <div className="trend-box">
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
          වැඩිපුරම Download කරන Media Categories
        </div>
        {trends.map((t) => (
          <div className="trend-item" key={t.name}>
            <div className="trend-top">
              <span>{t.name}</span>
              <span>{t.pct}%</span>
            </div>
            <div className="trend-bar">
              <div className="trend-fill" style={{ width: `${t.pct}%`, background: t.grad }} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
