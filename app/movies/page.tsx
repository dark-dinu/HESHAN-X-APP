'use client'
import { useState } from 'react'

type MediaTab = 'movie' | 'tv'

type SearchItem = {
  title: string
  url: string
  image: string
  year?: string
  rating?: string
  quality?: string
}

type DownloadLink = {
  quality: string
  size: string
  url: string
  server?: string
}

type EpisodeItem = {
  title: string
  epNumber: string
  url: string
}

type SeasonGroup = {
  season: string
  episodes: EpisodeItem[]
}

type DetailData = {
  title: string
  image: string
  description: string
  rating?: string
  year?: string
  genres?: string[]
  downloads: DownloadLink[]
  seasons: SeasonGroup[]
}

async function fetchMovieApi(action: string, q: string) {
  const res = await fetch(
    `/api/movies?action=${encodeURIComponent(action)}&q=${encodeURIComponent(q)}`,
    { cache: 'no-store' }
  )
  const json = await res.json().catch(() => ({}))

  if (res.ok && json?.ok) {
    return json.data
  }

  // Fallback: fetch directly from browser if server IP is blocked
  if (json?.fallbackUrl) {
    const directRes = await fetch(json.fallbackUrl)
    if (directRes.ok) {
      return await directRes.json()
    }
  }

  throw new Error(json?.error || 'Failed to fetch from SinhalaSub API.')
}

function extractResults(raw: any): SearchItem[] {
  const payload = raw?.result || raw?.results || raw?.data || raw
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload?.items)
    ? payload.items
    : []

  return list
    .map((item: any) => ({
      title: String(item?.title || item?.name || 'Untitled'),
      url: String(item?.url || item?.link || ''),
      image: String(item?.image || item?.poster || item?.thumb || item?.thumbnail || ''),
      year: item?.year ? String(item.year) : '',
      rating: item?.rating || item?.imdb ? String(item.rating || item.imdb) : '',
      quality: item?.quality ? String(item.quality) : '',
    }))
    .filter((x: SearchItem) => x.url)
}

function extractLinks(raw: any): DownloadLink[] {
  const payload = raw?.result || raw?.data || raw
  const candidates =
    payload?.downloads ||
    payload?.dl_links ||
    payload?.links ||
    payload?.download_links ||
    (Array.isArray(payload) ? payload : [])

  if (!Array.isArray(candidates)) return []

  return candidates
    .map((d: any) => ({
      quality: String(d?.quality || d?.resolution || d?.label || d?.title || 'HD Download'),
      size: String(d?.size || d?.fileSize || ''),
      url: String(d?.url || d?.link || d?.dl_link || d?.download || ''),
      server: String(d?.server || d?.host || ''),
    }))
    .filter((x: DownloadLink) => x.url)
}

function extractDetails(raw: any, fallback: SearchItem): DetailData {
  const payload = raw?.result || raw?.data || raw
  const downloads = extractLinks(payload)

  const seasons: SeasonGroup[] = []
  const rawSeasons = payload?.seasons || payload?.episodes_by_season
  const rawEpisodes = payload?.episodes

  if (Array.isArray(rawSeasons)) {
    rawSeasons.forEach((s: any, idx: number) => {
      const eps = Array.isArray(s?.episodes) ? s.episodes : []
      seasons.push({
        season: String(s?.season || s?.title || `Season ${idx + 1}`),
        episodes: eps
          .map((ep: any, eIdx: number) => ({
            title: String(ep?.title || ep?.name || `Episode ${eIdx + 1}`),
            epNumber: String(ep?.episode || ep?.ep || eIdx + 1),
            url: String(ep?.url || ep?.link || ''),
          }))
          .filter((e: EpisodeItem) => e.url),
      })
    })
  } else if (Array.isArray(rawEpisodes)) {
    seasons.push({
      season: 'All Episodes',
      episodes: rawEpisodes
        .map((ep: any, eIdx: number) => ({
          title: String(ep?.title || ep?.name || `Episode ${eIdx + 1}`),
          epNumber: String(ep?.episode || ep?.ep || eIdx + 1),
          url: String(ep?.url || ep?.link || ''),
        }))
        .filter((e: EpisodeItem) => e.url),
    })
  }

  return {
    title: String(payload?.title || payload?.name || fallback.title),
    image: String(payload?.image || payload?.poster || fallback.image),
    description: String(
      payload?.description || payload?.plot || payload?.synopsis || 'Sinhala Subtitles Available'
    ),
    rating: payload?.rating || payload?.imdb ? String(payload.rating || payload.imdb) : fallback.rating,
    year: payload?.year ? String(payload.year) : fallback.year,
    genres: Array.isArray(payload?.genres) ? payload.genres.map(String) : [],
    downloads,
    seasons,
  }
}

export default function MoviesHubPage() {
  const [tab, setTab] = useState<MediaTab>('movie')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedItem, setSelectedItem] = useState<SearchItem | null>(null)
  const [details, setDetails] = useState<DetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [activeEpUrl, setActiveEpUrl] = useState('')
  const [epLinks, setEpLinks] = useState<DownloadLink[]>([])
  const [epLoading, setEpLoading] = useState(false)

  const handleSearch = async (e?: React.FormEvent, customQuery?: string, customTab?: MediaTab) => {
    if (e) e.preventDefault()
    const activeTab = customTab || tab
    const q = (customQuery !== undefined ? customQuery : query).trim()
    if (!q) return

    setLoading(true)
    setError('')
    setSelectedItem(null)
    setDetails(null)

    try {
      const action = activeTab === 'movie' ? 'search' : 'tv-search'
      const raw = await fetchMovieApi(action, q)
      const parsed = extractResults(raw)
      setResults(parsed)
      if (parsed.length === 0) {
        setError('No matching titles found. Try another keyword.')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch from SinhalaSub API.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const openItemDetails = async (item: SearchItem) => {
    setSelectedItem(item)
    setDetails(null)
    setActiveEpUrl('')
    setEpLinks([])
    setDetailLoading(true)
    setError('')

    try {
      const action = tab === 'movie' ? 'infodl' : 'tv-info'
      const raw = await fetchMovieApi(action, item.url)
      setDetails(extractDetails(raw, item))
    } catch (err: any) {
      setError(err?.message || 'Could not load details.')
    } finally {
      setDetailLoading(false)
    }
  }

  const fetchEpisodeLinks = async (ep: EpisodeItem) => {
    setActiveEpUrl(ep.url)
    setEpLinks([])
    setEpLoading(true)

    try {
      const raw = await fetchMovieApi('tv-dl', ep.url)
      setEpLinks(extractLinks(raw))
    } catch {}
    finally {
      setEpLoading(false)
    }
  }

  const switchTab = (nextTab: MediaTab) => {
    setTab(nextTab)
    setSelectedItem(null)
    setDetails(null)
    setResults([])
    setError('')
  }

  return (
    <main className="mv-root">
      <style>{css}</style>

      <div className="mv-wrap">
        <header className="mv-hero">
          <div className="mv-pill">
            <span className="mv-dot" />
            <span>SINHALA SUBTITLES • 1080P &amp; 720P</span>
          </div>
          <h1 className="mv-title">
            Movies &amp; <span>TV Shows</span>
          </h1>
          <p className="mv-sub">
            Search &amp; download Sinhala subtitled movies and full TV series episodes directly.
          </p>
        </header>

        <div className="mv-tabs">
          <button
            type="button"
            className={`mv-tab ${tab === 'movie' ? 'active' : ''}`}
            onClick={() => switchTab('movie')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="2" y="3" width="20" height="18" rx="3" />
              <path d="M7 3v18M17 3v18M2 9h5M2 15h5M17 9h5M17 15h5" />
            </svg>
            <span>Movies</span>
          </button>

          <button
            type="button"
            className={`mv-tab ${tab === 'tv' ? 'active' : ''}`}
            onClick={() => switchTab('tv')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="2" y="7" width="20" height="14" rx="2.5" />
              <path d="m17 2-5 5-5-5" />
            </svg>
            <span>TV Series</span>
          </button>
        </div>

        <form onSubmit={(e) => handleSearch(e)} className="mv-search">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === 'movie'
                ? 'Search movies (e.g. Avatar, Deadpool)...'
                : 'Search TV shows (e.g. House of the Dragon)...'
            }
          />
          {query && (
            <button
              type="button"
              className="mv-clear"
              onClick={() => setQuery('')}
              aria-label="Clear"
            >
              ✕
            </button>
          )}
          <button type="submit" disabled={loading || !query.trim()} className="mv-go">
            {loading ? '...' : 'Search'}
          </button>
        </form>

        {!selectedItem && results.length === 0 && !loading && (
          <div className="mv-chips">
            {(tab === 'movie'
              ? ['Avatar', 'Deadpool', 'Venom', 'Pushpa', 'Spider-Man']
              : ['House of the Dragon', 'Stranger Things', 'Squid Game', 'Money Heist']
            ).map((tag) => (
              <button
                key={tag}
                type="button"
                className="mv-chip"
                onClick={() => {
                  setQuery(tag)
                  handleSearch(undefined, tag, tab)
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {error && <div className="mv-err">{error}</div>}

        {loading && (
          <div className="mv-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="mv-skel" />
            ))}
          </div>
        )}

        {selectedItem && (
          <section className="mv-detail">
            <button
              type="button"
              className="mv-back"
              onClick={() => {
                setSelectedItem(null)
                setDetails(null)
              }}
            >
              ← Back to Results
            </button>

            {detailLoading ? (
              <div className="mv-detail-load">Loading SinhalaSub links...</div>
            ) : details ? (
              <>
                <div className="mv-detail-top">
                  {details.image && (
                    <img src={details.image} alt={details.title} className="mv-detail-poster" />
                  )}
                  <div className="mv-detail-meta">
                    <h2>{details.title}</h2>
                    <div className="mv-badges">
                      {details.year && <span className="mv-b">{details.year}</span>}
                      {details.rating && <span className="mv-b gold">★ {details.rating}</span>}
                      <span className="mv-b sub">Sinhala Sub</span>
                    </div>
                    <p>{details.description}</p>
                  </div>
                </div>

                {details.downloads.length > 0 && (
                  <div className="mv-dl-box">
                    <h3>Direct Download Links</h3>
                    <div className="mv-dl-list">
                      {details.downloads.map((dl, idx) => (
                        <a
                          key={idx}
                          href={dl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mv-dl-btn"
                        >
                          <div>
                            <strong>{dl.quality}</strong>
                            <span>
                              {dl.size ? dl.size : 'Direct Link'}
                              {dl.server ? ` • ${dl.server}` : ''}
                            </span>
                          </div>
                          <span className="mv-dl-tag">Download ↓</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {details.seasons.length > 0 && (
                  <div className="mv-seasons">
                    {details.seasons.map((s, sIdx) => (
                      <div key={sIdx} className="mv-season-block">
                        <h3>{s.season}</h3>
                        <div className="mv-ep-list">
                          {s.episodes.map((ep, eIdx) => {
                            const isOpen = activeEpUrl === ep.url
                            return (
                              <div key={eIdx} className="mv-ep-item">
                                <button
                                  type="button"
                                  className={`mv-ep-btn ${isOpen ? 'active' : ''}`}
                                  onClick={() => fetchEpisodeLinks(ep)}
                                >
                                  <span>{ep.title}</span>
                                  <span className="mv-ep-act">
                                    {isOpen && epLoading ? 'Loading...' : 'Get Links ↓'}
                                  </span>
                                </button>

                                {isOpen && !epLoading && (
                                  <div className="mv-ep-links">
                                    {epLinks.length === 0 ? (
                                      <div className="mv-ep-none">No direct links found for this episode.</div>
                                    ) : (
                                      epLinks.map((link, lIdx) => (
                                        <a
                                          key={lIdx}
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="mv-dl-btn small"
                                        >
                                          <div>
                                            <strong>{link.quality}</strong>
                                            {link.size && <span>{link.size}</span>}
                                          </div>
                                          <span className="mv-dl-tag">Download ↓</span>
                                        </a>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </section>
        )}

        {!selectedItem && !loading && results.length > 0 && (
          <section className="mv-grid">
            {results.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="mv-card"
                onClick={() => openItemDetails(item)}
              >
                <div className="mv-poster-wrap">
                  {item.image ? (
                    <img src={item.image} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="mv-no-img">NO POSTER</div>
                  )}
                  <span className="mv-sub-tag">SIN SUB</span>
                  {item.rating && <span className="mv-rate-tag">★ {item.rating}</span>}
                </div>
                <div className="mv-card-body">
                  <h3>{item.title}</h3>
                  {item.year && <span>{item.year}</span>}
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

const css = `
.mv-root{min-height:100vh;padding:14px 14px 90px;color:#f8fafc;
  background:radial-gradient(circle at 50% 0%,rgba(220,38,38,.16),transparent 45%),#05070d;
  font-family:Inter,system-ui,-apple-system,sans-serif}
.mv-wrap{max-width:640px;margin:0 auto}

.mv-hero{text-align:center;margin-bottom:16px}
.mv-pill{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:999px;
  background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);
  font-size:10.5px;font-weight:800;letter-spacing:.06em;color:#fca5a5}
.mv-dot{width:7px;height:7px;border-radius:50%;background:#ef4444;box-shadow:0 0 8px #ef4444}
.mv-title{margin:8px 0 4px;font-size:26px;font-weight:900;letter-spacing:-.02em}
.mv-title span{color:#ef4444}
.mv-sub{margin:0;font-size:12.5px;color:#94a3b8}

.mv-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:5px;border-radius:16px;
  background:rgba(15,23,42,.85);border:1px solid rgba(255,255,255,.08);margin-bottom:12px}
.mv-tab{display:flex;align-items:center;justify-content:center;gap:7px;height:40px;border:0;
  border-radius:12px;background:transparent;color:#94a3b8;font:700 13px inherit;cursor:pointer;
  transition:all .2s cubic-bezier(.16,1,.3,1)}
.mv-tab.active{background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;
  box-shadow:0 6px 18px rgba(239,68,68,.32)}

.mv-search{display:flex;align-items:center;gap:8px;padding:6px;border-radius:16px;
  background:rgba(13,18,32,.95);border:1px solid rgba(255,255,255,.1)}
.mv-search input{flex:1;min-width:0;height:42px;padding:0 12px;border:0;background:transparent;
  color:#fff;font-size:14px;outline:none}
.mv-clear{width:28px;height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.08);
  color:#cbd5e1;font-size:12px;cursor:pointer}
.mv-go{height:42px;padding:0 18px;border:0;border-radius:12px;
  background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font:700 13px inherit;cursor:pointer}
.mv-go:disabled{opacity:.5;cursor:not-allowed}

.mv-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin-top:14px}
.mv-chip{padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.09);
  background:rgba(255,255,255,.04);color:#cbd5e1;font:600 12px inherit;cursor:pointer}
.mv-chip:hover{border-color:rgba(239,68,68,.45);color:#fff}

.mv-err{margin-top:12px;padding:10px 14px;border-radius:12px;font-size:12.5px;
  background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.35);color:#fecaca}

.mv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px}
@media(min-width:520px){.mv-grid{grid-template-columns:repeat(3,1fr)}}

.mv-skel{height:240px;border-radius:16px;
  background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(239,68,68,.1) 50%,rgba(255,255,255,.04) 75%);
  background-size:200% 100%;animation:mvShimmer 1.3s infinite}
@keyframes mvShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

.mv-card{text-align:left;padding:0;border-radius:16px;overflow:hidden;cursor:pointer;
  background:rgba(15,23,42,.85);border:1px solid rgba(255,255,255,.08);
  transition:transform .2s ease,border-color .2s ease}
.mv-card:hover{transform:translateY(-3px);border-color:rgba(239,68,68,.45)}
.mv-poster-wrap{position:relative;aspect-ratio:2/3;background:#0f172a}
.mv-poster-wrap img{width:100%;height:100%;object-fit:cover;display:block}
.mv-no-img{height:100%;display:grid;place-items:center;font-size:11px;color:#64748b;font-weight:700}
.mv-sub-tag{position:absolute;top:8px;left:8px;padding:3px 7px;border-radius:6px;
  background:rgba(239,68,68,.9);color:#fff;font-size:9.5px;font-weight:800}
.mv-rate-tag{position:absolute;bottom:8px;right:8px;padding:3px 7px;border-radius:6px;
  background:rgba(2,6,23,.85);color:#facc15;font-size:10.5px;font-weight:800}
.mv-card-body{padding:10px}
.mv-card-body h3{margin:0;font-size:12.5px;font-weight:700;color:#fff;line-height:1.35;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mv-card-body span{display:block;margin-top:4px;font-size:11px;color:#94a3b8}

.mv-detail{margin-top:14px;padding:14px;border-radius:20px;
  background:rgba(11,16,29,.95);border:1px solid rgba(255,255,255,.09)}
.mv-back{border:0;background:rgba(255,255,255,.07);color:#e2e8f0;padding:7px 13px;
  border-radius:10px;font:700 12px inherit;cursor:pointer;margin-bottom:14px}
.mv-detail-load{text-align:center;padding:30px 10px;color:#94a3b8;font-size:13px}
.mv-detail-top{display:flex;gap:14px;align-items:flex-start}
.mv-detail-poster{width:105px;border-radius:14px;object-fit:cover;flex-shrink:0;
  border:1px solid rgba(255,255,255,.12)}
.mv-detail-meta h2{margin:0 0 6px;font-size:17px;font-weight:800;line-height:1.3}
.mv-badges{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.mv-b{font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:6px;
  background:rgba(255,255,255,.08);color:#cbd5e1}
.mv-b.gold{color:#facc15;background:rgba(250,204,21,.15)}
.mv-b.sub{color:#fca5a5;background:rgba(239,68,68,.18)}
.mv-detail-meta p{margin:0;font-size:12px;line-height:1.5;color:#94a3b8}

.mv-dl-box{margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}
.mv-dl-box h3,.mv-season-block h3{margin:0 0 10px;font-size:13.5px;font-weight:800;color:#fff}
.mv-dl-list{display:flex;flex-direction:column;gap:8px}
.mv-dl-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:11px 14px;border-radius:13px;text-decoration:none;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);color:#fff}
.mv-dl-btn:hover{border-color:rgba(239,68,68,.5);background:rgba(239,68,68,.12)}
.mv-dl-btn strong{display:block;font-size:13px}
.mv-dl-btn span{font-size:11px;color:#94a3b8}
.mv-dl-tag{padding:6px 11px;border-radius:9px;background:linear-gradient(135deg,#ef4444,#dc2626);
  color:#fff !important;font-size:11.5px;font-weight:700;white-space:nowrap}

.mv-seasons{margin-top:16px;display:flex;flex-direction:column;gap:14px}
.mv-ep-list{display:flex;flex-direction:column;gap:7px}
.mv-ep-item{border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);overflow:hidden}
.mv-ep-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:11px 13px;border:0;background:transparent;color:#f8fafc;font:600 12.5px inherit;cursor:pointer;text-align:left}
.mv-ep-btn.active{background:rgba(239,68,68,.14)}
.mv-ep-act{font-size:11px;font-weight:700;color:#f87171;white-space:nowrap}
.mv-ep-links{padding:8px 10px 10px;display:flex;flex-direction:column;gap:6px;background:rgba(0,0,0,.25)}
.mv-dl-btn.small{padding:8px 11px}
.mv-ep-none{font-size:11.5px;color:#94a3b8;padding:4px}
`
