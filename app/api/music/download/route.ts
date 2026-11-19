import { NextResponse } from 'next/server'

const API_KEY = 'chama_api_9c55e3c6d014abbdf65054f9046a920b'

// Recursively find any playable audio / download URL inside the API response
function extractAudioUrl(obj: any, depth = 0): string {
  if (!obj || depth > 5) return ''
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

async function fetchFromChamindu(trackUrl: string, quality: string) {
  const res = await fetch(
    `https://api.chamindu.site/api/v1/spotify/download?q=${encodeURIComponent(trackUrl)}&quality=${encodeURIComponent(quality)}&api_key=${API_KEY}`,
    { cache: 'no-store' }
  )
  const data = await res.json().catch(() => ({}))
  const payload = data?.result || data?.data || data
  const downloadUrl = extractAudioUrl(payload)
  return { ok: res.ok && Boolean(downloadUrl), payload, downloadUrl, raw: data }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = String(searchParams.get('url') || '').trim()
  const quality = String(searchParams.get('quality') || '320kbps').trim()

  if (!url) {
    return NextResponse.json({ error: 'Track URL is required.' }, { status: 400 })
  }

  try {
    let result = await fetchFromChamindu(url, quality)

    // Fallback to 128kbps if 320kbps is unavailable for a track
    if (!result.ok && quality !== '128kbps') {
      result = await fetchFromChamindu(url, '128kbps')
    }

    if (!result.ok || !result.downloadUrl) {
      return NextResponse.json(
        {
          error:
            result.raw?.message ||
            result.raw?.error ||
            'Unable to fetch MP3 stream for this track.',
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
  } catch {
    return NextResponse.json({ error: 'Failed to load MP3 stream. Please try again.' }, { status: 500 })
  }
}
