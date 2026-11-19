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

async function tryDownload(endpoint: string) {
  const res = await fetch(endpoint, { cache: 'no-store' })
  const text = await res.text()
  let data: any = {}
  try {
    data = JSON.parse(text)
  } catch {
    data = { rawText: text.slice(0, 180) }
  }
  const payload = data?.result || data?.data || data
  const downloadUrl = extractAudioUrl(payload)
  return { ok: res.ok && Boolean(downloadUrl), payload, downloadUrl, raw: data }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawUrl = String(searchParams.get('url') || '').trim()
  const quality = String(searchParams.get('quality') || '320kbps').trim()

  if (!rawUrl) {
    return NextResponse.json({ error: 'Track URL is required.' }, { status: 400 })
  }

  const trackUrl = normalizeSpotifyUrl(rawUrl)

  try {
    // 1. Try with requested quality (320kbps)
    let result = await tryDownload(
      `https://api.chamindu.site/api/v1/spotify/download?q=${encodeURIComponent(trackUrl)}&quality=${encodeURIComponent(quality)}&api_key=${API_KEY}`
    )

    // 2. Try without quality parameter
    if (!result.ok) {
      result = await tryDownload(
        `https://api.chamindu.site/api/v1/spotify/download?q=${encodeURIComponent(trackUrl)}&api_key=${API_KEY}`
      )
    }

    // 3. Try using `url=` param instead of `q=`
    if (!result.ok) {
      result = await tryDownload(
        `https://api.chamindu.site/api/v1/spotify/download?url=${encodeURIComponent(trackUrl)}&quality=${encodeURIComponent(quality)}&api_key=${API_KEY}`
      )
    }

    if (!result.ok || !result.downloadUrl) {
      const debugPreview = JSON.stringify(result.raw).slice(0, 180)
      return NextResponse.json(
        {
          error: `Stream unavailable (${trackUrl}) — API: ${debugPreview}`,
        },
        { status: 404 }
      )
    }

    const p = result.payload || {}
    return NextResponse.json({
      title: String(p?.title || p?.name || 'Spotify Track'),
      artist: String(p?.artist || p?.artists || ''),
      thumbnail: String(p?.thumbnail || p?.image || p?.cover || ''),
      duration: String(p?.duration || ''),
      downloadUrl: result.downloadUrl,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load MP3 stream.' }, { status: 500 })
  }
}
