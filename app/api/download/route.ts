import { NextResponse } from 'next/server'
import { sealLink } from '@/lib/vault'
import { pickMedia, pickTitle } from '@/lib/extract'
import { PLATFORM_IDS } from '@/config/platforms'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const API_BASE = 'https://api.chamindu.site/api/v1'
const API_KEY = 'chama_api_9c55e3c6d014abbdf65054f9046a920b'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

async function getJson(url: string, init?: RequestInit, timeoutMs = 11000) {
  try {
    const r = await fetch(url, {
      cache: 'no-store',
      ...init,
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
    const text = await r.text()
    let json: any = null
    try { json = JSON.parse(text) } catch {}
    return { status: r.status, json, text }
  } catch (e: any) {
    return { status: 0, json: null, text: e?.message || 'fetch error' }
  }
}

async function normalizeSpotifyUrl(rawUrl: string): Promise<string> {
  let clean = rawUrl.trim().split('?')[0]
  try {
    if (/spotify\.link/i.test(clean)) {
      const r = await fetch(clean, { redirect: 'follow', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) })
      if (r.url) clean = r.url.split('?')[0]
    }
    if (/open\.spotify\.com\/(album|playlist)\//i.test(clean)) {
      const res = await fetch(clean, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(7000) })
      const html = await res.text()
      const trackMatch =
        html.match(/https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/i)?.[0] ||
        html.match(/spotify:track:([a-zA-Z0-9]+)/i)?.[1]
      if (trackMatch) {
        clean = trackMatch.startsWith('http') ? trackMatch : `https://open.spotify.com/track/${trackMatch}`
      }
    }
  } catch {}
  return clean
}

async function normalizeFacebookUrl(rawUrl: string): Promise<string> {
  let clean = rawUrl.trim()

  if (/facebook\.com\/share\/|fb\.watch/i.test(clean)) {
    try {
      const res = await fetch(clean, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(7000),
      })
      if (res.url && !res.url.includes('/login') && !res.url.includes('/share/')) {
        clean = res.url
      } else {
        const html = await res.text()
        const match =
          html.match(/<meta property="og:url" content="([^"]+)"/i)?.[1] ||
          html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] ||
          html.match(/https?:\/\/(?:www|web|m)\.facebook\.com\/(?:reel|watch|videos)\/[0-9]+/i)?.[0] ||
          html.match(/https?:\\\/\\\/(?:www|web|m)\.facebook\.com\\\/(?:reel|watch|videos)\\\/[0-9]+/i)?.[0]
        if (match) {
          clean = match.replace(/\\\//g, '/').replace(/&amp;/g, '&')
        }
      }
    } catch {}
  }

  clean = clean.split('?')[0].replace(/^https?:\/\/(www\.|m\.|mbasic\.)?facebook\.com/i, 'https://web.facebook.com')
  return clean
}

function deepFindMediaUrl(obj: any, preferAudio = false, preferImage = false): string {
  const urls: string[] = []
  const scan = (val: any) => {
    if (!val) return
    if (typeof val === 'string') {
      const clean = val.replace(/\\\//g, '/').trim()
      if (/^https?:\/\//i.test(clean) || (preferImage && /^data:image\//i.test(clean))) {
        urls.push(clean)
      }
      return
    }
    if (Array.isArray(val)) {
      val.forEach(scan)
      return
    }
    if (typeof val === 'object') {
      for (const key of [
        'profilePic', 'profile_pic', 'profilePicture', 'profile_picture', 'ppUrl', 'pp_url',
        'dp', 'dp_url', 'dpUrl', 'picture', 'avatar', 'image', 'img', 'photo', 'pic',
        'hd', 'hd_url', 'hdplay', 'video_hd', 'mp4', 'download_url', 'downloadUrl', 'dl_url',
        'audio', 'music', 'play', 'sd', 'sd_url', 'url', 'link', 'media', 'result', 'data'
      ]) {
        if (val[key] !== undefined) scan(val[key])
      }
      for (const [k, v] of Object.entries(val)) {
        if (!preferImage && ['thumbnail', 'thumb', 'cover', 'origin_cover', 'avatar', 'icon', 'pic', 'artwork', 'author'].includes(k.toLowerCase())) {
          continue
        }
        scan(v)
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
      !u.includes('open.spotify.com/') &&
      !u.includes('pinterest.com/pin') &&
      !u.includes('x.com/') &&
      !u.includes('twitter.com/') &&
      !u.includes('chamindu.site') &&
      !u.includes('github.com')
  )

  if (preferImage) {
    return (
      filtered.find(
        (u) =>
          u.startsWith('data:image/') ||
          u.includes('whatsapp.net') ||
          u.includes('scontent') ||
          u.includes('pinimg.com') ||
          /\.(jpg|jpeg|png|webp)/i.test(u)
      ) ||
      filtered[0] ||
      ''
    )
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
  for (const k of ['profilePic', 'profile_pic', 'ppUrl', 'dp', 'cover', 'origin_cover', 'thumbnail', 'thumb', 'image', 'pic', 'artwork', 'hd_image']) {
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

// Race all endpoints in parallel so the fastest working server wins immediately
async function raceEndpoints(
  endpoints: string[],
  opts: { isAudio: boolean; image: boolean; defExt: string }
): Promise<{ mediaUrl: string; mediaExt: string; lastJson: any; lastDebug: string }> {
  let lastDebug = ''

  if (endpoints.length === 0) {
    return { mediaUrl: '', mediaExt: opts.defExt, lastJson: null, lastDebug: 'no endpoints' }
  }

  try {
    const winner = await Promise.any(
      endpoints.map(async (target) => {
        const r = await getJson(target, undefined, 11000)
        lastDebug = `HTTP ${r.status}: ${(r.text || '').slice(0, 120)}`
        if (!r.json) throw new Error('no json')

        const picked = pickMedia(r.json, { audio: opts.isAudio, image: opts.image })
        if (picked?.url) {
          return {
            mediaUrl: picked.url,
            mediaExt: picked.ext || opts.defExt,
            lastJson: r.json,
            lastDebug,
          }
        }

        const deepUrl = deepFindMediaUrl(r.json, opts.isAudio, opts.image)
        if (deepUrl) {
          return {
            mediaUrl: deepUrl,
            mediaExt: opts.defExt,
            lastJson: r.json,
            lastDebug,
          }
        }

        throw new Error('no media url in response')
      })
    )
    return winner
  } catch {
    return { mediaUrl: '', mediaExt: opts.defExt, lastJson: null, lastDebug }
  }
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

    if (platform === 'facebook') {
      input = await normalizeFacebookUrl(input)
    } else if (platform === 'spotify') {
      input = await normalizeSpotifyUrl(input)
    }

    const enc = encodeURIComponent(input)
    const rawEnc = encodeURIComponent(rawInput)
    const k = `&api_key=${API_KEY}`
    const audio = format === 'mp3' || format === '320kbps'
    const isAudio = platform === 'spotify' || audio
    let image = false
    let defExt = isAudio ? 'mp3' : 'mp4'
    let waNumber = ''

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
        endpoints.push(
          `${API_BASE}/facebook?url=${enc}${k}`,
          `${API_BASE}/facebook/c2?url=${enc}${k}`
        )
        if (rawEnc !== enc) {
          endpoints.push(
            `${API_BASE}/facebook?url=${rawEnc}${k}`,
            `${API_BASE}/facebook/c2?url=${rawEnc}${k}`
          )
        }
        break
      case 'spotify':
        defExt = 'mp3'
        endpoints.push(
          `${API_BASE}/spotify/download?q=${enc}&quality=320kbps${k}`,
          `${API_BASE}/spotify/download?url=${enc}&quality=320kbps${k}`
        )
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
        if (num.length === 9 && num.startsWith('7')) num = '94' + num
        waNumber = num
        image = true
        defExt = 'jpg'
        endpoints.push(
          `${API_BASE}/media/whatsapp_dp/infodl?q=${num}${k}`,
          `${API_BASE}/media/whatsapp_dp/infodl?number=${num}${k}`,
          `${API_BASE}/stalk/whatsapp?number=${num}${k}`,
          `https://api.giftedtech.web.id/api/tools/wadp?apikey=gifted&number=${num}`,
          `https://api.siputzx.my.id/api/stalk/whatsapp?number=${num}`,
          `https://bk9.fun/tools/wadp?q=${num}`
        )
        break
      }
    }

    // Race all primary endpoints simultaneously for maximum speed
    let { mediaUrl, mediaExt, lastJson, lastDebug } = await raceEndpoints(endpoints, {
      isAudio,
      image,
      defExt,
    })

    // Facebook Backup API
    if (!mediaUrl && platform === 'facebook') {
      const fbBackup = await getJson('https://fdown.isuru.eu.org/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input, quality: 'best' }),
      }, 9000)
      if (fbBackup.json) {
        const bUrl = deepFindMediaUrl(fbBackup.json, false, false)
        if (bUrl) {
          mediaUrl = bUrl
          lastJson = fbBackup.json
        }
      }
    }

    // TikTok Backup API
    if (!mediaUrl && platform === 'tiktok') {
      try {
        const tr = await fetch(`https://www.tikwm.com/api/?url=${enc}&hd=1`, { signal: AbortSignal.timeout(8000) })
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
        error: platform === 'whatsapp'
          ? 'Could not fetch WhatsApp DP. Make sure the number has a public profile photo (e.g. 94719845166).'
          : `Unable to fetch media (${lastDebug})`,
      }, { status: 404 })
    }

    // WhatsApp DP preview + direct download
    if (platform === 'whatsapp') {
      const wpTitle = cleanTitle(pickTitle(lastJson), `WA_DP_${waNumber || 'HESHAN_OFC'}`)
      const token = mediaUrl.startsWith('data:') ? '' : sealLink(mediaUrl, `${wpTitle}.jpg`)
      return NextResponse.json({
        token,
        directHref: mediaUrl,
        title: wpTitle,
        ext: 'jpg',
        platform: 'whatsapp',
        thumb: mediaUrl,
      })
    }

    const title = cleanTitle(pickTitle(lastJson), `HESHAN_OFC_${platform}`)
    const thumb = pickThumb(lastJson) || (image ? mediaUrl : '')
    const token = sealLink(mediaUrl, `${title}.${mediaExt}`)
    return NextResponse.json({ token, title, ext: mediaExt, platform, thumb })
  } catch (e: any) {
    return NextResponse.json({ error: `Server error: ${e?.message || 'unknown'}` }, { status: 500 })
  }
}
