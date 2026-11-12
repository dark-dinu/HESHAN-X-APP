import { NextResponse } from 'next/server'
import { sealLink } from '@/lib/vault'

const API_BASE = process.env.CHAMINDU_API_BASE || 'https://api.chamindu.site/api/v1'
const API_KEY = process.env.CHAMINDU_API_KEY || 'chama_api_9c55e3c6d014abbdf65054f9046a920b'

function extractMediaUrl(obj: any): string | null {
  if (!obj) return null
  if (typeof obj === 'string' && obj.startsWith('http')) return obj
  if (typeof obj !== 'object') return null

  const priorityKeys = [
    'download_url', 'downloadUrl', 'url', 'video', 'hd', 'sd',
    'mp4', 'mp3', 'audio', 'dp', 'profilePic', 'image', 'link', 'nowm', 'play',
  ]

  for (const key of priorityKeys) {
    if (typeof obj[key] === 'string' && obj[key].startsWith('http')) {
      return obj[key]
    }
  }

  for (const val of Object.values(obj)) {
    const found = extractMediaUrl(val)
    if (found) return found
  }
  return null
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin') || ''
    const host = req.headers.get('host') || ''
    if (origin && !origin.includes(host)) {
      return NextResponse.json({ error: 'Unauthorized request' }, { status: 403 })
    }

    const { url, platform, format } = await req.json()
    const input = (url || '').trim()
    if (!input) {
      return NextResponse.json({ error: 'Link එකක් හෝ අංකයක් ඇතුළත් කරන්න' }, { status: 400 })
    }

    const enc = encodeURIComponent(input)
    let targetUrl = ''
    let ext = 'mp4'

    switch (platform) {
      case 'youtube':
        if (format === '320kbps') {
          targetUrl = `${API_BASE}/youtube/mp3?url=${enc}&quality=320kbps&api_key=${API_KEY}`
          ext = 'mp3'
        } else if (input.includes('/shorts/')) {
          targetUrl = `${API_BASE}/media/ytshorts/download?url=${enc}&quality=1080&api_key=${API_KEY}`
        } else {
          targetUrl = `${API_BASE}/youtube/mp4?url=${enc}&quality=${format || '1080p'}&api_key=${API_KEY}`
        }
        break

      case 'tiktok':
        targetUrl = `${API_BASE}/tiktok?url=${enc}&api_key=${API_KEY}`
        if (format === 'mp3') ext = 'mp3'
        break

      case 'instagram':
        targetUrl = `${API_BASE}/media/instagram?url=${enc}&api_key=${API_KEY}`
        break

      case 'facebook':
        targetUrl = `${API_BASE}/facebook/c2?url=${enc}&api_key=${API_KEY}`
        break

      case 'spotify':
        targetUrl = `${API_BASE}/spotify/download?q=${enc}&quality=320kbps&api_key=${API_KEY}`
        ext = 'mp3'
        break

      case 'pinterest':
        targetUrl = `${API_BASE}/media/pinterest/infodl?q=${enc}&api_key=${API_KEY}`
        break

      case 'x':
        targetUrl = `${API_BASE}/media/twitter?url=${enc}&api_key=${API_KEY}`
        break

      case 'whatsapp': {
        const cleanNum = input.replace(/[^0-9]/g, '')
        targetUrl = `${API_BASE}/media/whatsapp_dp/infodl?q=${cleanNum}&api_key=${API_KEY}`
        ext = 'jpg'
        break
      }

      default:
        return NextResponse.json({ error: 'Platform එක හඳුනාගත නොහැක' }, { status: 400 })
    }

    let upstream = await fetch(targetUrl, { cache: 'no-store' })
    let json = upstream.ok ? await upstream.json() : null

    if (platform === 'youtube' && format !== '320kbps' && !extractMediaUrl(json)) {
      const qNum = (format || '1080p').replace('p', '')
      const fallbackUrl = `${API_BASE}/youtube/savetube/mp4?url=${enc}&quality=${qNum}&api_key=${API_KEY}`
      upstream = await fetch(fallbackUrl, { cache: 'no-store' })
      json = upstream.ok ? await upstream.json() : null
    }

    const mediaUrl = extractMediaUrl(json)
    if (!mediaUrl) {
      return NextResponse.json({ error: 'මෙම link එකෙන් මීඩියා ලබාගැනීමට නොහැකි විය' }, { status: 404 })
    }

    const rawTitle = json?.title || json?.result?.title || json?.data?.title || `HESHAN_OFC_${platform}`
    const safeTitle = String(rawTitle).slice(0, 50)
    const token = sealLink(mediaUrl, `${safeTitle}.${ext}`)

    return NextResponse.json({
      token,
      title: safeTitle,
      ext,
    })
  } catch {
    return NextResponse.json({ error: 'Server දෝෂයකි. මද වේලාවකින් උත්සාහ කරන්න' }, { status: 500 })
  }
}
