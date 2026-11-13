import { NextResponse } from 'next/server'
import { sealLink } from '@/lib/vault'
import { pickMedia, pickTitle } from '@/lib/extract'
import { PLATFORM_IDS } from '@/config/platforms'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const API_BASE = (process.env.CHAMINDU_API_BASE || 'https://api.chamindu.site/api/v1').trim().replace(/\/$/, '')
const API_KEY = (process.env.CHAMINDU_API_KEY || 'chama_api_9c55e3c6d014abbdf65054f9046a920b').trim()
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

async function getJson(url: string, extraHeaders: Record<string, string> = {}) {
  try {
    const r = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': UA, Accept: 'application/json', 'x-api-key': API_KEY, ...extraHeaders },
      signal: AbortSignal.timeout(15000),
    })
    const text = await r.text()
    let json: any = null
    try { json = JSON.parse(text) } catch {}
    return { status: r.status, json, text }
  } catch {
    return { status: 0, json: null, text: '' }
  }
}

async function resolveRedirect(url: string): Promise<string> {
  try {
    if (!/^https?:\/\//i.test(url)) return url
    const r = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    })
    return r.url || url
  } catch {
    return url
  }
}

function pickThumb(obj: any): string {
  if (!obj || typeof obj !== 'object') return ''
  for (const k of ['cover', 'origin_cover', 'thumbnail', 'thumb', 'image', 'pic', 'artwork', 'hd_image']) {
    if (typeof obj[k] === 'string' && obj[k].startsWith('http')) return obj[k]
  }
  for (const v of Object.values(obj)) {
    const found = pickThumb(v)
    if (found) return found
  }
  return ''
}

function cleanTitle(raw: string, fallback: string) {
  return (raw || fallback).replace(/[\\/:*?"<>|\n\r]/g, ' ').trim().slice(0, 55) || fallback
}

// Multi-platform Fallback Engine (api.chamindu.site fail වුණොත් auto වැඩ කරයි)
async function fallbackFetch(platform: string, input: string, isAudio: boolean, format: string) {
  const enc = encodeURIComponent(input)

  // 1. TIKTOK
  if (platform === 'tiktok') {
    try {
      const tr = await fetch(`https://www.tikwm.com/api/?url=${enc}&hd=1`, { signal: AbortSignal.timeout(10000) })
      const tj = await tr.json()
      const link = isAudio ? tj?.data?.music : (tj?.data?.hdplay || tj?.data?.play)
      if (link) {
        const fullUrl = link.startsWith('http') ? link : `https://www.tikwm.com${link}`
        const rawCover = tj?.data?.cover || tj?.data?.origin_cover || ''
        const thumb = rawCover ? (rawCover.startsWith('http') ? rawCover : `https://www.tikwm.com${rawCover}`) : ''
        return {
          directHref: fullUrl,
          url: fullUrl,
          title: cleanTitle(tj?.data?.title, 'HESHAN_OFC_TikTok'),
          ext: isAudio ? 'mp3' : 'mp4',
          thumb,
        }
      }
    } catch {}
  }

  // 2. FACEBOOK (facebook.com/share/r/... & fb.watch ඇතුළුව)
  if (platform === 'facebook') {
    const resolved = await resolveRedirect(input)
    const rEnc = encodeURIComponent(resolved)

    // Backup API 1: dark-yasiya / giftedtech / ryzendesu public endpoints
    const fbEndpoints = [
      `https://api.ryzendesu.vip/api/downloader/fbdl?url=${rEnc}`,
      `https://api.giftedtech.web.id/api/download/facebook?apikey=gifted&url=${rEnc}`,
      `https://bk9.fun/download/fb?url=${rEnc}`,
    ]
    for (const ep of fbEndpoints) {
      const res = await getJson(ep)
      const media = pickMedia(res.json, { audio: isAudio })
      if (media?.url) {
        return {
          url: media.url,
          title: cleanTitle(pickTitle(res.json), 'HESHAN_OFC_Facebook'),
          ext: isAudio ? 'mp3' : 'mp4',
          thumb: pickThumb(res.json),
        }
      }
    }

    // Backup Method 2: Direct HTML HD/SD Video Extractor
    try {
      const htmlRes = await fetch(resolved, {
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(12000),
      })
      const html = await htmlRes.text()
      const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/) || html.match(/"playable_url_quality_hd":"([^"]+)"/)
      const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/) || html.match(/"playable_url":"([^"]+)"/)
      const rawUrl = (hdMatch?.[1] || sdMatch?.[1] || '').replace(/\\u0025/g, '%').replace(/\\\//g, '/')
      if (rawUrl.startsWith('http')) {
        const ogImg = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&') || ''
        const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] || 'HESHAN_OFC_Facebook'
        return { url: rawUrl, title: cleanTitle(ogTitle, 'HESHAN_OFC_Facebook'), ext: 'mp4', thumb: ogImg }
      }
    } catch {}
  }

  // 3. YOUTUBE (MP4 1080p/720p & MP3 320kbps)
  if (platform === 'youtube') {
    const q = (format || '1080p').replace('p', '')
    const ytEndpoints = isAudio
      ? [
          `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${enc}`,
          `https://api.giftedtech.web.id/api/download/ytmp3?apikey=gifted&url=${enc}`,
          `https://bk9.fun/download/ytmp3?url=${enc}`,
        ]
      : [
          `https://api.ryzendesu.vip/api/downloader/ytmp4?url=${enc}&quality=${q}`,
          `https://api.giftedtech.web.id/api/download/ytmp4?apikey=gifted&url=${enc}`,
          `https://bk9.fun/download/ytmp4?url=${enc}`,
        ]
    for (const ep of ytEndpoints) {
      const res = await getJson(ep)
      const media = pickMedia(res.json, { audio: isAudio })
      if (media?.url) {
        return {
          url: media.url,
          title: cleanTitle(pickTitle(res.json), 'HESHAN_OFC_YouTube'),
          ext: isAudio ? 'mp3' : 'mp4',
          thumb: pickThumb(res.json),
        }
      }
    }
  }

  // 4. INSTAGRAM
  if (platform === 'instagram') {
    const igEndpoints = [
      `https://api.ryzendesu.vip/api/downloader/igdl?url=${enc}`,
      `https://api.giftedtech.web.id/api/download/instadl?apikey=gifted&url=${enc}`,
      `https://bk9.fun/download/instagram?url=${enc}`,
    ]
    for (const ep of igEndpoints) {
      const res = await getJson(ep)
      const media = pickMedia(res.json, { audio: isAudio })
      if (media?.url) {
        return {
          url: media.url,
          title: cleanTitle(pickTitle(res.json), 'HESHAN_OFC_Instagram'),
          ext: media.ext || 'mp4',
          thumb: pickThumb(res.json),
        }
      }
    }
  }

  // 5. SPOTIFY
  if (platform === 'spotify') {
    const spEndpoints = [
      `https://api.ryzendesu.vip/api/downloader/spotify?url=${enc}`,
      `https://api.giftedtech.web.id/api/download/spotifydl?apikey=gifted&url=${enc}`,
      `https://bk9.fun/download/spotify?url=${enc}`,
    ]
    for (const ep of spEndpoints) {
      const res = await getJson(ep)
      const media = pickMedia(res.json, { audio: true })
      if (media?.url) {
        return {
          url: media.url,
          title: cleanTitle(pickTitle(res.json), 'HESHAN_OFC_Spotify'),
          ext: 'mp3',
          thumb: pickThumb(res.json),
        }
      }
    }
  }

  // 6. PINTEREST
  if (platform === 'pinterest') {
    const resolved = await resolveRedirect(input)
    const rEnc = encodeURIComponent(resolved)
    const pinEndpoints = [
      `https://api.ryzendesu.vip/api/downloader/pinterest?url=${rEnc}`,
      `https://api.giftedtech.web.id/api/download/pinterestdl?apikey=gifted&url=${rEnc}`,
      `https://bk9.fun/download/pinterest?url=${rEnc}`,
    ]
    for (const ep of pinEndpoints) {
      const res = await getJson(ep)
      const media = pickMedia(res.json, {})
      if (media?.url) {
        return {
          url: media.url,
          title: cleanTitle(pickTitle(res.json), 'HESHAN_OFC_Pinterest'),
          ext: media.ext || (media.url.includes('.mp4') ? 'mp4' : 'jpg'),
          thumb: pickThumb(res.json) || media.url,
        }
      }
    }
  }

  // 7. X (TWITTER)
  if (platform === 'x') {
    const xEndpoints = [
      `https://api.ryzendesu.vip/api/downloader/twitter?url=${enc}`,
      `https://api.giftedtech.web.id/api/download/twitter?apikey=gifted&url=${enc}`,
      `https://bk9.fun/download/twitter?url=${enc}`,
    ]
    for (const ep of xEndpoints) {
      const res = await getJson(ep)
      const media = pickMedia(res.json, { audio: isAudio })
      if (media?.url) {
        return {
          url: media.url,
          title: cleanTitle(pickTitle(res.json), 'HESHAN_OFC_X'),
          ext: media.ext || 'mp4',
          thumb: pickThumb(res.json),
        }
      }
    }
  }

  // 8. WHATSAPP DP
  if (platform === 'whatsapp') {
    let num = input.replace(/\D/g, '')
    if (num.startsWith('0') && num.length === 10) num = '94' + num.slice(1)
    const waEndpoints = [
      `https://api.giftedtech.web.id/api/tools/wadp?apikey=gifted&number=${num}`,
      `https://bk9.fun/tools/wadp?q=${num}`,
    ]
    for (const ep of waEndpoints) {
      const res = await getJson(ep)
      const media = pickMedia(res.json, { image: true })
      if (media?.url) {
        return {
          url: media.url,
          title: `WA_DP_${num}`,
          ext: 'jpg',
          thumb: media.url,
        }
      }
    }
  }

  return null
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
      case 'whatsapp': {
        let num = input.replace(/\D/g, '')
        if (num.startsWith('0') && num.length === 10) num = '94' + num.slice(1)
        target = `${API_BASE}/media/whatsapp_dp/infodl?q=${num}${k}`
        image = true; defExt = 'jpg'
        break
      }
    }

    const isAudio = platform === 'spotify' || audio
    let r = await getJson(target)
    let media = pickMedia(r.json, { audio: isAudio, image })

    if (!media && platform === 'youtube' && !audio) {
      const q = (format || '1080p').replace('p', '')
      r = await getJson(`${API_BASE}/youtube/savetube/mp4?url=${enc}&quality=${q}${k}`)
      media = pickMedia(r.json, {})
    }

    // Primary API එකෙන් හම්බුණේ නැත්නම් Multi-Fallback Engine එක run වේ
    if (!media) {
      const fb = await fallbackFetch(platform, input, isAudio, format)
      if (fb) {
        if (fb.directHref) {
          return NextResponse.json({
            token: '',
            directHref: fb.directHref,
            title: fb.title,
            ext: fb.ext,
            platform,
            thumb: fb.thumb,
          })
        }
        const token = sealLink(fb.url, `${fb.title}.${fb.ext}`)
        return NextResponse.json({
          token,
          title: fb.title,
          ext: fb.ext,
          platform,
          thumb: fb.thumb,
        })
      }

      if (platform === 'tiktok') {
        return NextResponse.json({ clientFallback: 'tiktok', url: input, isAudio })
      }

      return NextResponse.json({
        error: platform === 'whatsapp'
          ? 'Profile picture not found or privacy is set to private.'
          : 'Unable to fetch media. Please check if the link is public.',
      }, { status: 404 })
    }

    const ext = media.ext || defExt
    const title = cleanTitle(pickTitle(r.json), `HESHAN_OFC_${platform}`)
    const thumb = pickThumb(r.json) || (image ? media.url : '')
    const token = sealLink(media.url, `${title}.${ext}`)
    return NextResponse.json({ token, title, ext, platform, thumb })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
