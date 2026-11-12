import { NextResponse } from 'next/server'
import { sealLink } from '@/lib/vault'
import { pickMedia, pickTitle } from '@/lib/extract'
import { PLATFORM_IDS } from '@/config/platforms'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const API_BASE = (process.env.CHAMINDU_API_BASE || 'https://api.chamindu.site/api/v1').trim().replace(/\/$/, '')
const API_KEY = (process.env.CHAMINDU_API_KEY || 'chama_api_9c55e3c6d014abbdf65054f9046a920b').trim()
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'

async function getJson(url: string) {
  try {
    const r = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': UA, Accept: 'application/json', 'x-api-key': API_KEY },
      signal: AbortSignal.timeout(20000),
    })
    const text = await r.text()
    let json: any = null
    try { json = JSON.parse(text) } catch {}
    return { status: r.status, json }
  } catch {
    return { status: 0, json: null }
  }
}

function pickThumb(obj: any): string {
  if (!obj || typeof obj !== 'object') return ''
  for (const k of ['cover', 'origin_cover', 'thumbnail', 'thumb', 'image', 'pic', 'artwork']) {
    if (typeof obj[k] === 'string' && obj[k].startsWith('http')) return obj[k]
  }
  for (const v of Object.values(obj)) {
    const found = pickThumb(v)
    if (found) return found
  }
  return ''
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const platform = String(body.platform || '')
    const format = String(body.format || '')
    const input = String(body.url || '').trim()

    if (!input) return NextResponse.json({ error: 'Please enter a valid link or number' }, { status: 400 })
    if (!PLATFORM_IDS.includes(platform)) return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })

    const enc = encodeURIComponent(input)
    const k = `&api_key=${API_KEY}`
    const audio = format === 'mp3' || format === '320kbps'
    let target = ''
    let image = false
    let defExt = audio ? 'mp3' : 'mp4'

    switch (platform) {
      case 'youtube':
        target = audio
          ? `${API_BASE}/youtube/mp3?url=${enc}&quality=320kbps${k}`
          : input.includes('/shorts/')
          ? `${API_BASE}/media/ytshorts/download?url=${enc}&quality=1080${k}`
          : `${API_BASE}/youtube/mp4?url=${enc}&quality=${format || '1080p'}${k}`
        break
      case 'tiktok': target = `${API_BASE}/tiktok?url=${enc}${k}`; break
      case 'instagram': target = `${API_BASE}/media/instagram?url=${enc}${k}`; break
      case 'facebook': target = `${API_BASE}/facebook/c2?url=${enc}${k}`; break
      case 'spotify': target = `${API_BASE}/spotify/download?q=${enc}&quality=320kbps${k}`; defExt = 'mp3'; break
      case 'pinterest': target = `${API_BASE}/media/pinterest/infodl?q=${enc}${k}`; break
      case 'x': target = `${API_BASE}/media/twitter?url=${enc}${k}`; break
      case 'whatsapp':
        target = `${API_BASE}/media/whatsapp_dp/infodl?q=${input.replace(/\D/g, '')}${k}`
        image = true; defExt = 'jpg'
        break
    }

    const isAudio = platform === 'spotify' || audio
    let r = await getJson(target)
    let media = pickMedia(r.json, { audio: isAudio, image })

    if (!media && platform === 'youtube' && !audio) {
      const q = (format || '1080p').replace('p', '')
      r = await getJson(`${API_BASE}/youtube/savetube/mp4?url=${enc}&quality=${q}${k}`)
      media = pickMedia(r.json, {})
    }

    // TikTok සඳහා Direct CDN Link + Cover Image (Proxy stream block නොවී කෙලින්ම phone එකෙන් download වීමට)
    if (!media && platform === 'tiktok') {
      try {
        const tr = await fetch(`https://www.tikwm.com/api/?url=${enc}&hd=1`, { signal: AbortSignal.timeout(10000) })
        const tj = await tr.json()
        const link = isAudio ? tj?.data?.music : (tj?.data?.hdplay || tj?.data?.play)
        if (link) {
          const fullUrl = link.startsWith('http') ? link : `https://www.tikwm.com${link}`
          const rawCover = tj?.data?.cover || tj?.data?.origin_cover || ''
          const thumb = rawCover ? (rawCover.startsWith('http') ? rawCover : `https://www.tikwm.com${rawCover}`) : ''
          const tTitle = String(tj?.data?.title || 'HESHAN_OFC_TikTok').slice(0, 50)
          return NextResponse.json({ token: '', directHref: fullUrl, title: tTitle, ext: defExt, platform, thumb })
        }
      } catch {}
      return NextResponse.json({ clientFallback: 'tiktok', url: input, isAudio })
    }

    if (!media) {
      return NextResponse.json({ error: 'Unable to fetch media. Please check if the link is public.' }, { status: 404 })
    }

    const ext = media.ext || defExt
    const title = (pickTitle(r.json) || `HESHAN_OFC_${platform}`).replace(/[\\/:*?"<>|\n\r]/g, ' ').trim().slice(0, 55)
    const thumb = pickThumb(r.json) || (image ? media.url : '')
    const token = sealLink(media.url, `${title}.${ext}`)
    return NextResponse.json({ token, directHref: media.url, title, ext, platform, thumb })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
