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

// ඕනෑම API JSON එකක් ඇතුළේ තියෙන Video / Audio / Image URL එක deep scan කරලා අල්ලගැනීම
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
      // Priority keys මුලින් check කිරීම
      for (const key of ['hd', 'hdplay', 'hd_url', 'video_hd', 'mp4', 'download_url', 'downloadUrl', 'play', 'sd', 'url', 'link', 'media', 'result', 'data']) {
        if (val[key] !== undefined) scan(val[key])
      }
      for (const [k, v] of Object.entries(val)) {
        if (!['thumbnail', 'thumb', 'cover', 'origin_cover', 'avatar', 'icon', 'pic', 'artwork'].includes(k.toLowerCase())) {
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

async function resolveFacebookUrl(input: string): Promise<string> {
  try {
    // 1. Mobile UA එකෙන් redirect follow කිරීම (login wall bypass වීමට)
    const r = await fetch(input, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (r.url && !r.url.includes('/login')) return r.url
  } catch {}
  return input
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

  // 2. FACEBOOK (facebook.com/share/r/... ඇතුළුව)
  if (platform === 'facebook') {
    const resolved = await resolveFacebookUrl(input)
    const urlsToTry = Array.from(new Set([resolved, input]))

    for (const targetUrl of urlsToTry) {
      const uEnc = encodeURIComponent(targetUrl)

      // Method A: Public FB Downloader APIs + Deep JSON Scanner
      const fbEndpoints = [
        `https://api.ryzendesu.vip/api/downloader/fbdl?url=${uEnc}`,
        `https://api.giftedtech.web.id/api/download/facebook?apikey=gifted&url=${uEnc}`,
        `https://bk9.fun/download/fb?url=${uEnc}`,
        `https://api.siputzx.my.id/api/d/facebook?url=${uEnc}`,
        `https://api.agatz.xyz/api/facebook?url=${uEnc}`,
      ]
      for (const ep of fbEndpoints) {
        const res = await getJson(ep)
        if (!res.json) continue
        const media = pickMedia(res.json, { audio: isAudio })
        const foundUrl = media?.url || deepFindMediaUrl(res.json, isAudio, false)
        if (foundUrl) {
          return {
            url: foundUrl,
            title: cleanTitle(pickTitle(res.json), 'HESHAN_OFC_Facebook'),
            ext: isAudio ? 'mp3' : 'mp4',
            thumb: pickThumb(res.json),
          }
        }
      }

      // Method B: Direct Facebook Embed / Page HTML Extractor
      try {
        const embedUrl = `https://www.facebook.com/plugins/video.php?href=${uEnc}&show_text=0`
        const htmlRes = await fetch(embedUrl, {
          headers: {
            'User-Agent': UA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Sec-Fetch-Dest': 'iframe',
            'Sec-Fetch-Mode': 'navigate',
          },
          signal: AbortSignal.timeout(12000),
        })
        const html = await htmlRes.text()
        const patterns = [
          /"browser_native_hd_url"\s*:\s*"([^"]+)"/,
          /"playable_url_quality_hd"\s*:\s*"([^"]+)"/,
          /"browser_native_sd_url"\s*:\s*"([^"]+)"/,
          /"playable_url"\s*:\s*"([^"]+)"/,
          /"hd_src"\s*:\s*"([^"]+)"/,
          /"sd_src"\s*:\s*"([^"]+)"/,
        ]
        for (const pat of patterns) {
          const m = html.match(pat)
          if (m?.[1]) {
            const rawUrl = m[1].replace(/\\u0025/g, '%').replace(/\\u0026/g, '&').replace(/\\\//g, '/')
            if (rawUrl.startsWith('http')) {
              const ogImg = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&') || ''
              return { url: rawUrl, title: 'HESHAN_OFC_Facebook', ext: 'mp4', thumb: ogImg }
            }
          }
        }
      } catch {}
    }
  }

  // 3. YOUTUBE (MP4 & MP3)
  if (platform === 'youtube') {
    const q = (format || '1080p').replace('p', '')
    const ytEndpoints = isAudio
      ? [
          `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${enc}`,
          `https://api.giftedtech.web.id/api/download/ytmp3?apikey=gifted&url=${enc}`,
          `https://api.siputzx.my.id/api/d/ytmp3?url=${enc}`,
          `https://api.agatz.xyz/api/ytmp3?url=${enc}`,
          `https://bk9.fun/download/ytmp3?url=${enc}`,
        ]
      : [
          `https://api.ryzendesu.vip/api/downloader/ytmp4?url=${enc}&quality=${q}`,
          `https://api.giftedtech.web.id/api/download/ytmp4?apikey=gifted&url=${enc}`,
          `https://api.siputzx.my.id/api/d/ytmp4?url=${enc}`,
          `https://api.agatz.xyz/api/ytmp4?url=${enc}`,
          `https://bk9.fun/download/ytmp4?url=${enc}`,
        ]
    for (const ep of ytEndpoints) {
      const res = await getJson(ep)
      if (!res.json) continue
      const media = pickMedia(res.json, { audio: isAudio })
      const foundUrl = media?.url || deepFindMediaUrl(res.json, isAudio, false)
      if (foundUrl) {
        return {
          url: foundUrl,
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
      `https://api.siputzx.my.id/api/d/igdl?url=${enc}`,
      `https://api.agatz.xyz/api/instagram?url=${enc}`,
      `https://bk9.fun/download/instagram?url=${enc}`,
    ]
    for (const ep of igEndpoints) {
      const res = await getJson(ep)
      if (!res.json) continue
      const media = pickMedia(res.json, { audio: isAudio })
      const foundUrl = media?.url || deepFindMediaUrl(res.json, isAudio, false)
      if (foundUrl) {
        return {
          url: foundUrl,
          title: cleanTitle(pickTitle(res.json), 'HESHAN_OFC_Instagram'),
          ext: media?.ext || (foundUrl.includes('.jpg') ? 'jpg' : 'mp4'),
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
      `https://api.siputzx.my.id/api/d/spotify?url=${enc}`,
      `https://api.agatz.xyz/api/spotifydl?url=${enc}`,
      `https://bk9.fun/download/spotify?url=${enc}`,
    ]
    for (const ep of spEndpoints) {
      const res = await getJson(ep)
      if (!res.json) continue
      const media = pickMedia(res.json, { audio: true })
      const foundUrl = media?.url || deepFindMediaUrl(res.json, true, false)
      if (foundUrl) {
        return {
          url: foundUrl,
          title: cleanTitle(pickTitle(res.json), 'HESHAN_OFC_Spotify'),
          ext: 'mp3',
          thumb: pickThumb(res.json),
        }
      }
    }
  }

  // 6. PINTEREST
  if (platform === 'pinterest') {
    const pinEndpoints = [
      `https://api.ryzendesu.vip/api/downloader/pinterest?url=${enc}`,
      `https://api.giftedtech.web.id/api/download/pinterestdl?apikey=gifted&url=${enc}`,
      `https://api.siputzx.my.id/api/d/pinterest?url=${enc}`,
      `https://api.agatz.xyz/api/pinterest?url=${enc}`,
      `https://bk9.fun/download/pinterest?url=${enc}`,
    ]
    for (const ep of pinEndpoints) {
      const res = await getJson(ep)
      if (!res.json) continue
      const media = pickMedia(res.json, {})
      const foundUrl = media?.url || deepFindMediaUrl(res.json, false, false)
      if (foundUrl) {
        return {
          url: foundUrl,
          title: cleanTitle(pickTitle(res.json), 'HESHAN_OFC_Pinterest'),
          ext: media?.ext || (foundUrl.includes('.mp4') ? 'mp4' : 'jpg'),
          thumb: pickThumb(res.json) || foundUrl,
        }
      }
    }
  }

  // 7. X (TWITTER)
  if (platform === 'x') {
    const xEndpoints = [
      `https://api.ryzendesu.vip/api/downloader/twitter?url=${enc}`,
      `https://api.giftedtech.web.id/api/download/twitter?apikey=gifted&url=${enc}`,
      `https://api.siputzx.my.id/api/d/twitter?url=${enc}`,
      `https://api.agatz.xyz/api/twitter?url=${enc}`,
      `https://bk9.fun/download/twitter?url=${enc}`,
    ]
    for (const ep of xEndpoints) {
      const res = await getJson(ep)
      if (!res.json) continue
      const media = pickMedia(res.json, { audio: isAudio })
      const foundUrl = media?.url || deepFindMediaUrl(res.json, isAudio, false)
      if (foundUrl) {
        return {
          url: foundUrl,
          title: cleanTitle(pickTitle(res.json), 'HESHAN_OFC_X'),
          ext: media?.ext || 'mp4',
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
      `https://api.siputzx.my.id/api/stalk/whatsapp?number=${num}`,
      `https://bk9.fun/tools/wadp?q=${num}`,
    ]
    for (const ep of waEndpoints) {
      const res = await getJson(ep)
      if (!res.json) continue
      const media = pickMedia(res.json, { image: true })
      const foundUrl = media?.url || deepFindMediaUrl(res.json, false, true)
      if (foundUrl) {
        return {
          url: foundUrl,
          title: `WA_DP_${num}`,
          ext: 'jpg',
          thumb: foundUrl,
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
