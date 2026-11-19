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
  title: string
  artist: string
  thumbnail: string
  downloadUrl: string
}

const SUGGESTIONS = [
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
      setError('Please enter a song name, Spotify link, or YouTube link.')
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
          artist: '320kbps MP3',
          url: q,
        })
        setSearching(false)
        return
      }

      const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) {
        setTracks([])
        setError(data.error || 'No songs found.')
      } else {
        setTracks(data.tracks || [])
      }
    } catch {
      setError('Search failed. Please check your connection.')
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

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 0%, #064e3b 0%, #020617 65%)',
        color: '#f8fafc',
        padding: '24px 16px 120px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            borderRadius: 999,
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            fontSize: 12,
            color: '#cbd5e1',
            marginBottom: 14,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          <span>Music Hub • 320kbps MP3</span>
        </div>

        <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 800, color: '#22c55e' }}>
          Music Hub <span style={{ color: '#fff' }}>🎧</span>
        </h1>
        <p style={{ margin: '0 0 22px', fontSize: 14, color: '#94a3b8', lineHeight: 1.55 }}>
          Search any song by name or paste a Spotify / YouTube link. Listen directly online before downloading in 320kbps MP3.
        </p>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.78)',
            border: '1px solid rgba(148, 163, 184, 0.16)',
            borderRadius: 20,
            padding: 16,
            boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(2, 6, 23, 0.75)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 14,
                padding: '6px 8px 6px 14px',
                marginBottom: 12,
              }}
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Song name / Spotify / YouTube link..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 0,
                  outline: 'none',
                  color: '#fff',
                  fontSize: 14.5,
                  height: 36,
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setTracks([])
                    setError('')
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: 0,
                    color: '#cbd5e1',
                    padding: '6px 12px',
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={searching}
              style={{
                width: '100%',
                height: 46,
                borderRadius: 14,
                border: 0,
                background: 'linear-gradient(135deg, #22c55e, #15803d)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: searching ? 'not-allowed' : 'pointer',
                opacity: searching ? 0.75 : 1,
                boxShadow: '0 10px 25px -8px rgba(34, 197, 94, 0.65)',
              }}
            >
              {searching ? 'Searching Tracks...' : 'Search & Listen'}
            </button>
          </form>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSearch(s)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(148,163,184,0.14)',
                  color: '#cbd5e1',
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontSize: 12.5,
                  cursor: 'pointer',
                }}
              >
                🎵 {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: '11px 14px',
              borderRadius: 13,
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fecaca',
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {activeStream && (
          <div
            style={{
              marginTop: 18,
              background: 'linear-gradient(135deg, rgba(20, 83, 45, 0.65), rgba(15, 23, 42, 0.95))',
              border: '1px solid rgba(34, 197, 94, 0.45)',
              borderRadius: 20,
              padding: 16,
              boxShadow: '0 18px 45px rgba(0, 0, 0, 0.65)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {activeStream.thumbnail ? (
                <img
                  src={activeStream.thumbnail}
                  alt={activeStream.title}
                  style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 12,
                    background: '#14532d',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 26,
                  }}
                >
                  🎶
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' }}>
                  Now Playing • 320kbps MP3
                </div>
                <div
                  style={{
                    fontSize: 15.5,
                    fontWeight: 700,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {activeStream.title}
                </div>
                <div style={{ fontSize: 12.5, color: '#cbd5e1' }}>{activeStream.artist}</div>
              </div>

              <button
                type="button"
                onClick={togglePlay}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: 0,
                  background: '#22c55e',
                  color: '#020617',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setCurrentTime(val)
                  if (audioRef.current) audioRef.current.currentTime = val
                }}
                style={{ width: '100%', accentColor: '#22c55e', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#94a3b8' }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <a
              href={activeStream.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`${activeStream.title}.mp3`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 12,
                width: '100%',
                height: 42,
                borderRadius: 12,
                background: '#fff',
                color: '#0f172a',
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              ⬇️ Download 320kbps MP3
            </a>

            <audio
              ref={audioRef}
              src={activeStream.downloadUrl}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        )}

        {tracks.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>
              Search Results ({tracks.length}) — Tap any track to listen
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tracks.map((track) => {
                const isLoadingThis = loadingTrackId === track.id
                return (
                  <div
                    key={track.id}
                    onClick={() => !isLoadingThis && playTrack(track)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      borderRadius: 15,
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(148, 163, 184, 0.14)',
                      cursor: isLoadingThis ? 'wait' : 'pointer',
                    }}
                  >
                    {track.thumbnail ? (
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 10,
                          background: '#1e293b',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 22,
                          flexShrink: 0,
                        }}
                      >
                        🎵
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#f8fafc',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#94a3b8',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {track.artist} {track.duration ? `• ${track.duration}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isLoadingThis}
                      style={{
                        padding: '8px 13px',
                        borderRadius: 10,
                        border: 0,
                        background: isLoadingThis ? '#334155' : 'rgba(34, 197, 94, 0.2)',
                        color: isLoadingThis ? '#cbd5e1' : '#4ade80',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {isLoadingThis ? 'Loading...' : '▶ Play'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
