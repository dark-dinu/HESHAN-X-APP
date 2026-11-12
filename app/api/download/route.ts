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
const SHORT = /(^|\.)(vt\.tiktok\.com|vm\.tiktok\.com|pin\.it|fb\.watch|spotify\.link)$/i
const JUNK = /^(utm_|si$|feature$|igsh|fbclid|is_from_webapp|sender_device|web_id|_t$|_r$|share_)/i

async function normalize(raw: string): Promise<string> {
  let u: URL
  try { u = new URL(raw) } catch { return raw }
  if (u.hostname === 'youtu.be') return `https://www.youtube.com/watch?v=${u.pathname.slice(1)}`
  if (SHORT.test(u.hostname) || (/facebook\.com$/.test(u.hostname) && u.pathname.startsWith('/share/'))) {
    try {
      const r = await fetch(raw, { redirect: 'follow', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) })
      r.body?.cancel().catch(() => {})
      if (r.url) u = new URL(r.url)
    } catch {}
  }
  for (const k of [...u.searchParams.keys()]) if (JUNK.test(k)) u.searchParams.delete(k)
  if (/tiktok\.com$|instagram\.com$|pinterest\.com$/.test(u.hostname)) u.search = ''
  return u.toString()
}

async function getJson(url: string) {
  try {
    const r = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': UA, Accept: 'application/json', 'x-api-key': API_KEY },
      signal: AbortSignal.timeout(30000),
    })
    const text = await r.text()
    let json: any = null
    try { json = JSON.parse(text) } catch {}
    return { status: r.status, json }
  } catch (e: any) {
    return { status: 0, json: null, err: e?.name === 'TimeoutError' ? 'Timeout' : 'Network error' }
  }
}

async function fallbackMedia(rawUrl: string, isAudio: boolean) {
  try {
    if (rawUrl.includes('tiktok.com')) {
      const r = await fetch('https://www.tikwm.com/api/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: new URLSearchParams({ url: rawUrl, hd: '1' }),
      })
      const j = await r.json()
      const link = isAudio ? j?.data?.music : (j?.data?.hdplay || j?.data?.play)
      if (link) {
        return {
          url: link.startsWith('http') ? link : `https://www.tikwm.com${link}`,
          title: j?.data?.title || 'HESHAN_OFC_TikTok',
          ext: isAudio ? 'mp3' : 'mp4',
        }
      }
    }

    const cb = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: rawUrl, downloadMode: isAudio ? 'audio' : 'auto', videoQuality: '1080' }),
    })
    if (cb.ok) {
      const c = await cb.json()
      if (c?.url) return { url: c.url, title: c.filename || 'HESHAN_OFC_Media', ext: isAudio ? 'mp3' : 'mp4' }
    }
  } catch {}
  return null
}

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const platform = String(body.platform || '')
    const format = String(body.format || '')
    const rawInput = String(body.url || '').trim()
    let input = rawInput

    if (!input) return fail('Link එකක් හෝ අංකයක් ඇතුළත් කරන්න')
    if (!PLATFORM_IDS.includes(platform)) return fail('Platform එක හඳුනාගත නොහැක')

    if (platform !== 'whatsapp' && platform !== 'spotify') input = await normalize(input)
    if (platform === 'spotify' && /^https?:\/\//i.test(input)) input = input.split('?')[0]

    const enc = encodeURIComponent(input)
    const k = `&api_key=${API_KEY}`
    const audio = format === 'mp3' || format === '320kbps'
    let target = ''
    let image = false
    let defExt = audio ? 'mp3' : 'mp4'

    switch (platform) {
      case 'youtube':
        if (audio) {
          target = `${API_BASE}/youtube/mp3?url=${enc}&quality=320kbps${k}`
        } else if (input.includes('/shorts/')) {
          target = `${API_BASE}/media/ytshorts/download?url=${enc}&quality=1080${k}`
        } else {
          target = `${API_BASE}/youtube/mp4?url=${enc}&quality=${format || '1080p'}${k}`
        }
        break
      case 'tiktok':
        target = `${API_BASE}/tiktok?url=${enc}${k}`
        break
      case 'instagram':
        target = `${API_BASE}/media/instagram?url=${enc}${k}`
        break
      case 'facebook':
        target = `${API_BASE}/facebook/c2?url=${enc}${k}`
        break
      case 'spotify':
        target = `${API_BASE}/spotify/download?q=${enc}&quality=320kbps${k}`
        defExt = 'mp3'
        break
      case 'pinterest':
        target = `${API_BASE}/media/pinterest/infodl?q=${enc}${k}`
        break
      case 'x':
        target = `${API_BASE}/media/twitter?url=${enc}${k}`
        break
      case 'whatsapp':
        target = `${API_BASE}/media/whatsapp_dp/infodl?q=${input.replace(/\D/g, '')}${k}`
        image = true
        defExt = 'jpg'
        break
    }

    const isAudio = platform === 'spotify' || audio

    let r = await getJson(target)
    let media = pickMedia(r.json, { audio: isAudio, image })
    let fallbackTitle = ''

    // YouTube Fallback 1: savetube/mp4 endpoint
    if (!media && platform === 'youtube' && !audio) {
      const q = (format || '1080p').replace('p', '')
      r = await getJson(`${API_BASE}/youtube/savetube/mp4?url=${enc}&quality=${q}${k}`)
      media = pickMedia(r.json, {})
    }

    // YouTube Fallback 2: ytshorts/download endpoint
    if (!media && platform === 'youtube' && !audio) {
      r = await getJson(`${API_BASE}/media/ytshorts/download?url=${enc}&quality=1080${k}`)
      media = pickMedia(r.json, {})
    }

    // Backup Engine (TikWM for TikTok short links + Cobalt for others)
    if (!media && platform !== 'whatsapp') {
      const fb = await fallbackMedia(rawInput, isAudio)
      if (fb) {
        media = { url: fb.url, ext: fb.ext }
        fallbackTitle = fb.title
      }
    }

    if (!media) {
      const why = r.json?.message || r.json?.error || (r as any).err || `Status ${r.status}`
      return fail(`මීඩියා ලබාගැනීමට නොහැකි විය (${why}). Link එක public ද කියා බලන්න.`, 404)
    }

    const ext = media.ext || defExt
    const title = (pickTitle(r.json) || fallbackTitle || `HESHAN_OFC_${platform}`)
      .replace(/[\\/:*?"<>|\n\r]/g, ' ')
      .trim()
      .slice(0, 60)

    const token = sealLink(media.url, `${title}.${ext}`)
    return NextResponse.json({ token, title, ext, platform })
  } catch (e: any) {
    return fail(`Server දෝෂයකි: ${e?.message || 'Error'}`, 500)
  }
}
