import { NextResponse } from 'next/server'

const API_KEY = 'chama_api_9c55e3c6d014abbdf65054f9046a920b'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = String(searchParams.get('q') || '').trim()

  if (!q) {
    return NextResponse.json({ error: 'Please enter a song name.' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://api.chamindu.site/api/v1/spotify/search?q=${encodeURIComponent(q)}&api_key=${API_KEY}`,
      { cache: 'no-store' }
    )
    const data = await res.json()

    // Handle different possible response array wrappers safely
    const rawList =
      (Array.isArray(data?.result) && data.result) ||
      (Array.isArray(data?.results) && data.results) ||
      (Array.isArray(data?.data) && data.data) ||
      (Array.isArray(data?.tracks) && data.tracks) ||
      (Array.isArray(data) && data) ||
      []

    const tracks = rawList.slice(0, 10).map((item: any, idx: number) => ({
      id: String(item.id || item.url || item.link || idx),
      title: String(item.title || item.name || 'Unknown Track'),
      artist: String(item.artist || item.artists || item.author || 'Unknown Artist'),
      album: String(item.album || ''),
      duration: String(item.duration || item.time || ''),
      thumbnail: String(item.thumbnail || item.image || item.cover || ''),
      url: String(item.url || item.link || item.spotify_url || ''),
    })).filter((t: any) => t.url)

    if (!tracks.length) {
      return NextResponse.json({ error: 'No matching tracks found. Try another keyword.' }, { status: 404 })
    }

    return NextResponse.json({ tracks })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to search tracks. Please try again.' }, { status: 500 })
  }
}
