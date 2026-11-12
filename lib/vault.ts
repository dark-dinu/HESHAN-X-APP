import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const SECRET = process.env.APP_SECRET || 'heshan_ofc_ultra_secret_encryption_key_2026_9988776655'

function getKey() {
  return createHash('sha256').update(SECRET).digest()
}

export function sealLink(realUrl: string, fileName: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const payload = JSON.stringify({
    u: realUrl,
    n: fileName,
    exp: Date.now() + 10 * 60 * 1000,
  })
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64url')
}

export function unsealLink(token: string): { u: string; n: string } | null {
  try {
    const raw = Buffer.from(token, 'base64url')
    const iv = raw.subarray(0, 12)
    const tag = raw.subarray(12, 28)
    const data = raw.subarray(28)

    const decipher = createDecipheriv('aes-256-gcm', getKey(), iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
    const parsed = JSON.parse(decrypted)

    if (Date.now() > parsed.exp) return null
    return { u: parsed.u, n: parsed.n }
  } catch {
    return null
  }
}
