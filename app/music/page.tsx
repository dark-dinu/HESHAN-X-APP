'use client'
import { useEffect, useRef, useState } from 'react'

type TrackItem = {
  id: string
  title: string
  artist: string
  views?: string
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

const CATEGORIES = [
  { label: 'Popular Hits', query: 'Sinhala Trending Songs 2026' },
  { label: 'Sinhala Top', query: 'Kamali Dewiyo Lelena Sinhala' },
  { label: 'DILU Beats', query: 'DILU Beats' },
  { label: 'Global Viral', query: 'Ed Sheeran The Weeknd Top Hits' },
]

export default function MusicHubPage() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Popular Hits')
  const [isDefaultFeed, setIsDefaultFeed] = useState(true)
  const [searching, setSearching] = useState(true)
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null)
  const [tracks, setTracks] = useState<TrackItem[]>([])
  const [activeStream, setActiveStream] = useState<ActiveStream | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const skipNextSuggestRef = useRef(false)

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const fetchTracks = async (searchTerm: string, isAuto = false) => {
    setError('')
    setSearching(true)
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(searchTerm)}`)
      const data = await res.json()
      if (!res.ok) {
        if (!isAuto) setTracks([])
        setError(data.error || 'No matching tracks found.')
      } else {
        setTracks(data.tracks || [])
        setIsDefaultFeed(isAuto)
      }
    } catch {
      setError('Unable to load tracks right now. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  // Auto-load trending tracks on initial page open
  useEffect(() => {
    fetchTracks(CATEGORIES[0].query, true)
  }, [])

  // Close suggestions dropdown when tapping outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Fetch live YouTube autocomplete suggestions while typing
  useEffect(() => {
    if (skipNextSuggestRef.current) {
      skipNextSuggestRef.current = false
      return
    }

    const trimmed = query.trim()
    const isUrl =
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.includes('youtu') ||
      trimmed.includes('spotify.com')

    if (trimmed.length < 2 || isUrl) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        const list = Array.isArray(data?.suggestions) ? data.suggestions : []
        setSuggestions(list)
        setShowSuggestions(list.length > 0)
      } catch {
        // Ignore aborted or failed suggestion requests
      }
    }, 240)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

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
    setShowSuggestions(false)
    if (!q) {
      setError('Enter a song title, artist, or Spotify / YouTube link.')
      return
    }
    skipNextSuggestRef.current = true
    setQuery(q)
    setError('')

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
      return
    }

    await fetchTracks(q, false)
  }

  const handleCategoryClick = (cat: { label: string; query: string }) => {
    setActiveCategory(cat.label)
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    fetchTracks(cat.query, true)
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
            Stream trending hits or search any song by name, Spotify &amp; YouTube link in 320kbps HD audio.
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
            <div className="mh-autocomplete-wrap" ref={searchWrapRef}>
              <div className="mh-input-shell">
                <svg className="mh-search-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true)
                  }}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search songs, artists, or paste link..."
                  aria-label="Search songs or paste link"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    className="mh-clear"
                    onClick={() => {
                      setQuery('')
                      setSuggestions([])
                      setShowSuggestions(false)
                      setError('')
                      fetchTracks(CATEGORIES[0].query, true)
                      setActiveCategory(CATEGORIES[0].label)
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* YouTube-Style Live Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="mh-suggest-drop" role="listbox">
                  {suggestions.map((item, i) => (
                    <button
                      key={`${item}-${i}`}
                      type="button"
                      className="mh-suggest-item"
                      onClick={() => handleSearch(item)}
                    >
                      <svg className="mh-suggest-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                      </svg>
                      <span className="mh-suggest-text">{item}</span>
                      <svg className="mh-suggest-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="mh-btn-primary" disabled={searching}>
              {searching && !isDefaultFeed ? (
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

          {/* Category Filter Chips */}
          <div className="mh-trending">
            <span className="mh-trending-label">Browse Charts:</span>
            <div className="mh-chips">
              {CATEGORIES.map((cat) => {
                const isCatActive = isDefaultFeed && activeCategory === cat.label
                return (
                  <button
                    key={cat.label}
                    type="button"
                    className={`mh-chip ${isCatActive ? 'active' : ''}`}
                    onClick={() => handleCategoryClick(cat)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    {cat.label}
                  </button>
                )
              })}
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

        {/* YouTube-Style Large Cover Feed */}
        <section className="mh-results">
          <div className="mh-results-head">
            <h3>
              {isDefaultFeed ? `🔥 ${activeCategory}` : `Search Results for "${query}"`}
            </h3>
            <span>{searching ? 'Loading...' : `${tracks.length} tracks`}</span>
          </div>

          {searching && tracks.length === 0 ? (
            <div className="mh-skeleton-grid">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="mh-skel-card">
                  <div className="mh-skel-thumb" />
                  <div className="mh-skel-line w80" />
                  <div className="mh-skel-line w50" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mh-yt-grid">
              {tracks.map((track, idx) => {
                const isLoadingThis = loadingTrackId === track.id
                const isCurrent = activeStream?.id === track.id
                return (
                  <article
                    key={track.id}
                    className={`mh-yt-card ${isCurrent ? 'active' : ''}`}
                    onClick={() => !isLoadingThis && playTrack(track)}
                  >
                    <div className="mh-yt-media">
                      {track.thumbnail ? (
                        <img src={track.thumbnail} alt={track.title} className="mh-yt-img" loading="lazy" />
                      ) : (
                        <div className="mh-yt-fallback">
                          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                          </svg>
                        </div>
                      )}

                      <div className="mh-yt-shade" />
                      <span className="mh-yt-rank">#{idx + 1}</span>
                      {track.duration && (
                        <span className="mh-yt-dur">{track.duration}</span>
                      )}

                      <button
                        type="button"
                        className={`mh-yt-play ${isCurrent ? 'on' : ''}`}
                        disabled={isLoadingThis}
                        aria-label={`Play ${track.title}`}
                      >
                        {isLoadingThis ? (
                          <span className="mh-spinner sm" />
                        ) : isCurrent && isPlaying ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="7 4 20 12 7 20 7 4" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="mh-yt-body">
                      <div className="mh-yt-avatar">
                        {track.thumbnail ? (
                          <img src={track.thumbnail} alt="" />
                        ) : (
                          <span>♪</span>
                        )}
                      </div>

                      <div className="mh-yt-text">
                        <h4 className="mh-yt-title">{track.title}</h4>
                        <div className="mh-yt-artist">
                          <span>{track.artist}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#38bdf8">
                            <path d="M12 2L14.8 4.4L18.4 4.1L19.4 7.6L22.3 9.7L21 13.1L22.3 16.5L19.4 18.6L18.4 22.1L14.8 21.8L12 24.2L9.2 21.8L5.6 22.1L4.6 18.6L1.7 16.5L3 13.1L1.7 9.7L4.6 7.6L5.6 4.1L9.2 4.4L12 2ZM10.5 16.5L17 10L15.6 8.6L10.5 13.7L8.4 11.6L7 13L10.5 16.5Z" />
                          </svg>
                        </div>
                        <div className="mh-yt-stats">
                          <span>{track.views || '1.2M plays'}</span>
                          <span>•</span>
                          <span className="mh-yt-hq">320kbps MP3</span>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

const css = `
.mh-root{position:relative;min-height:100vh;overflow-x:hidden;padding:24px 16px 120px;color:#f8fafc;
  background:#05070d;font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
.mh-orb{position:fixed;border-radius:999px;filter:blur(95px);pointer-events:none;z-index:0}
.mh-orb-red{top:-140px;left:50%;transform:translateX(-50%);width:480px;height:300px;
  background:radial-gradient(circle,rgba(239,68,68,.24),rgba(220,38,38,.06) 60%,transparent)}
.mh-orb-emerald{bottom:-160px;right:-100px;width:360px;height:360px;
  background:radial-gradient(circle,rgba(16,185,129,.12),transparent 70%)}
.mh-container{position:relative;z-index:1;max-width:640px;margin:0 auto}

.mh-hero{margin-bottom:20px}
.mh-pill{display:inline-flex;align-items:center;gap:7px;padding:6px 13px;border-radius:999px;margin-bottom:12px;
  background:rgba(15,23,42,.75);border:1px solid rgba(255,255,255,.09);backdrop-filter:blur(12px);
  font-size:11px;font-weight:700;letter-spacing:.06em;color:#cbd5e1}
.mh-dot{width:7px;height:7px;border-radius:50%;background:#ef4444;box-shadow:0 0 10px #ef4444}
.mh-pill-sep{color:#475569}
.mh-pill-hi{color:#34d399}
.mh-title{margin:0 0 6px;font-size:34px;font-weight:800;letter-spacing:-.03em;line-height:1.1;color:#fff}
.mh-title span{background:linear-gradient(135deg,#ef4444 0%,#f97316 50%,#10b981 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent}
.mh-subtitle{margin:0;font-size:13.5px;line-height:1.55;color:#94a3b8}

.mh-search-box{position:relative;z-index:30;background:linear-gradient(180deg,rgba(17,24,39,.84),rgba(9,13,22,.92));
  border:1px solid rgba(255,255,255,.09);border-radius:24px;padding:15px;
  box-shadow:0 24px 60px -15px rgba(0,0,0,.75),0 1px 0 rgba(255,255,255,.06) inset;
  backdrop-filter:blur(18px)}
.mh-search-form{display:flex;flex-direction:column;gap:10px}
.mh-autocomplete-wrap{position:relative;z-index:40}
.mh-input-shell{position:relative;display:flex;align-items:center;height:48px;padding:0 8px 0 42px;
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

/* YouTube Live Autocomplete Dropdown */
.mh-suggest-drop{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:99;
  border-radius:16px;overflow:hidden;background:rgba(10,15,28,.98);
  border:1px solid rgba(239,68,68,.38);
  box-shadow:0 22px 50px rgba(0,0,0,.92);backdrop-filter:blur(20px)}
.mh-suggest-item{width:100%;display:flex;align-items:center;gap:11px;padding:11px 14px;
  border:0;border-bottom:1px solid rgba(255,255,255,.05);background:transparent;
  color:#f1f5f9;font:500 13.5px inherit;text-align:left;cursor:pointer;transition:background .14s}
.mh-suggest-item:last-child{border-bottom:0}
.mh-suggest-item:hover,.mh-suggest-item:active{background:rgba(239,68,68,.16);color:#fff}
.mh-suggest-ico{color:#64748b;flex-shrink:0}
.mh-suggest-item:hover .mh-suggest-ico{color:#ef4444}
.mh-suggest-text{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mh-suggest-arrow{color:#475569;flex-shrink:0}

.mh-btn-primary{display:flex;align-items:center;justify-content:center;gap:9px;height:46px;border:0;
  border-radius:15px;cursor:pointer;font:700 14.5px inherit;color:#fff;letter-spacing:.01em;
  background:linear-gradient(135deg,#ef4444 0%,#dc2626 55%,#b91c1c 100%);
  box-shadow:0 12px 28px -8px rgba(239,68,68,.65),0 1px 0 rgba(255,255,255,.22) inset;
  transition:transform .15s,filter .2s}
.mh-btn-primary:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08)}
.mh-btn-primary:disabled{opacity:.75;cursor:not-allowed}

.mh-trending{margin-top:13px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06)}
.mh-trending-label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;
  letter-spacing:.07em;color:#64748b;margin-bottom:8px}
.mh-chips{display:flex;flex-wrap:wrap;gap:7px}
.mh-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#cbd5e1;
  font:600 12px inherit;cursor:pointer;transition:.18s}
.mh-chip svg{color:#ef4444}
.mh-chip:hover,.mh-chip.active{background:rgba(239,68,68,.16);border-color:rgba(239,68,68,.45);color:#fff}

.mh-alert{display:flex;align-items:center;gap:9px;margin-top:14px;padding:12px 14px;border-radius:14px;
  background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.32);color:#fecaca;font-size:13px}
.mh-alert svg{flex:none;color:#f87171}

.mh-player{margin-top:18px;padding:18px;border-radius:24px;
  background:linear-gradient(145deg,rgba(24,24,36,.95),rgba(9,13,22,.98));
  border:1px solid rgba(239,68,68,.36);
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
.mh-results-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:0 4px}
.mh-results-head h3{margin:0;font-size:15px;font-weight:800;color:#f1f5f9;letter-spacing:-.01em}
.mh-results-head span{font-size:12px;font-weight:600;color:#64748b}

.mh-yt-grid{display:grid;grid-template-columns:1fr;gap:14px}
@media(min-width:520px){.mh-yt-grid{grid-template-columns:1fr 1fr}}

.mh-yt-card{border-radius:20px;overflow:hidden;background:rgba(15,23,42,.82);
  border:1px solid rgba(255,255,255,.08);cursor:pointer;
  box-shadow:0 14px 35px -12px rgba(0,0,0,.65);transition:transform .2s,border-color .2s,box-shadow .2s}
.mh-yt-card:hover{transform:translateY(-3px);border-color:rgba(239,68,68,.4);
  box-shadow:0 20px 45px -12px rgba(239,68,68,.22)}
.mh-yt-card.active{border-color:#ef4444;box-shadow:0 0 0 1px #ef4444,0 18px 40px -10px rgba(239,68,68,.35)}

.mh-yt-media{position:relative;width:100%;aspect-ratio:16/9;background:#0b1120;overflow:hidden}
.mh-yt-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s ease}
.mh-yt-card:hover .mh-yt-img{transform:scale(1.05)}
.mh-yt-fallback{width:100%;height:100%;display:grid;place-items:center;color:#475569;
  background:linear-gradient(135deg,#0f172a,#1e293b)}
.mh-yt-shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(5,7,13,.82) 0%,rgba(5,7,13,.15) 55%,transparent 100%)}

.mh-yt-rank{position:absolute;top:10px;left:10px;padding:3px 9px;border-radius:8px;
  background:rgba(5,7,13,.78);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.12);
  font-size:11px;font-weight:800;color:#fff}
.mh-yt-dur{position:absolute;bottom:10px;right:10px;padding:3px 8px;border-radius:7px;
  background:rgba(5,7,13,.85);font-size:11px;font-weight:700;color:#f8fafc}
.mh-yt-play{position:absolute;bottom:10px;left:10px;width:38px;height:38px;border-radius:50%;border:0;
  display:grid;place-items:center;background:#ef4444;color:#fff;cursor:pointer;
  box-shadow:0 6px 18px rgba(239,68,68,.65);transition:transform .15s}
.mh-yt-card:hover .mh-yt-play{transform:scale(1.08)}
.mh-yt-play.on{background:#10b981;box-shadow:0 6px 18px rgba(16,185,129,.65)}

.mh-yt-body{display:flex;align-items:flex-start;gap:11px;padding:12px 13px 14px}
.mh-yt-avatar{width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;
  background:#1e293b;border:1px solid rgba(255,255,255,.1);display:grid;place-items:center;
  font-size:14px;font-weight:700;color:#94a3b8}
.mh-yt-avatar img{width:100%;height:100%;object-fit:cover}
.mh-yt-text{flex:1;min-width:0}
.mh-yt-title{margin:0 0 4px;font-size:14px;font-weight:700;line-height:1.35;color:#f8fafc;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mh-yt-artist{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#cbd5e1}
.mh-yt-artist span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mh-yt-stats{display:flex;align-items:center;gap:6px;margin-top:3px;font-size:11.5px;color:#94a3b8}
.mh-yt-hq{color:#34d399;font-weight:700}

.mh-skeleton-grid{display:grid;grid-template-columns:1fr;gap:14px}
@media(min-width:520px){.mh-skeleton-grid{grid-template-columns:1fr 1fr}}
.mh-skel-card{border-radius:20px;padding-bottom:14px;background:rgba(15,23,42,.6);border:1px solid rgba(255,255,255,.05);overflow:hidden}
.mh-skel-thumb{width:100%;aspect-ratio:16/9;background:linear-gradient(90deg,#0f172a 25%,#1e293b 50%,#0f172a 75%);
  background-size:200% 100%;animation:mh-shimmer 1.4s infinite}
.mh-skel-line{height:12px;border-radius:6px;margin:10px 13px 0;background:#1e293b}
.mh-skel-line.w80{width:78%}
.mh-skel-line.w50{width:48%}

.mh-spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff;animation:mh-rot .7s linear infinite}
.mh-spinner.sm{width:14px;height:14px}
@keyframes mh-rot{to{transform:rotate(360deg)}}
@keyframes mh-eq{from{height:3px}to{height:11px}}
@keyframes mh-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
`
