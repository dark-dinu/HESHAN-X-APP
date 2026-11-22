'use client'
import { useState } from 'react'

type ImageItem = {
  id: string
  title: string
  url: string
  thumb: string
  source?: string
}

const TRENDING_TAGS = [
  '4K Wallpaper',
  'Cyberpunk',
  'Anime 4K',
  'Supercars',
  'Cat',
  'Nature HD',
  'Dark Aesthetic',
]

export default function ImagesHubPage() {
  const [query, setQuery] = useState('')
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ImageItem | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleSearch = async (e?: React.FormEvent, customQ?: string) => {
    if (e) e.preventDefault()
    const q = (customQ !== undefined ? customQ : query).trim()
    if (!q) return

    setLoading(true)
    setError('')
    setPreview(null)

    try {
      const res = await fetch(`/api/images?action=search&q=${encodeURIComponent(q)}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Failed to search images.')
        setImages([])
      } else {
        setImages(json.images || [])
        if ((json.images || []).length === 0) {
          setError('No images found. Try another keyword.')
        }
      }
    } catch {
      setError('Network error while searching images.')
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = (item: ImageItem) => {
    setDownloadingId(item.id)
    const dlUrl = `/api/images?action=download&url=${encodeURIComponent(
      item.url
    )}&name=${encodeURIComponent(item.title || 'heshan-ofc-hd')}`

    const a = document.createElement('a')
    a.href = dlUrl
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setTimeout(() => setDownloadingId(null), 1200)
  }

  return (
    <main className="im-root">
      <style>{css}</style>

      <div className="im-wrap">
        <header className="im-hero">
          <div className="im-pill">
            <span className="im-dot" />
            <span>4K WALLPAPERS &amp; HD PHOTOS</span>
          </div>
          <h1 className="im-title">
            Image <span>Search</span>
          </h1>
          <p className="im-sub">
            Search millions of HD photos, wallpapers &amp; aesthetic art and save directly.
          </p>
        </header>

        <form onSubmit={(e) => handleSearch(e)} className="im-search">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search HD images (e.g. Cat, Cyberpunk, 4K Car)..."
          />
          {query && (
            <button
              type="button"
              className="im-clear"
              onClick={() => setQuery('')}
              aria-label="Clear"
            >
              ✕
            </button>
          )}
          <button type="submit" disabled={loading || !query.trim()} className="im-go">
            {loading ? '...' : 'Search'}
          </button>
        </form>

        <div className="im-chips">
          {TRENDING_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className="im-chip"
              onClick={() => {
                setQuery(tag)
                handleSearch(undefined, tag)
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {error && <div className="im-err">{error}</div>}

        {loading && (
          <div className="im-grid">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="im-skel" />
            ))}
          </div>
        )}

        {!loading && images.length > 0 && (
          <section className="im-grid">
            {images.map((item) => (
              <div key={item.id} className="im-card">
                <button
                  type="button"
                  className="im-img-btn"
                  onClick={() => setPreview(item)}
                >
                  <img
                    src={item.thumb || item.url}
                    alt={item.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <span className="im-hd-tag">HD</span>
                </button>

                <div className="im-card-foot">
                  <span className="im-name">{item.title}</span>
                  <button
                    type="button"
                    className="im-dl-icon"
                    onClick={() => downloadImage(item)}
                    title="Download HD"
                  >
                    {downloadingId === item.id ? (
                      '✓'
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 3v12" />
                        <path d="m7 10 5 5 5-5" />
                        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* Full-Screen HD Image Preview Modal */}
      {preview && (
        <div className="im-modal" onClick={() => setPreview(null)}>
          <div className="im-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="im-modal-top">
              <span>{preview.title}</span>
              <button type="button" onClick={() => setPreview(null)}>
                ✕
              </button>
            </div>
            <img
              src={preview.url}
              alt={preview.title}
              referrerPolicy="no-referrer"
              className="im-modal-img"
            />
            <button
              type="button"
              className="im-modal-dl"
              onClick={() => downloadImage(preview)}
            >
              {downloadingId === preview.id ? 'Saving Image...' : 'Download HD Image ↓'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

const css = `
.im-root{min-height:100vh;padding:14px 14px 90px;color:#f8fafc;
  background:radial-gradient(circle at 50% 0%,rgba(239,68,68,.15),transparent 45%),#05070d;
  font-family:Inter,system-ui,-apple-system,sans-serif}
.im-wrap{max-width:640px;margin:0 auto}

.im-hero{text-align:center;margin-bottom:16px}
.im-pill{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:999px;
  background:rgba(168,85,247,.14);border:1px solid rgba(168,85,247,.35);
  font-size:10.5px;font-weight:800;letter-spacing:.06em;color:#d8b4fe}
.im-dot{width:7px;height:7px;border-radius:50%;background:#a855f7;box-shadow:0 0 8px #a855f7}
.im-title{margin:8px 0 4px;font-size:26px;font-weight:900;letter-spacing:-.02em}
.im-title span{color:#ef4444}
.im-sub{margin:0;font-size:12.5px;color:#94a3b8}

.im-search{display:flex;align-items:center;gap:8px;padding:6px;border-radius:16px;
  background:rgba(13,18,32,.95);border:1px solid rgba(255,255,255,.1)}
.im-search input{flex:1;min-width:0;height:42px;padding:0 12px;border:0;background:transparent;
  color:#fff;font-size:14px;outline:none}
.im-clear{width:28px;height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.08);
  color:#cbd5e1;font-size:12px;cursor:pointer}
.im-go{height:42px;padding:0 18px;border:0;border-radius:12px;
  background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font:700 13px inherit;cursor:pointer}
.im-go:disabled{opacity:.5;cursor:not-allowed}

.im-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin-top:12px}
.im-chip{padding:6px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.09);
  background:rgba(255,255,255,.04);color:#cbd5e1;font:600 11.5px inherit;cursor:pointer}
.im-chip:hover{border-color:rgba(239,68,68,.45);color:#fff}

.im-err{margin-top:12px;padding:10px 14px;border-radius:12px;font-size:12.5px;
  background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.35);color:#fecaca}

.im-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:11px;margin-top:16px}
@media(min-width:520px){.im-grid{grid-template-columns:repeat(3,1fr)}}

.im-skel{height:185px;border-radius:16px;
  background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(239,68,68,.1) 50%,rgba(255,255,255,.04) 75%);
  background-size:200% 100%;animation:imShimmer 1.3s infinite}
@keyframes imShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

.im-card{border-radius:16px;overflow:hidden;background:rgba(15,23,42,.85);
  border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column}
.im-img-btn{position:relative;aspect-ratio:1/1;padding:0;border:0;background:#0f172a;cursor:pointer;overflow:hidden}
.im-img-btn img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .25s ease}
.im-card:hover .im-img-btn img{transform:scale(1.05)}
.im-hd-tag{position:absolute;top:8px;left:8px;padding:2px 6px;border-radius:6px;
  background:rgba(2,6,23,.82);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:9px;font-weight:800}

.im-card-foot{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:8px 10px}
.im-name{font-size:11px;font-weight:600;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.im-dl-icon{width:30px;height:30px;border-radius:9px;border:0;flex-shrink:0;
  background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;display:grid;place-items:center;
  font-size:12px;font-weight:800;cursor:pointer}

.im-modal{position:fixed;inset:0;z-index:9999;background:rgba(2,6,23,.9);backdrop-filter:blur(12px);
  display:grid;place-items:center;padding:16px}
.im-modal-box{width:100%;max-width:440px;background:#0f172a;border:1px solid rgba(255,255,255,.12);
  border-radius:20px;padding:12px;display:flex;flex-direction:column;gap:10px}
.im-modal-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.im-modal-top span{font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.im-modal-top button{width:30px;height:30px;border-radius:50%;border:0;background:rgba(255,255,255,.1);
  color:#fff;cursor:pointer;flex-shrink:0}
.im-modal-img{width:100%;max-height:62vh;object-fit:contain;border-radius:14px;background:#020617}
.im-modal-dl{height:44px;border:0;border-radius:13px;background:linear-gradient(135deg,#ef4444,#dc2626);
  color:#fff;font:700 13.5px inherit;cursor:pointer}
`
