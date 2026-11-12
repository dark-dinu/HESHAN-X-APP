import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const SECRET = process.env.APP_SECRET || 'dev-only-secret-change-me'
if (!process.env.APP_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[vault] APP_SECRET is not set – set it in your environment variables!')
}
const key = () => createHash('sha256').update(SECRET).digest()

export function sealLink(realUrl: string, fileName: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key(), iv)
  const payload = JSON.stringify({ u: realUrl, n: fileName, exp: Date.now() + 30 * 60 * 1000 })
  const enc = Buffer.concat([c.update(payload, 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url')
}

export function unsealLink(token: string): { u: string; n: string } | null {
  try {
    const raw = Buffer.from(token, 'base64url')
    const d = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12))
    d.setAuthTag(raw.subarray(12, 28))
    const p = JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8'))
    if (Date.now() > p.exp || !/^https?:\/\//i.test(p.u)) return null
    return { u: p.u, n: p.n }
  } catch { return null }
}
