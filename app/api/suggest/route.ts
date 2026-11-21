import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()

    if (q.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    const url = `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
    })

    const text = await res.text()
    // Extract JSON array inside window.google.ac.h(...)
    const start = text.indexOf('(')
    const end = text.lastIndexOf(')')
    if (start === -1 || end === -1) {
      return NextResponse.json({ suggestions: [] })
    }

    const parsed = JSON.parse(text.slice(start + 1, end))
    const rawList = Array.isArray(parsed?.[1]) ? parsed[1] : []

    const suggestions: string[] = rawList
      .map((item: any) => (Array.isArray(item) ? String(item[0] || '') : ''))
      .filter(Boolean)
      .slice(0, 7)

    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
