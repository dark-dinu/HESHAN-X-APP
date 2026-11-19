import { NextResponse } from 'next/server'

const API_KEY = 'chama_api_9c55e3c6d014abbdf65054f9046a920b'

function normalizeSpotifyUrl(input: string): string {
  const s = input.trim()
  if (s.startsWith('spotify:track:')) {
    const id = s.split(':')[2]
    return id ? `https://open.spotify.com/track/${id}` : s
  }
  if (/^[A-Za-z0-9]{22}$/.test(s)) {
    return `https://open.spotify.com/track/${s}`
  }
  return s
}

function extractAudioUrl(obj: any, depth = 0): string {
  if (!obj || depth > 6) return ''
  if (typeof obj === 'string') {
    const s = obj.trim()
    if (
      s.startsWith('http') &&
      !s.includes('open.spotify.com') &&
      !s.includes('i.scdn.co') &&
      !s.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)
    ) {
      return s
    }
    return ''
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = extractAudioUrl(item, depth + 1)
      if (found) return found
    }
    return ''
  }
  if (typeof obj === 'object') {
    const priorityKeys = [
      'download_url',
      'downloadUrl',
      'audio_url',
      'audioUrl',
      'mp3_url',
      'mp3Url',
      'audio',
      'mp3',
      'download',
      'stream',
      'url',
      'link',
      'href',
    ]
    for (const k of priorityKeys) {
      if (k in obj) {
        const found = extractAudioUrl(obj[k], depth + 1)
        if (found) return found
      }
    }
    for (const k of Object.keys(obj)) {
      if (!priorityKeys.includes(k)) {
        const found = extractAudioUrl(obj[k], depth + 1)
        if (found) return found
      }
    }
  }
  return ''
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawUrl = String(searchParams.get('url') || '').trim()
  const quality = String(searchParams.get('quality') || '320kbps').trim()

  if (!rawUrl) {
    return NextResponse.json({ error: 'Track URL is required.' }, { status: 400 })
  }

  const trackUrl = normalizeSpotifyUrl(rawUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 18000)

  try {
    const res = await fetch(
      `https://api.chamindu.site/api/v1/spotify/download?q=${encodeURIComponent(trackUrl)}&quality=${encodeURIComponent(quality)}&api_key=${API_KEY}`,
      {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36',
          Accept: 'application/json',
        },
      }
    )
    clearTimeout(timer)

    const text = await res.text()
    let data: any = {}
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: `API returned non-JSON: ${text.slice(0, 120)}` }, { status: 502 })
    }

    const payload = data?.result || data?.data || data
    const downloadUrl = extractAudioUrl(payload)

    if (!res.ok || !downloadUrl) {
      return NextResponse.json(
        { error: `API error: ${JSON.stringify(data).slice(0, 160)}` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      title: String(payload?.title || payload?.name || 'Spotify Track'),
      artist: String(payload?.artist || payload?.artists || ''),
      thumbnail: String(payload?.thumbnail || payload?.image || payload?.cover || ''),
      duration: String(payload?.duration || ''),
      downloadUrl,
    })
  } catch (e: any) {
    clearTimeout(timer)
    return NextResponse.json(
      { error: e?.name === 'AbortError' ? 'API took too long to respond (timeout).' : `Server error: ${e?.message}` },
      { status: 504 }
    )
  }
}
