'use client'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { PLATFORMS, detectPlatform, PlatformConfig } from '@/config/platforms'
import CompactProgress from '@/components/CompactProgress'
import ResultCard from '@/components/ResultCard'
import LiveStats from '@/components/LiveStats'
import { useDownloader } from '@/hooks/useDownloader'

export default function HomePage() {
  const [plat, setPlat] = useState<PlatformConfig>(PLATFORMS[0])
  const [fmtIdx, setFmtIdx] = useState(0)
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dl = useDownloader()

  useEffect(() => {
    const s = document.documentElement.style
    s.setProperty('--a', plat.colorPrimary)
    s.setProperty('--a2', plat.colorSecondary)
  }, [plat])

  function pick(p: PlatformConfig) { setPlat(p); setFmtIdx(0); dl.reset() }

  function onInput(val: string) {
    setUrl(val)
    const d = detectPlatform(val)
    if (d && d.id !== plat.id) { setPlat(d); setFmtIdx(0); dl.reset() }
  }

  async function clip() {
    if (url) { setUrl(''); dl.reset(); inputRef.current?.focus(); return }
    try { onInput(await navigator.clipboard.readText()) } catch { inputRef.current?.focus() }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!url.trim() || dl.busy) return
    dl.run({ url: url.trim(), platform: plat.id, format: plat.formats[fmtIdx]?.id || 'hd' })
  }

  return (
    <>
      <div className="hero-tag fade" style={{ ['--i' as any]: 0 }}><span /> Encrypted Proxy • All-In-One Media Engine</div>
      <h1 className="fade" style={{ ['--i' as any]: 1 }}><em key={plat.id}>{plat.name}</em> මීඩියා බාගන්න</h1>
      <p className="sub fade" style={{ ['--i' as any]: 2 }}>Link එක paste කරන්න. Platform එක auto-detect වේ.</p>

      <div className="plats fade" style={{ ['--i' as any]: 3 }}>
        {PLATFORMS.map((p) => (
          <button key={p.id} type="button" className={p.id === plat.id ? 'on' : ''} onClick={() => pick(p)}>
            <i>{p.icon}</i>{p.name}
          </button>
        ))}
      </div>

      <form className="box fade" style={{ ['--i' as any]: 4 }} onSubmit={submit}>
        <div className="row">
          <div className="input-wrap">
            <input ref={inputRef} value={url} onChange={(e) => onInput(e.target.value)} placeholder={plat.placeholder}
              inputMode={plat.id === 'whatsapp' ? 'tel' : 'url'} autoComplete="off" spellCheck={false} />
            <button type="button" className="action-chip" onClick={clip}>{url ? 'Clear' : 'Paste'}</button>
          </div>
          <button className="btn" type="submit" disabled={busy(dl.busy, url)}>{dl.busy ? <span className="spin" /> : 'Download'}</button>
        </div>

        <div className="fmt">
          {plat.formats.map((f, i) => (
            <button key={f.id} type="button" className={i === fmtIdx ? 'on' : ''} onClick={() => setFmtIdx(i)}>{f.label}</button>
          ))}
        </div>

        <CompactProgress percent={dl.pct} status={dl.stat} error={dl.error} />
        {dl.result && <ResultCard result={dl.result} icon={plat.icon} name={plat.name} />}
      </form>

      <LiveStats />
    </>
  )
}

const busy = (b: boolean, u: string) => b || !u.trim()
