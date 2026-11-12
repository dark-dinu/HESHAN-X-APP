'use client'
import { useEffect, useState } from 'react'
import { PLATFORMS, detectPlatform, PlatformConfig } from '@/config/platforms'
import CompactProgress from '@/components/CompactProgress'
import LiveStats from '@/components/LiveStats'

export default function HomePage() {
  const [plat, setPlat] = useState<PlatformConfig>(PLATFORMS[0])
  const [fmtIdx, setFmtIdx] = useState(0)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState(0)
  const [stat, setStat] = useState('')
  const [result, setResult] = useState<{ token: string; title: string; ext: string } | null>(null)

  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--a', plat.colorPrimary)
    root.setProperty('--a2', plat.colorSecondary)
  }, [plat])

  function onInputChange(val: string) {
    setUrl(val)
    const detected = detectPlatform(val)
    if (detected && detected.id !== plat.id) {
      setPlat(detected)
      setFmtIdx(0)
    }
  }

  async function handleClip() {
    if (url) {
      setUrl('')
      setResult(null)
      setPct(0)
      setStat('')
      return
    }
    try {
      const text = await navigator.clipboard.readText()
      onInputChange(text)
    } catch {}
  }

  async function handleDownload() {
    if (!url.trim() || busy) return
    setBusy(true)
    setResult(null)
    setPct(18)
    setStat('Encrypted server එකට සම්බන්ධ වෙමින්...')

    const ticker = setInterval(() => {
      setPct((prev) => (prev < 88 ? prev + 7 : prev))
    }, 300)

    try {
      const selectedFmt = plat.formats[fmtIdx]?.id || 'hd'
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), platform: plat.id, format: selectedFmt }),
      })

      const data = await res.json()
      clearInterval(ticker)

      if (!res.ok) throw new Error(data.error || 'බාගත කිරීමට නොහැකි විය')

      setPct(100)
      setStat('සූදානම්! Save button එක ඔබන්න.')
      setResult(data)

      fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: plat.id }),
      }).catch(() => {})
    } catch (err: any) {
      clearInterval(ticker)
      setPct(0)
      setStat(err.message || 'දෝෂයකි')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="hero-tag">
        <span /> Encrypted Proxy • All-In-One Media Engine
      </div>
      <h1>{plat.name} මීඩියා බාගන්න</h1>
      <p className="sub">Link එක paste කරන්න. Platform එක auto-detect වේ.</p>

      <div className="plats">
        {PLATFORMS.map((item) => (
          <button
            key={item.id}
            className={item.id === plat.id ? 'on' : ''}
            onClick={() => {
              setPlat(item)
              setFmtIdx(0)
              setResult(null)
            }}
          >
            <i>{item.icon}</i>
            {item.name}
          </button>
        ))}
      </div>

      <div className="box">
        <div className="row">
          <div className="input-wrap">
            <input
              value={url}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={plat.placeholder}
            />
            <button type="button" className="action-chip" onClick={handleClip}>
              {url ? 'Clear' : 'Paste'}
            </button>
          </div>
          <button className="btn" onClick={handleDownload} disabled={busy}>
            {busy ? 'Wait...' : 'Download'}
          </button>
        </div>

        <div className="fmt">
          {plat.formats.map((f, idx) => (
            <button
              key={f.id}
              className={idx === fmtIdx ? 'on' : ''}
              onClick={() => setFmtIdx(idx)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <CompactProgress percent={pct} status={stat} />

        {result && (
          <div className="result-card" style={{ display: 'flex' }}>
            <div className="res-info">
              <div className="res-thumb">{plat.icon}</div>
              <div className="res-meta">
                <b>{result.title}</b>
                <span>{plat.name} • {result.ext.toUpperCase()} Ready</span>
              </div>
            </div>
            <a className="btn save-btn" href={`/api/stream?t=${result.token}`}>
              Save File
            </a>
          </div>
        )}
      </div>

      <LiveStats />
    </>
  )
}
