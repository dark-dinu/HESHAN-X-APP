import { NextResponse } from 'next/server'
import { sealLink } from '@/lib/vault'
import { pickMedia, pickTitle } from '@/lib/extract'
import { PLATFORM_IDS } from '@/config/platforms'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const API_BASE = (process.env.CHAMINDU_API_BASE || 'https://api.chamindu.site/api/v1').trim().replace(/\/$/, '')
const API_KEY = (process.env.CHAMINDU_API_KEY || 'chama_api_9c55e3c6d014abbdf65054f9046a920b').trim()
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

async function getJson(url: string) {
  try {
    const r = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
        'x-api-key': API_KEY,
      },
      signal: AbortSignal.timeout(20000),
    })
    const text = await r.text()
    let json: any = null
    try { json = JSON.parse(text) } catch {}
    return { status: r.status, json, text }
  } catch (e: any) {
    return { status: 0, json: null, text: e?.message || 'fetch error' }
  }
}

async function normalizeFacebookUrl(rawUrl: string): Promise<{ resolved: string; note: string }> {
  let clean = rawUrl.trim()
  let note = 'direct'

  if (/facebook\.com\/share\/|fb\.watch/i.test(clean)) {
    // Method 1: Chrome User-Agent redirect follow
    try {
      const res = await fetch(clean, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (res.url && !res.url.includes('/login') && !res.url.includes('/share/')) {
        clean = res.url
        note = 'redirect-ok'
      } else {
        const html = await res.text()
        const match =
          html.match(/<meta property="og:url" content="([^"]+)"/i)?.[1] ||
          html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] ||
          html.match(/https?:\/\/(?:www|web|m)\.facebook\.com\/(?:reel|watch|videos)\/[0-9]+/i)?.[0] ||
          html.match(/https?:\\\/\\\/(?:www|web|m)\.facebook\.com\\\/(?:reel|watch|videos)\\\/[0-9]+/i)?.[0]
        if (match) {
          clean = match.replace(/\\\//g, '/').replace(/&amp;/g, '&')
          note = 'html-match'
        } else {
          note = `unresolved(${res.url.slice(0, 40)})`
        }
      }
    } catch (e: any) {
      note = `err(${e?.message || 'fail'})`
    }
  }

  clean = clean.split('?')[0].replace(/^https?:\/\/(www\.|m\.|mbasic\.)?facebook\.com/i, 'https://web.facebook.com')
  return { resolved: clean, note }
}

function deepFindMediaUrl(obj: any, preferAudio = false, preferImage = false): string {
  const urls: string[] = []
  const scan = (val: any) => {
    if (!val) return
    if (typeof val === 'string') {
      const clean = val.replace(/\\\//g, '/').trim()
      if (/^https?:\/\//i.test(clean)) urls.push(clean)
      return
    }
    if (Array.isArray(val)) {
      val.forEach(scan)
      return
    }
    if (typeof val === 'object') {
      for (const key of ['hd', 'hd_url', 'hdplay', 'video_hd', 'mp4', 'download_url', 'downloadUrl', 'dl_url', 'play', 'sd', 'sd_url', 'url', 'link', 'media', 'result', 'data']) {
        if (val[key] !== undefined) scan(val[key])
      }
      for (const [k, v] of Object.entries(val)) {
        if (!['thumbnail', 'thumb', 'cover', 'origin_cover', 'avatar', 'icon', 'pic', 'artwork', 'author'].includes(k.toLowerCase())) {
          scan(v)
        }
      }
    }
  }
  scan(obj)

  const filtered = urls.filter(
    (u) =>
      !u.includes('youtube.com/watch') &&
      !u.includes('youtu.be/') &&
      !u.includes('facebook.com/share') &&
      !u.includes('facebook.com/reel') &&
      !u.includes('instagram.com/p/') &&
      !u.includes('instagram.com/reel/') &&
      !u.includes('tiktok.com/@') &&
      !u.includes('pinterest.com/pin') &&
      !u.includes('x.com/') &&
      !u.includes('twitter.com/')
  )

  if (preferImage) {
    return filtered.find((u) => /\.(jpg|jpeg|png|webp)/i.test(u) || u.includes('pps.whatsapp.net') || u.includes('pinimg.com')) || filtered[0] || ''
  }
  if (preferAudio) {
    return filtered.find((u) => /\.(mp3|m4a|aac|ogg|opus)/i.test(u) || u.includes('mime=audio')) || filtered[0] || ''
  }
  return (
    filtered.find((u) => /\.(mp4|webm|mov)/i.test(u) || u.includes('fbcdn.net') || u.includes('googlevideo.com') || u.includes('cdninstagram.com') || u.includes('twimg.com')) ||
    filtered[0] ||
    ''
  )
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const platform = String(body.platform || '')
    const format = String(body.format || '')
    const rawInput = String(body.url || '').trim()
    let input = rawInput

    if (!input) return NextResponse.json({ error: 'Please enter a valid link or number' }, { status: 400 })
    if (!PLATFORM_IDS.includes(platform)) return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })

    let fbNote = ''
    if (platform === 'facebook') {
      const fb = await normalizeFacebookUrl(input)
      input = fb.resolved
      fbNote = ` [${fb.note} -> ${input}]`
    }

    const enc = encodeURIComponent(input)
    const rawEnc = encodeURIComponent(rawInput)
    const k = `&api_key=${API_KEY}`
    const audio = format === 'mp3' || format === '320kbps'
    const isAudio = platform === 'spotify' || audio
    let image = false
    let defExt = isAudio ? 'mp3' : 'mp4'

    const endpoints: string[] = []

    switch (platform) {
      case 'youtube':
        if (audio) {
          endpoints.push(
            `${API_BASE}/youtube/mp3?url=${enc}&quality=320kbps${k}`,
            `${API_BASE}/youtube/ytmp3?url=${enc}${k}`
          )
        } else {
          const q = (format || '1080p').replace('p', '')
          if (input.includes('/shorts/')) {
            endpoints.push(`${API_BASE}/media/ytshorts/download?url=${enc}&quality=1080${k}`)
          }
          endpoints.push(
            `${API_BASE}/youtube/mp4?url=${enc}&quality=${format || '1080p'}${k}`,
            `${API_BASE}/youtube/savetube/mp4?url=${enc}&quality=${q}${k}`
          )
        }
        break
      case 'tiktok':
        endpoints.push(`${API_BASE}/tiktok?url=${enc}${k}`)
        break
      case 'instagram':
        endpoints.push(`${API_BASE}/media/instagram?url=${enc}${k}`)
        break
      case 'facebook':
        endpoints.push(`${API_BASE}/facebook/c2?url=${enc}${k}`)
        if (rawEnc !== enc) endpoints.push(`${API_BASE}/facebook/c2?url=${rawEnc}${k}`)
        break
      case 'spotify':
        defExt = 'mp3'
        endpoints.push(`${API_BASE}/spotify/download?q=${enc}&quality=320kbps${k}`)
        break
      case 'pinterest':
        endpoints.push(`${API_BASE}/media/pinterest/infodl?q=${enc}${k}`)
        break
      case 'x':
        endpoints.push(`${API_BASE}/media/twitter?url=${enc}${k}`)
        break
      case 'whatsapp': {
        let num = input.replace(/\D/g, '')
        if (num.startsWith('0') && num.length === 10) num = '94' + num.slice(1)
        image = true
        defExt = 'jpg'
        endpoints.push(`${API_BASE}/media/whatsapp_dp/infodl?q=${num}${k}`)
        break
      }
    }

    let lastJson: any = null
    let lastDebug = ''
    let mediaUrl = ''
    let mediaExt = defExt

    for (const target of endpoints) {
      const r = await getJson(target)
      lastDebug = `HTTP ${r.status}: ${(r.text || '').slice(0, 120)}`
      if (!r.json) continue
      lastJson = r.json

      const picked = pickMedia(r.json, { audio: isAudio, image })
      if (picked?.url) {
        mediaUrl = picked.url
        if (picked.ext) mediaExt = picked.ext
        break
      }

      const deepUrl = deepFindMediaUrl(r.json, isAudio, image)
      if (deepUrl) {
        mediaUrl = deepUrl
        break
      }
    }

    if (!mediaUrl && platform === 'tiktok') {
      try {
        const tr = await fetch(`https://www.tikwm.com/api/?url=${enc}&hd=1`, { signal: AbortSignal.timeout(10000) })
        const tj = await tr.json()
        const link = isAudio ? tj?.data?.music : (tj?.data?.hdplay || tj?.data?.play)
        if (link) {
          const fullUrl = link.startsWith('http') ? link : `https://www.tikwm.com${link}`
          const rawCover = tj?.data?.cover || tj?.data?.origin_cover || ''
          const thumb = rawCover ? (rawCover.startsWith('http') ? rawCover : `https://www.tikwm.com${rawCover}`) : ''
          const tTitle = cleanTitle(tj?.data?.title, 'HESHAN_OFC_TikTok')
          return NextResponse.json({ token: '', directHref: fullUrl, title: tTitle, ext: defExt, platform, thumb })
        }
      } catch {}
      return NextResponse.json({ clientFallback: 'tiktok', url: input, isAudio })
    }

    if (!mediaUrl) {
      return NextResponse.json({
        error: `Unable to fetch media (${lastDebug})${fbNote}`,
      }, { status: 404 })
    }

    const title = cleanTitle(pickTitle(lastJson), `HESHAN_OFC_${platform}`)
    const thumb = pickThumb(lastJson) || (image ? mediaUrl : '')
    const token = sealLink(mediaUrl, `${title}.${mediaExt}`)
    return NextResponse.json({ token, title, ext: mediaExt, platform, thumb })
  } catch (e: any) {
    return NextResponse.json({ error: `Server error: ${e?.message || 'unknown'}` }, { status: 500 })
  }
}
