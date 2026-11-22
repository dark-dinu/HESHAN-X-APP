import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CHAMINDU_URL = 'https://api.chamindu.site/api/v1/search/image'
const API_KEY =
  process.env.CHAMINDU_API_KEY || 'chama_api_9c55e3c6d014abbdf65054f9046a920b'

const UA =
  'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'

type ImageResult = {
  id: string
  title: string
  url: string
  thumb: string
  width?: number
  height?: number
  source?: string
}

async function searchViaChamindu(q: string): Promise<ImageResult[]> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(
      `${CHAMINDU_URL}?q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(API_KEY)}`,
      {
        headers: { Accept: 'application/json', 'User-Agent': UA },
        signal: controller.signal,
        cache: 'no-store',
      }
    )
    clearTimeout(timer)
    if (!res.ok) return []
    const json = await res.json().catch(() => null)
    if (!json || json.status === false) return []

    const list =
      (Array.isArray(json.result) && json.result) ||
      (Array.isArray(json.results) && json.results) ||
      (Array.isArray(json.data) && json.data) ||
      []

    return list
      .map((item: any, idx: number) => {
        const url = String(
          typeof item === 'string'
            ? item
            : item?.url || item?.image || item?.img || item?.original || ''
        )
        return {
          id: `chama-${idx}`,
          title: String(item?.title || `${q} HD Image #${idx + 1}`),
          url,
          thumb: String(item?.thumb || item?.thumbnail || url),
          source: 'Chamindu API',
        }
      })
      .filter((x: ImageResult) => x.url.startsWith('http'))
  } catch {
    return []
  }
}

async function searchViaFallbackWeb(q: string): Promise<ImageResult[]> {
  const res = await fetch(
    `https://www.bing.com/images/async?q=${encodeURIComponent(q)}&first=1&count=28&adlt=moderate`,
    {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    }
  )

  if (!res.ok) return []
  const html = await res.text()

  const results: ImageResult[] = []
  const seen = new Set<string>()
  const matches = html.matchAll(/m="([^"]+)"/g)

  let idx = 0
  for (const m of matches) {
    try {
      const decoded = m[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
      const meta = JSON.parse(decoded)
      const fullUrl = String(meta?.murl || '')
      const thumbUrl = String(meta?.turl || fullUrl)
      if (!fullUrl.startsWith('http') || seen.has(fullUrl)) continue
      seen.add(fullUrl)

      results.push({
        id: `hd-${idx++}`,
        title: String(meta?.t || `${q} Wallpaper`).replace(/\s+/g, ' ').trim(),
        url: fullUrl,
        thumb: thumbUrl,
        source: 'HD Web',
      })
      if (results.length >= 24) break
    } catch {}
  }

  return results
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'search'

    // Direct Image Download Proxy (forces instant file save on mobile)
    if (action === 'download') {
      const imgUrl = (searchParams.get('url') || '').trim()
      const filename = (searchParams.get('name') || 'heshan-ofc-image')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40)

      if (!imgUrl.startsWith('http')) {
        return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
      }

      const imgRes = await fetch(imgUrl, {
        headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8' },
      })

      if (!imgRes.ok) {
        return NextResponse.redirect(imgUrl)
      }

      const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
      const ext = contentType.includes('png')
        ? 'png'
        : contentType.includes('webp')
        ? 'webp'
        : 'jpg'

      const buffer = await imgRes.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}.${ext}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const q = (searchParams.get('q') || '').trim()
    if (!q) {
      return NextResponse.json({ error: 'Search query required.' }, { status: 400 })
    }

    // Try Chamindu API first, seamlessly fall back to HD Web Image Engine
    let images = await searchViaChamindu(q)
    if (images.length === 0) {
      images = await searchViaFallbackWeb(q)
    }

    return NextResponse.json({ ok: true, images })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Image search failed.' },
      { status: 500 }
    )
  }
}
