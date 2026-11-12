import { unsealLink } from '@/lib/vault'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('t') || ''
  const data = unsealLink(token)

  if (!data) {
    return new Response('Link expired or invalid', { status: 403 })
  }

  const upstream = await fetch(data.u)
  if (!upstream.ok || !upstream.body) {
    return new Response('Stream failed', { status: 502 })
  }

  const safeName = data.n.replace(/[^a-zA-Z0-9._-]/g, '_')
  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${safeName}"`,
    'Cache-Control': 'no-store',
  })

  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)

  return new Response(upstream.body, { headers })
}
