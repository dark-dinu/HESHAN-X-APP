import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SITE = 'https://sinhalasub.lk'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://sinhalasub.lk/',
}

function stripTags(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatSlugTitle(url: string) {
  const slug = url.split('/').filter(Boolean).pop() || 'Untitled'
  return slug
    .replace(/-sinhala-subtitles?$/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function cleanTitleForSearch(title: string) {
  return title
    .replace(/\(?\d{4}\)?/g, '')
    .replace(/sinhala subtitles?/gi, '')
    .replace(/[-:|–].*$/, '')
    .trim()
}

// Fast public IMDb/Amazon HD Poster lookup (never blocked, zero API key needed)
async function fetchPublicPoster(rawTitle: string): Promise<string> {
  try {
    const clean = cleanTitleForSearch(rawTitle)
    if (!clean) return ''
    const firstChar = clean[0].toLowerCase().replace(/[^a-z0-9]/g, 'a') || 'a'
    const slug = encodeURIComponent(clean.toLowerCase())
    const res = await fetch(`https://v3.sg.media-imdb.com/suggestion/${firstChar}/${slug}.json`, {
      cache: 'force-cache',
    })
    if (!res.ok) return ''
    const data = await res.json()
    const hit = Array.isArray(data?.d) ? data.d.find((x: any) => x?.i?.imageUrl) : null
    if (!hit?.i?.imageUrl) return ''
    // Resize Amazon/IMDb poster to crisp 500px width
    return String(hit.i.imageUrl).replace(/\._V1_.*\.jpg$/i, '._V1_UX500_.jpg')
  } catch {
    return ''
  }
}

function normalizeImageUrl(raw?: string) {
  if (!raw) return ''
  let clean = raw.trim().split(/\s+/)[0].replace(/&amp;/g, '&')
  if (!clean || clean.startsWith('data:')) return ''
  if (clean.startsWith('//')) clean = `https:${clean}`
  else if (clean.startsWith('/')) clean = `${SITE}${clean}`
  return clean
}

function extractImageFromHtml(fragment: string) {
  // Prefer direct TMDB image URLs if present anywhere in HTML
  const tmdbMatch = fragment.match(/https?:\/\/image\.tmdb\.org\/t\/p\/[^"'\s)]+\.(?:jpg|jpeg|png|webp)/i)
  if (tmdbMatch?.[0]) return tmdbMatch[0]

  const metaMatch =
    fragment.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    fragment.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  if (metaMatch?.[1]) {
    const u = normalizeImageUrl(metaMatch[1])
    if (u && !u.includes('sinhalasub.lk')) return u
  }

  return ''
}

async function fetchHtml(url: string) {
  const target = url.startsWith('http') ? url : `${SITE}${url.startsWith('/') ? '' : '/'}${url}`
  const res = await fetch(target, { headers: HEADERS, cache: 'no-store' })
  if (!res.ok) throw new Error(`SinhalaSub returned HTTP ${res.status}`)
  return await res.text()
}

async function parseSearchResults(html: string, type: 'movie' | 'tv') {
  const results: {
    title: string
    url: string
    image: string
    year: string
    rating: string
  }[] = []
  const seen = new Set<string>()

  const blocks =
    html.match(/<(article|div)[^>]*class="[^"]*(?:result-item|item)[^"]*"[\s\S]*?<\/\1>/gi) || []

  for (const block of blocks) {
    const hrefMatch = block.match(/href="(https?:\/\/sinhalasub\.lk\/(?:movies|tvshows)\/[^"]+)"/i)
    if (!hrefMatch) continue

    const url = hrefMatch[1]
    if (type === 'movie' && !url.includes('/movies/')) continue
    if (type === 'tv' && !url.includes('/tvshows/')) continue
    if (seen.has(url)) continue
    seen.add(url)

    const image = extractImageFromHtml(block)
    const titleMatch =
      block.match(/<div class="title"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) ||
      block.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i) ||
      block.match(/alt="([^"]+)"/i)
    const yearMatch =
      block.match(/class="year"[^>]*>([^<]+)</i) || block.match(/\b(19\d{2}|20\d{2})\b/)
    const rateMatch = block.match(/class="rating"[^>]*>([^<]+)</i)

    const rawTitle = stripTags(titleMatch?.[1] || '')
    results.push({
      title: rawTitle && rawTitle.length > 1 ? rawTitle : formatSlugTitle(url),
      url,
      image,
      year: stripTags(yearMatch?.[1] || (url.match(/\b(19\d{2}|20\d{2})\b/) || [])[1] || ''),
      rating: stripTags(rateMatch?.[1] || ''),
    })
  }

  if (results.length === 0) {
    const pattern =
      type === 'movie'
        ? /<a[^>]+href="(https?:\/\/sinhalasub\.lk\/movies\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
        : /<a[^>]+href="(https?:\/\/sinhalasub\.lk\/tvshows\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi

    let m: RegExpExecArray | null
    while ((m = pattern.exec(html)) !== null) {
      const url = m[1]
      if (seen.has(url)) continue
      const inner = m[2]
      const image = extractImageFromHtml(inner)
      const text = stripTags(inner)
      seen.add(url)
      results.push({
        title: text && text.length > 2 ? text : formatSlugTitle(url),
        url,
        image,
        year: (url.match(/\b(19\d{2}|20\d{2})\b/) || [])[1] || '',
        rating: '',
      })
    }
  }

  // Resolve crisp HD posters in parallel for every result
  const top = results.slice(0, 12)
  await Promise.all(
    top.map(async (item) => {
      if (!item.image) {
        item.image = await fetchPublicPoster(item.title)
      }
    })
  )

  return top
}

function parseDownloadLinks(html: string) {
  const downloads: { quality: string; size: string; url: string; server: string }[] = []
  const seen = new Set<string>()

  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
  for (const row of rows) {
    const linkMatch = row.match(/href="(https?:\/\/[^"]+)"/i)
    if (!linkMatch) continue
    const url = linkMatch[1]
    if (url.includes('sinhalasub.lk/movies/') || url.includes('sinhalasub.lk/tvshows/')) continue
    if (seen.has(url)) continue

    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripTags(c[1]))
    const fullRowText = stripTags(row)
    const qualityMatch = fullRowText.match(/(2160p|4K|1080p|720p|480p|360p|WEB-DL|BluRay|HDRip)/i)
    const sizeMatch = fullRowText.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i)

    if (qualityMatch || sizeMatch || url.includes('/links/')) {
      seen.add(url)
      downloads.push({
        quality: qualityMatch?.[1] || cells[1] || 'HD Download',
        size: sizeMatch?.[1] || cells[2] || '',
        url,
        server: cells[0] && !cells[0].includes('Download') ? cells[0] : 'SinhalaSub',
      })
    }
  }

  if (downloads.length === 0) {
    const linkMatches = html.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)
    for (const m of linkMatches) {
      const url = m[1]
      const label = stripTags(m[2])
      if (seen.has(url)) continue
      if (
        url.includes('/links/') ||
        /(1080p|720p|480p|download|direct|drive|mega|pixeldrain)/i.test(label)
      ) {
        seen.add(url)
        downloads.push({
          quality: label || 'Download Link',
          size: '',
          url,
          server: 'Direct',
        })
      }
    }
  }

  return downloads
}

async function parseMetaAndSeasons(html: string, pageUrl: string) {
  const titleMatch =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/property="og:title"[^>]+content="([^"]+)"/i)
  const title = stripTags(titleMatch?.[1] || '') || formatSlugTitle(pageUrl)

  let image = extractImageFromHtml(html)
  if (!image) {
    image = await fetchPublicPoster(title)
  }

  const descMatch =
    html.match(/property="og:description"[^>]+content="([^"]+)"/i) ||
    html.match(/<div class="wp-content"[^>]*>([\s\S]*?)<\/div>/i)
  const rateMatch = html.match(/class="dt_rating_vgs"[^>]*>([^<]+)</i)
  const yearMatch = html.match(/class="date"[^>]*>([^<]+)</i)

  const episodes: { title: string; epNumber: string; url: string }[] = []
  const seen = new Set<string>()
  const epMatches = html.matchAll(
    /<a[^>]+href="(https?:\/\/sinhalasub\.lk\/episodes\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  )

  let idx = 1
  for (const m of epMatches) {
    const url = m[1]
    if (seen.has(url)) continue
    seen.add(url)
    const rawTitle = stripTags(m[2])
    episodes.push({
      title: rawTitle && rawTitle.length > 2 ? rawTitle : formatSlugTitle(url),
      epNumber: String(idx++),
      url,
    })
  }

  return {
    title,
    image,
    description: stripTags(descMatch?.[1] || '').slice(0, 320),
    rating: stripTags(rateMatch?.[1] || ''),
    year: stripTags(yearMatch?.[1] || ''),
    episodes,
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'search'
    const q = (searchParams.get('q') || '').trim()

    if (!q) {
      return NextResponse.json({ error: 'Search query or URL required.' }, { status: 400 })
    }

    if (action === 'search') {
      const html = await fetchHtml(`${SITE}/?s=${encodeURIComponent(q)}`)
      const results = await parseSearchResults(html, 'movie')
      return NextResponse.json({ ok: true, data: { results } })
    }

    if (action === 'tv-search') {
      const html = await fetchHtml(`${SITE}/?s=${encodeURIComponent(q)}`)
      const results = await parseSearchResults(html, 'tv')
      return NextResponse.json({ ok: true, data: { results } })
    }

    if (action === 'infodl') {
      const html = await fetchHtml(q)
      const meta = await parseMetaAndSeasons(html, q)
      const downloads = parseDownloadLinks(html)
      return NextResponse.json({
        ok: true,
        data: {
          ...meta,
          downloads,
        },
      })
    }

    if (action === 'tv-info') {
      const html = await fetchHtml(q)
      const meta = await parseMetaAndSeasons(html, q)
      return NextResponse.json({
        ok: true,
        data: meta,
      })
    }

    if (action === 'tv-dl') {
      const html = await fetchHtml(q)
      const downloads = parseDownloadLinks(html)
      return NextResponse.json({
        ok: true,
        data: { downloads },
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to load SinhalaSub content.' },
      { status: 500 }
    )
  }
}
