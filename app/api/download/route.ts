import { NextResponse } from 'next/server'
import { sealLink } from '@/lib/vault'

const API_BASE = process.env.CHAMINDU_API_BASE || 'https://api.chamindu.site/api/v1'
const API_KEY = process.env.CHAMINDU_API_KEY || 'chama_api_9c55e3c6d014abbdf65054f9046a920b'

// vt.tiktok.com / pin.it / fb.watch වගේ short links full URL එකට expand කිරීම
async function expandShortUrl(rawUrl: string): Promise<string> {
  if (!/^https?:\/\//i.test(rawUrl)) return rawUrl
  if (
    rawUrl.includes('vt.tiktok.com') ||
    rawUrl.includes('vm.tiktok.com') ||
    rawUrl.includes('pin.it') ||
    rawUrl.includes('fb.watch') ||
    rawUrl.includes('youtu.be')
  ) {
    try {
      const res = await fetch(rawUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        },
      })
      if (res.url && res.url.startsWith('http')) {
        return res.url.split('?')[0] // Tracking parameters අයින් කර පිරිසිදු link එක ගැනීම
      }
    } catch {}
  }
  return rawUrl
}

function extractMediaUrl(obj: any, preferAudio = false): string | null {
  if (!obj) return null
  if (typeof obj === 'string' && obj.startsWith('http')) return obj
  if (typeof obj !== 'object') return null

  const audioKeys = ['mp3', 'audio', 'music', 'sound', 'download_url', 'downloadUrl', 'url', 'link']
  const videoKeys = [
    'hdplay', 'no_watermark', 'nowm', 'play', 'hd', 'video',
    'download_url', 'downloadUrl', 'mp4', 'sd', 'dp', 'profilePic', 'image', 'url', 'link',
  ]

  const keys = preferAudio ? audioKeys : videoKeys

  for (const key of keys) {
    if (typeof obj[key] === 'string' && obj[key].startsWith('http')) {
      return obj[key]
    }
  }

  for (const val of Object.values(obj)) {
    const found = extractMediaUrl(val, preferAudio)
    if (found) return found
  }
  return null
}

export async function POST(req: Request) {
  try {
    const { url, platform, format } = await req.json()
    let input = (url || '').trim()
    if (!input) {
      return NextResponse.json({ error: 'Link එකක් හෝ අංකයක් ඇතුළත් කරන්න' }, { status: 400 })
    }

    // Short links auto-expand කිරීම
    if (platform !== 'whatsapp') {
      input = await expandShortUrl(input)
    }

    const enc = encodeURIComponent(input)
    let targetUrl = ''
    let ext = 'mp4'
    const isAudio = format === 'mp3' || format === '320kbps'

    switch (platform) {
      case 'youtube':
        if (isAudio) {
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
        if (isAudio) ext = 'mp3'
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

    const fetchOpts = {
      cache: 'no-store' as RequestCache,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    }

    let upstream = await fetch(targetUrl, fetchOpts)
    let json = upstream.ok ? await upstream.json() : null

    if (platform === 'youtube' && !isAudio && !extractMediaUrl(json)) {
      const qNum = (format || '1080p').replace('p', '')
      const fallbackUrl = `${API_BASE}/youtube/savetube/mp4?url=${enc}&quality=${qNum}&api_key=${API_KEY}`
      upstream = await fetch(fallbackUrl, fetchOpts)
      json = upstream.ok ? await upstream.json() : null
    }

    const mediaUrl = extractMediaUrl(json, isAudio)
    if (!mediaUrl) {
      const apiMsg = json?.message || json?.error || `Status ${upstream.status}`
      return NextResponse.json(
        { error: `මීඩියා ලබාගැනීමට නොහැකි විය (${apiMsg})` },
        { status: 404 }
      )
    }

    const rawTitle = json?.title || json?.result?.title || json?.data?.title || `HESHAN_OFC_${platform}`
    const safeTitle = String(rawTitle).slice(0, 50)
    const token = sealLink(mediaUrl, `${safeTitle}.${ext}`)

    return NextResponse.json({
      token,
      title: safeTitle,
      ext,
    })
  } catch (e: any) {
    return NextResponse.json({ error: `Server දෝෂයකි: ${e.message || 'Error'}` }, { status: 500 })
  }
}
