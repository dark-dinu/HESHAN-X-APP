'use client'
import { useEffect, useRef, useState } from 'react'

type TrackItem = {
  id: string
  title: string
  artist: string
  album?: string
  duration?: string
  thumbnail?: string
  url: string
}

type ActiveStream = {
  id: string
  title: string
  artist: string
  thumbnail: string
  downloadUrl: string
}

const TRENDING = [
  'Kamali Dewiyo',
  'Shape of You',
  'Lelena',
  'Maa Dihaa - DILU Beats',
]

export default function MusicHubPage() {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null)
  const [tracks, setTracks] = useState<TrackItem[]>([])
  const [activeStream, setActiveStream] = useState<ActiveStream | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const playTrack = async (track: TrackItem) => {
    setError('')
    setLoadingTrackId(track.id)
    try {
      const params = new URLSearchParams({
        url: track.url,
        title: track.title,
        quality: '320kbps',
      })
      const res = await fetch(`/api/music/download?${params.toString()}`)
      const data = await res.json()
      if (!res.ok || !data.downloadUrl) {
        setError(data.error || 'Could not load audio stream.')
        return
      }
      setActiveStream({
        id: track.id,
        title: data.title && data.title !== 'Spotify Track' ? data.title : track.title,
        artist: data.artist || track.artist,
        thumbnail: data.thumbnail || track.thumbnail || '',
        downloadUrl: data.downloadUrl,
      })
      setCurrentTime(0)
      setDuration(0)
    } catch {
      setError('Network error while loading audio.')
    } finally {
      setLoadingTrackId(null)
    }
  }

  useEffect(() => {
    if (!activeStream || !audioRef.current) return
    audioRef.current.load()
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }, [activeStream])

  const handleSearch = async (customQuery?: string) => {
    const q = (customQuery ?? query).trim()
    if (!q) {
      setError('Enter a song title, artist, or Spotify / YouTube link.')
      return
    }
    setQuery(q)
    setError('')
    setSearching(true)

    try {
      const isDirectLink =
        q.includes('open.spotify.com/track/') ||
        q.includes('youtube.com/watch') ||
        q.includes('youtu.be/') ||
        q.includes('youtube.com/shorts/')

      if (isDirectLink) {
        await playTrack({
          id: 'direct',
          title: q.includes('spotify') ? 'Spotify Track' : 'YouTube Audio',
          artist: '320kbps Master Audio',
          url: q,
        })
        setSearching(false)
        return
      }

      const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) {
        setTracks([])
        setError(data.error || 'No matching tracks found.')
      } else {
        setTracks(data.tracks || [])
      }
    } catch {
      setError('Search failed. Check your connection and try again.')
    } finally {
      setSearching(false)
    }
  }

  const togglePlay = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      el.play().then(() => setIsPlaying(true)).catch(() => {})
    } else {
      el.pause()
      setIsPlaying(false)
    }
  }

  const playAdjacent = (dir: -1 | 1) => {
    if (!activeStream || tracks.length === 0) return
    const idx = tracks.findIndex((t) => t.id === activeStream.id)
    if (idx === -1) return
    const nextIdx = (idx + dir + tracks.length) % tracks.length
    playTrack(tracks[nextIdx])
  }

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <main className="mh-root">
      <style>{css}</style>

      {/* Ambient Studio Glows */}
      <div className="mh-orb mh-orb-red" aria-hidden="true" />
      <div className="mh-orb mh-orb-emerald" aria-hidden="true" />

      <div className="mh-container">
        {/* Official Header */}
        <header className="mh-hero">
          <div className="mh-pill">
            <span className="mh-dot" />
            <span>HESHAN OFC STUDIO</span>
            <span className="mh-pill-sep">•</span>
            <span className="mh-pill-hi">320KBPS LOSSLESS MP3</span>
          </div>

          <h1 className="mh-title">
            Music <span>Hub</span>
          </h1>
          <p className="mh-subtitle">
            Stream millions of tracks instantly or paste any Spotify &amp; YouTube link to listen and download in high-definition audio.
          </p>
        </header>

        {/* Glass Search Console */}
        <section className="mh-search-box">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
            className="mh-search-form"
          >
            <div className="mh-input-shell">
              <svg className="mh-search-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search songs, artists, or paste link..."
                aria-label="Search songs or paste link"
              />
              {query && (
                <button
                  type="button"
                  className="mh-clear"
                  onClick={() => {
                    setQuery('')
                    setTracks([])
                    setError('')
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <button type="submit" className="mh-btn-primary" disabled={searching}>
              {searching ? (
                <>
                  <span className="mh-spinner" />
                  Searching Catalog...
                </>
              ) : (
                <>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  Search &amp; Stream
                </>
              )}
            </button>
          </form>

          <div className="mh-trending">
            <span className="mh-trending-label">Trending:</span>
            <div className="mh-chips">
              {TRENDING.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="mh-chip"
                  onClick={() => handleSearch(item)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="mh-alert" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Official Now Playing Studio Deck */}
        {activeStream && (
          <section className="mh-player">
            <div className="mh-player-top">
              <div className={`mh-art-wrap ${isPlaying ? 'playing' : ''}`}>
                {activeStream.thumbnail ? (
                  <img src={activeStream.thumbnail} alt={activeStream.title} className="mh-art" />
                ) : (
                  <div className="mh-art-fallback">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="mh-meta">
                <div className="mh-now-badge">
                  <span className={`mh-eq ${isPlaying ? 'on' : ''}`}>
                    <i /><i /><i />
                  </span>
                  <span>{isPlaying ? 'NOW STREAMING' : 'PAUSED'} • 320KBPS</span>
                </div>
                <h2 className="mh-track-title">{activeStream.title}</h2>
                <p className="mh-track-artist">{activeStream.artist || 'HESHAN OFC Audio'}</p>
              </div>
            </div>

            {/* Scrubber Bar */}
            <div className="mh-scrubber">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                style={{ '--pct': `${progressPct}%` } as React.CSSProperties}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setCurrentTime(val)
                  if (audioRef.current) audioRef.current.currentTime = val
                }}
                aria-label="Seek audio"
              />
              <div className="mh-times">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls & Download Row */}
            <div className="mh-controls-row">
              <div className="mh-transport">
                <button
                  type="button"
                  className="mh-ctrl-btn"
                  onClick={() => playAdjacent(-1)}
                  disabled={tracks.length < 2}
                  aria-label="Previous track"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="mh-play-main"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6 4 20 12 6 20 6 4" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  className="mh-ctrl-btn"
                  onClick={() => playAdjacent(1)}
                  disabled={tracks.length < 2}
                  aria-label="Next track"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 18h2V6h-2zM6 18l8.5-6L6 6z" />
                  </svg>
                </button>
              </div>

              <a
                href={activeStream.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={`${activeStream.title}.mp3`}
                className="mh-dl-btn"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download MP3
              </a>
            </div>

            <audio
              ref={audioRef}
              src={activeStream.downloadUrl}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </section>
        )}

        {/* Track Results List */}
        {tracks.length > 0 && (
          <section className="mh-results">
            <div className="mh-results-head">
              <h3>Top Matches</h3>
              <span>{tracks.length} tracks</span>
            </div>

            <div className="mh-list">
              {tracks.map((track, idx) => {
                const isLoadingThis = loadingTrackId === track.id
                const isCurrent = activeStream?.id === track.id
                return (
                  <div
                    key={track.id}
                    className={`mh-item ${isCurrent ? 'active' : ''}`}
                    onClick={() => !isLoadingThis && playTrack(track)}
                  >
                    <span className="mh-idx">{idx + 1}</span>

                    {track.thumbnail ? (
                      <img src={track.thumbnail} alt={track.title} className="mh-thumb" />
                    ) : (
                      <div className="mh-thumb-fallback">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                    )}

                    <div className="mh-item-info">
                      <div className="mh-item-title">{track.title}</div>
                      <div className="mh-item-sub">
                        {track.artist}
                        {track.duration ? ` • ${track.duration}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`mh-item-btn ${isCurrent ? 'playing' : ''}`}
                      disabled={isLoadingThis}
                    >
                      {isLoadingThis ? (
                        <span className="mh-spinner sm" />
                      ) : isCurrent && isPlaying ? (
                        'Playing'
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="6 4 20 12 6 20 6 4" />
                          </svg>
                          Play
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

const css = `
.mh-root{position:relative;min-height:100vh;overflow-x:hidden;padding:28px 16px 120px;color:#f8fafc;
  background:#05070d;font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
.mh-orb{position:fixed;border-radius:999px;filter:blur(95px);pointer-events:none;z-index:0}
.mh-orb-red{top:-140px;left:50%;transform:translateX(-50%);width:480px;height:300px;
  background:radial-gradient(circle,rgba(239,68,68,.24),rgba(220,38,38,.06) 60%,transparent)}
.mh-orb-emerald{bottom:-160px;right:-100px;width:360px;height:360px;
  background:radial-gradient(circle,rgba(16,185,129,.12),transparent 70%)}
.mh-container{position:relative;z-index:1;max-width:540px;margin:0 auto}

.mh-hero{margin-bottom:22px}
.mh-pill{display:inline-flex;align-items:center;gap:7px;padding:6px 13px;border-radius:999px;margin-bottom:14px;
  background:rgba(15,23,42,.75);border:1px solid rgba(255,255,255,.09);backdrop-filter:blur(12px);
  font-size:11px;font-weight:700;letter-spacing:.06em;color:#cbd5e1}
.mh-dot{width:7px;height:7px;border-radius:50%;background:#ef4444;box-shadow:0 0 10px #ef4444}
.mh-pill-sep{color:#475569}
.mh-pill-hi{color:#34d399}
.mh-title{margin:0 0 8px;font-size:36px;font-weight:800;letter-spacing:-.03em;line-height:1.1;color:#fff}
.mh-title span{background:linear-gradient(135deg,#ef4444 0%,#f97316 50%,#10b981 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent}
.mh-subtitle{margin:0;font-size:13.5px;line-height:1.6;color:#94a3b8}

.mh-search-box{background:linear-gradient(180deg,rgba(17,24,39,.84),rgba(9,13,22,.92));
  border:1px solid rgba(255,255,255,.09);border-radius:24px;padding:16px;
  box-shadow:0 24px 60px -15px rgba(0,0,0,.75),0 1px 0 rgba(255,255,255,.06) inset;
  backdrop-filter:blur(18px)}
.mh-search-form{display:flex;flex-direction:column;gap:11px}
.mh-input-shell{position:relative;display:flex;align-items:center;height:50px;padding:0 8px 0 42px;
  border-radius:15px;background:rgba(3,7,18,.78);border:1px solid rgba(148,163,184,.16);
  transition:border-color .2s,box-shadow .2s}
.mh-input-shell:focus-within{border-color:#ef4444;box-shadow:0 0 0 4px rgba(239,68,68,.14)}
.mh-search-ico{position:absolute;left:14px;color:#64748b;pointer-events:none;transition:color .2s}
.mh-input-shell:focus-within .mh-search-ico{color:#ef4444}
.mh-input-shell input{flex:1;min-width:0;height:100%;border:0;outline:none;background:transparent;
  color:#fff;font-size:14.5px;font-family:inherit}
.mh-input-shell input::placeholder{color:#526077}
.mh-clear{border:0;background:rgba(255,255,255,.08);color:#cbd5e1;padding:6px 11px;border-radius:10px;
  font:600 12px inherit;cursor:pointer;transition:.15s}
.mh-clear:hover{background:rgba(255,255,255,.15);color:#fff}

.mh-btn-primary{display:flex;align-items:center;justify-content:center;gap:9px;height:48px;border:0;
  border-radius:15px;cursor:pointer;font:700 14.5px inherit;color:#fff;letter-spacing:.01em;
  background:linear-gradient(135deg,#ef4444 0%,#dc2626 55%,#b91c1c 100%);
  box-shadow:0 12px 28px -8px rgba(239,68,68,.65),0 1px 0 rgba(255,255,255,.22) inset;
  transition:transform .15s,filter .2s}
.mh-btn-primary:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08)}
.mh-btn-primary:disabled{opacity:.75;cursor:not-allowed}

.mh-trending{margin-top:14px;padding-top:13px;border-top:1px solid rgba(255,255,255,.06)}
.mh-trending-label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;
  letter-spacing:.07em;color:#64748b;margin-bottom:8px}
.mh-chips{display:flex;flex-wrap:wrap;gap:7px}
.mh-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:10px;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#cbd5e1;
  font:500 12px inherit;cursor:pointer;transition:.18s}
.mh-chip svg{color:#ef4444}
.mh-chip:hover{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.35);color:#fff}

.mh-alert{display:flex;align-items:center;gap:9px;margin-top:14px;padding:12px 14px;border-radius:14px;
  background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.32);color:#fecaca;font-size:13px}
.mh-alert svg{flex:none;color:#f87171}

.mh-player{margin-top:18px;padding:18px;border-radius:24px;
  background:linear-gradient(145deg,rgba(24,24,36,.95),rgba(9,13,22,.98));
  border:1px solid rgba(239,68,68,.32);
  box-shadow:0 24px 60px -15px rgba(0,0,0,.85),0 0 40px -15px rgba(239,68,68,.28)}
.mh-player-top{display:flex;align-items:center;gap:14px}
.mh-art-wrap{position:relative;width:66px;height:66px;border-radius:16px;flex-shrink:0;padding:2px;
  background:linear-gradient(135deg,#ef4444,#10b981)}
.mh-art-wrap.playing{box-shadow:0 0 24px rgba(239,68,68,.45)}
.mh-art{width:100%;height:100%;border-radius:14px;object-fit:cover;display:block}
.mh-art-fallback{width:100%;height:100%;border-radius:14px;background:#0f172a;display:grid;place-items:center;color:#ef4444}
.mh-meta{flex:1;min-width:0}
.mh-now-badge{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;
  letter-spacing:.07em;color:#34d399;margin-bottom:4px}
.mh-eq{display:inline-flex;align-items:flex-end;gap:2px;height:10px}
.mh-eq i{display:block;width:2.5px;height:4px;border-radius:2px;background:#34d399}
.mh-eq.on i:nth-child(1){animation:mh-eq .6s ease-in-out infinite alternate}
.mh-eq.on i:nth-child(2){animation:mh-eq .45s ease-in-out .15s infinite alternate}
.mh-eq.on i:nth-child(3){animation:mh-eq .55s ease-in-out .3s infinite alternate}
.mh-track-title{margin:0 0 2px;font-size:16px;font-weight:700;color:#fff;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mh-track-artist{margin:0;font-size:12.5px;color:#94a3b8;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.mh-scrubber{margin-top:14px}
.mh-scrubber input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:99px;
  background:linear-gradient(to right,#ef4444 var(--pct,0%),rgba(255,255,255,.14) var(--pct,0%));
  outline:none;cursor:pointer}
.mh-scrubber input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;
  border-radius:50%;background:#fff;box-shadow:0 0 10px rgba(239,68,68,.8);cursor:pointer}
.mh-times{display:flex;justify-content:space-between;margin-top:5px;font-size:11px;font-weight:600;color:#64748b}

.mh-controls-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;
  padding-top:14px;border-top:1px solid rgba(255,255,255,.07)}
.mh-transport{display:flex;align-items:center;gap:8px}
.mh-ctrl-btn{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;
  border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);color:#cbd5e1;cursor:pointer;transition:.15s}
.mh-ctrl-btn:hover:not(:disabled){background:rgba(255,255,255,.12);color:#fff}
.mh-ctrl-btn:disabled{opacity:.35;cursor:not-allowed}
.mh-play-main{width:44px;height:44px;display:grid;place-items:center;border-radius:14px;border:0;
  background:#fff;color:#05070d;cursor:pointer;box-shadow:0 8px 20px rgba(255,255,255,.22);transition:.15s}
.mh-play-main:hover{transform:scale(1.05)}
.mh-dl-btn{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 16px;border-radius:12px;
  background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;
  font-size:13px;font-weight:700;box-shadow:0 8px 22px -6px rgba(16,185,129,.6);transition:.15s}
.mh-dl-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}

.mh-results{margin-top:22px}
.mh-results-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 4px}
.mh-results-head h3{margin:0;font-size:14px;font-weight:700;color:#e2e8f0}
.mh-results-head span{font-size:12px;font-weight:600;color:#64748b}
.mh-list{display:flex;flex-direction:column;gap:8px}
.mh-item{display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:16px;
  background:rgba(15,23,42,.68);border:1px solid rgba(255,255,255,.06);cursor:pointer;transition:.18s}
.mh-item:hover{background:rgba(30,41,59,.78);border-color:rgba(255,255,255,.14)}
.mh-item.active{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.38)}
.mh-idx{width:18px;text-align:center;font-size:12px;font-weight:700;color:#475569;flex-shrink:0}
.mh-item.active .mh-idx{color:#ef4444}
.mh-thumb{width:46px;height:46px;border-radius:11px;object-fit:cover;flex-shrink:0}
.mh-thumb-fallback{width:46px;height:46px;border-radius:11px;background:#1e293b;display:grid;
  place-items:center;color:#64748b;flex-shrink:0}
.mh-item-info{flex:1;min-width:0}
.mh-item-title{font-size:13.5px;font-weight:700;color:#f8fafc;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mh-item-sub{font-size:11.5px;color:#94a3b8;margin-top:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mh-item-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:10px;
  border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);color:#e2e8f0;
  font:700 12px inherit;cursor:pointer;flex-shrink:0;transition:.15s}
.mh-item:hover .mh-item-btn{background:#ef4444;border-color:#ef4444;color:#fff}
.mh-item-btn.playing{background:rgba(16,185,129,.18);border-color:rgba(16,185,129,.4);color:#34d399}

.mh-spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff;animation:mh-rot .7s linear infinite}
.mh-spinner.sm{width:13px;height:13px}
@keyframes mh-rot{to{transform:rotate(360deg)}}
@keyframes mh-eq{from{height:3px}to{height:11px}}
`
