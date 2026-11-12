import { unsealLink } from '@/lib/vault'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
const TYPES: Record<string, string> = {
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', m4a: 'audio/mp4',
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const data = unsealLink(sp.get('t') || '')
  if (!data) return new Response('Link එක expire වෙලා. අලුතින් Download කරන්න.', { status: 403 })

  const headers: Record<string, string> = { 'User-Agent': UA, Accept: '*/*' }
  const range = req.headers.get('range')
  if (range) headers.Range = range

  let up: Response
  try { up = await fetch(data.u, { headers, redirect: 'follow', signal: req.signal }) }
  catch { return new Response('Source server එකට සම්බන්ධ වීමට නොහැක', { status: 502 }) }

  if (!(up.ok || up.status === 206) || !up.body) return new Response('Stream failed', { status: 502 })
  const upType = up.headers.get('content-type') || ''
  if (/text\/html|application\/json/i.test(upType)) return new Response('Source එකෙන් file එකක් ලැබුණේ නැහැ', { status: 502 })

  const ext = data.n.split('.').pop()?.toLowerCase() || ''
  const type = !upType || /octet-stream/i.test(upType) ? TYPES[ext] || 'application/octet-stream' : upType
  const ascii = data.n.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  const mode = sp.get('inline') ? 'inline' : 'attachment'

  const out = new Headers({
    'Content-Type': type,
    'Content-Disposition': `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(data.n)}`,
    'Cache-Control': 'no-store',
    'Accept-Ranges': up.headers.get('accept-ranges') || 'bytes',
  })
  for (const h of ['content-length', 'content-range']) {
    const v = up.headers.get(h)
    if (v) out.set(h, v)
  }
  return new Response(up.body, { status: up.status, headers: out })
}
