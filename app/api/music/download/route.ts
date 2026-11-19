import { NextResponse } from 'next/server'

const API_KEY = 'chama_api_9c55e3c6d014abbdf65054f9046a920b'
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36'

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

function isYoutubeUrl(url: string): boolean {
  return /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)/i.test(url)
}

function extractAudioUrl(obj: any, depth = 0): string {
  if (!obj || depth > 6) return ''
  if (typeof obj === 'string') {
    const s = obj.trim()
    if (
      s.startsWith('http') &&
      !s.includes('open.spotify.com') &&
      !s.includes('i.scdn.co') &&
      !s.includes('youtube.com/watch') &&
      !s.includes('youtu.be/') &&
      !s.includes('ytimg.com') &&
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

async function fetchJson(endpoint: string, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(endpoint, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
  } catch {
    return { ok: false, data: {} }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchYoutubeMp3(ytUrl: string, quality: string) {
  const res = await fetchJson(
    `https://api.chamindu.site/api/v1/youtube/mp3?url=${encodeURIComponent(ytUrl)}&quality=${encodeURIComponent(quality)}&api_key=${API_KEY}`
  )
  const payload = res.data?.result || res.data?.data || res.data
  const downloadUrl = extractAudioUrl(payload)
  return { ok: Boolean(downloadUrl), payload, downloadUrl }
}

async function searchYoutubeAndGetMp3(query: string, quality: string) {
  // Try Chamindu YouTube search endpoints if available, or fallback search
  const searchEndpoints = [
    `https://api.chamindu.site/api/v1/youtube/search?q=${encodeURIComponent(query)}&api_key=${API_KEY}`,
    `https://api.chamindu.site/api/v1/search/youtube?q=${encodeURIComponent(query)}&api_key=${API_KEY}`,
  ]

  for (const ep of searchEndpoints) {
    const sRes = await fetchJson(ep, 10000)
    const list =
      (Array.isArray(sRes.data?.result) && sRes.data.result) ||
      (Array.isArray(sRes.data?.results) && sRes.data.results) ||
      (Array.isArray(sRes.data?.data) && sRes.data.data) ||
      (Array.isArray(sRes.data) && sRes.data) ||
      []

    const firstYt = list.find((item: any) => {
      const u = String(item?.url || item?.link || '')
      return isYoutubeUrl(u)
    })

    if (firstYt) {
      const ytUrl = String(firstYt.url || firstYt.link)
      const mp3Res = await fetchYoutubeMp3(ytUrl, quality)
      if (mp3Res.ok) {
        return {
          ok: true,
          downloadUrl: mp3Res.downloadUrl,
          title: String(mp3Res.payload?.title || firstYt?.title || query),
          artist: String(mp3Res.payload?.artist || firstYt?.author || ''),
          thumbnail: String(mp3Res.payload?.thumbnail || firstYt?.thumbnail || ''),
        }
      }
    }
  }

  // Direct YouTube HTML search fallback to extract first videoId
  try {
    const htmlRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': UA }, cache: 'no-store' }
    )
    const html = await htmlRes.text()
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
    if (match?.[1]) {
      const ytUrl = `https://www.youtube.com/watch?v=${match[1]}`
      const mp3Res = await fetchYoutubeMp3(ytUrl, quality)
      if (mp3Res.ok) {
        return {
          ok: true,
          downloadUrl: mp3Res.downloadUrl,
          title: String(mp3Res.payload?.title || query),
          artist: String(mp3Res.payload?.artist || ''),
          thumbnail: String(mp3Res.payload?.thumbnail || `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`),
        }
      }
    }
  } catch {}

  return { ok: false, downloadUrl: '', title: '', artist: '', thumbnail: '' }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawUrl = String(searchParams.get('url') || '').trim()
  const titleHint = String(searchParams.get('title') || '').trim()
  const quality = String(searchParams.get('quality') || '320kbps').trim()

  if (!rawUrl) {
    return NextResponse.json({ error: 'Track or video URL is required.' }, { status: 400 })
  }

  // Case 1: Direct YouTube link -> use /api/v1/youtube/mp3
  if (isYoutubeUrl(rawUrl)) {
    const ytRes = await fetchYoutubeMp3(rawUrl, quality)
    if (!ytRes.ok) {
      return NextResponse.json({ error: 'Unable to fetch 320kbps MP3 from this YouTube link.' }, { status: 404 })
    }
    const p = ytRes.payload || {}
    return NextResponse.json({
      title: String(p?.title || titleHint || 'YouTube Audio'),
      artist: String(p?.artist || p?.author || ''),
      thumbnail: String(p?.thumbnail || p?.image || ''),
      downloadUrl: ytRes.downloadUrl,
    })
  }

  // Case 2: Spotify link -> try /spotify/track + /spotify/download, then auto-fallback to YouTube 320kbps MP3
  const spotifyUrl = normalizeSpotifyUrl(rawUrl)

  const [trackMetaRes, dlRes] = await Promise.all([
    fetchJson(
      `https://api.chamindu.site/api/v1/spotify/track?url=${encodeURIComponent(spotifyUrl)}&api_key=${API_KEY}`,
      12000
    ),
    fetchJson(
      `https://api.chamindu.site/api/v1/spotify/download?q=${encodeURIComponent(spotifyUrl)}&quality=${encodeURIComponent(quality)}&api_key=${API_KEY}`,
      14000
    ),
  ])

  const meta = trackMetaRes.data?.result || trackMetaRes.data?.data || trackMetaRes.data || {}
  const dlPayload = dlRes.data?.result || dlRes.data?.data || dlRes.data || {}

  const resolvedTitle = String(meta?.title || meta?.name || dlPayload?.title || titleHint || 'Spotify Track')
  const resolvedArtist = String(meta?.artist || meta?.artists || dlPayload?.artist || '')
  const resolvedThumb = String(meta?.thumbnail || meta?.image || meta?.cover || dlPayload?.thumbnail || '')

  const directMp3 = extractAudioUrl(dlPayload) || extractAudioUrl(meta)
  if (directMp3) {
    return NextResponse.json({
      title: resolvedTitle,
      artist: resolvedArtist,
      thumbnail: resolvedThumb,
      downloadUrl: directMp3,
    })
  }

  // Fallback: Resolve via YouTube 320kbps MP3 using the exact track title + artist
  const searchQuery = [resolvedTitle !== 'Spotify Track' ? resolvedTitle : titleHint, resolvedArtist]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (searchQuery) {
    const ytFallback = await searchYoutubeAndGetMp3(searchQuery, quality)
    if (ytFallback.ok && ytFallback.downloadUrl) {
      return NextResponse.json({
        title: resolvedTitle !== 'Spotify Track' ? resolvedTitle : ytFallback.title,
        artist: resolvedArtist || ytFallback.artist,
        thumbnail: resolvedThumb || ytFallback.thumbnail,
        downloadUrl: ytFallback.downloadUrl,
      })
    }
  }

  return NextResponse.json(
    { error: 'Unable to load audio stream for this track. Please try another version.' },
    { status: 404 }
  )
}
