'use client'
import { FormEvent, useEffect, useState } from 'react'
import { detectPlatform } from '@/config/platforms'
import CompactProgress from '@/components/CompactProgress'
import ResultCard from '@/components/ResultCard'
import { useDownloader } from '@/hooks/useDownloader'

const IDEAS = ['Kamali Dewiyo', 'Shape of You', 'Blinding Lights', 'Stay – Justin Bieber']

export default function MusicHub() {
  const [q, setQ] = useState('')
  const dl = useDownloader()

  useEffect(() => {
    const s = document.documentElement.style
    s.setProperty('--a', '#1db954'); s.setProperty('--a2', '#1ed760')
  }, [])

  function go(text = q) {
    const v = text.trim()
    if (!v || dl.busy) return
    const d = detectPlatform(v)
    // YouTube link -> MP3 from YouTube; everything else (Spotify link or song name) -> Spotify engine
    if (d?.id === 'youtube') dl.run({ url: v, platform: 'youtube', format: '320kbps' })
    else dl.run({ url: v, platform: 'spotify', format: '320kbps' })
  }
  const submit = (e: FormEvent) => { e.preventDefault(); go() }

  return (
    <>
      <div className="hero-tag fade" style={{ ['--i' as any]: 0 }}><span /> Music Hub • 320kbps MP3</div>
      <h1 className="fade" style={{ ['--i' as any]: 1 }}><em>Music</em> Hub 🎧</h1>
      <p className="sub fade" style={{ ['--i' as any]: 2 }}>Song නම, Spotify link හෝ YouTube link එකක් දාන්න. Save කරන්න කලින් ඇහුවත් බලන්න පුළුවන්.</p>

      <form className="box fade" style={{ ['--i' as any]: 3 }} onSubmit={submit}>
        <div className="row">
          <div className="input-wrap">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Song name / Spotify / YouTube link..." autoComplete="off" />
            <button type="button" className="action-chip" onClick={() => { setQ(''); dl.reset() }}>Clear</button>
          </div>
          <button className="btn" type="submit" disabled={dl.busy || !q.trim()}>{dl.busy ? <span className="spin" /> : 'Get MP3'}</button>
        </div>

        <div className="fmt">
          {IDEAS.map((s) => (<button key={s} type="button" onClick={() => { setQ(s); go(s) }}>🎵 {s}</button>))}
        </div>

        <CompactProgress percent={dl.pct} status={dl.stat} error={dl.error} />
        {dl.result && (
          <>
            <ResultCard result={dl.result} icon="🎧" name="Music Hub" />
            {dl.result.ext !== 'jpg' && (
              <div className="player pop">
                <div className="eq big"><i /><i /><i /><i /><i /></div>
                <audio controls preload="none" src={`/api/stream?t=${dl.result.token}&inline=1`} />
              </div>
            )}
          </>
        )}
      </form>
    </>
  )
}
