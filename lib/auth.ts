import crypto from 'crypto'
import mongoose, { Model } from 'mongoose'

const SECRET = process.env.AUTH_SECRET || 'heshan-ofc-super-secret-auth-key-2026'

export interface IUser {
  name: string
  email: string
  passwordHash?: string
  avatar?: string
  provider: 'credentials' | 'google'
  createdAt: Date
}

const UserSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: '' },
  avatar: { type: String, default: '' },
  provider: { type: String, enum: ['credentials', 'google'], default: 'credentials' },
  createdAt: { type: Date, default: Date.now },
})

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema)

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false
  const [salt, originalHash] = stored.split(':')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'))
}

export type SessionUser = {
  id: string
  name: string
  email: string
  avatar?: string
}

export function createSessionToken(user: SessionUser): string {
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifySessionToken(token?: string): SessionUser | null {
  if (!token || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  if (sig !== expected) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (data.exp && Date.now() > data.exp) return null
    return { id: data.id, name: data.name, email: data.email, avatar: data.avatar || '' }
  } catch {
    return null
  }
}
