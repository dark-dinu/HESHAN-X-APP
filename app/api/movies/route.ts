import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://api.chamindu.site/api/v1/movies/sinhalasub'
const API_KEY =
  process.env.CHAMINDU_API_KEY || 'chama_api_9c55e3c6d014abbdf65054f9046a920b'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'search'
    const q = (searchParams.get('q') || '').trim()

    if (!q) {
      return NextResponse.json({ error: 'Search query or URL required.' }, { status: 400 })
    }

    let endpoint = ''
    switch (action) {
      case 'search':
        endpoint = `${BASE_URL}/search?q=${encodeURIComponent(q)}&api_key=${API_KEY}`
        break
      case 'infodl':
        endpoint = `${BASE_URL}/infodl?q=${encodeURIComponent(q)}&api_key=${API_KEY}`
        break
      case 'tv-search':
        endpoint = `${BASE_URL}/tv/search?q=${encodeURIComponent(q)}&api_key=${API_KEY}`
        break
      case 'tv-info':
        endpoint = `${BASE_URL}/tv/info?q=${encodeURIComponent(q)}&api_key=${API_KEY}`
        break
      case 'tv-dl':
        endpoint = `${BASE_URL}/tv/dl?q=${encodeURIComponent(q)}&api_key=${API_KEY}`
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      },
      cache: 'no-store',
    })

    const rawText = await res.text()
    let data: any = null
    try {
      data = JSON.parse(rawText)
    } catch {
      data = null
    }

    if (!res.ok || !data) {
      return NextResponse.json(
        {
          error:
            data?.message ||
            data?.error ||
            `API HTTP ${res.status}: ${rawText.slice(0, 120)}`,
          fallbackUrl: endpoint,
        },
        { status: res.status || 502 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Movie server error.' },
      { status: 500 }
    )
  }
}
