import { NextResponse } from 'next/server'

const API_KEY = 'chama_api_9c55e3c6d014abbdf65054f9046a920b'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = String(searchParams.get('url') || '').trim()
  const quality = String(searchParams.get('quality') || '320kbps').trim()

  if (!url) {
    return NextResponse.json({ error: 'Track URL is required.' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://api.chamindu.site/api/v1/spotify/download?q=${encodeURIComponent(url)}&quality=${encodeURIComponent(quality)}&api_key=${API_KEY}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    const payload = data?.result || data?.data || data

    const downloadUrl =
      payload?.download_url ||
      payload?.downloadUrl ||
      payload?.audio ||
      payload?.mp3 ||
      payload?.url ||
      payload?.link ||
      ''

    if (!downloadUrl || typeof downloadUrl !== 'string') {
      return NextResponse.json({ error: 'Unable to fetch 320kbps MP3 stream for this track.' }, { status: 404 })
    }

    return NextResponse.json({
      title: String(payload?.title || payload?.name || 'Spotify Track'),
      artist: String(payload?.artist || payload?.artists || ''),
      thumbnail: String(payload?.thumbnail || payload?.image || payload?.cover || ''),
      duration: String(payload?.duration || ''),
      downloadUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load MP3 stream. Please try again.' }, { status: 500 })
  }
}
