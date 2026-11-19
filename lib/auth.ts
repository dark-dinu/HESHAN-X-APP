import crypto from 'crypto'
import mongoose, { Model } from 'mongoose'

const SECRET = process.env.AUTH_SECRET || 'heshan-ofc-super-secret-auth-key-2026'
export const OWNER_EMAIL = 'damiyamalinda@gmail.com'

export type UserPlan = 'normal' | 'premium'

export interface IUser {
  name: string
  email: string
  passwordHash?: string
  avatar?: string
  provider: 'credentials' | 'google'
  plan: UserPlan
  createdAt: Date
}

const UserSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: '' },
  avatar: { type: String, default: '' },
  provider: { type: String, enum: ['credentials', 'google'], default: 'credentials' },
  plan: { type: String, enum: ['normal', 'premium'], default: 'normal' },
  createdAt: { type: Date, default: Date.now },
})

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema)

export function isOwnerEmail(email?: string): boolean {
  return String(email || '').trim().toLowerCase() === OWNER_EMAIL
}

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
  plan: UserPlan
  isOwner: boolean
}

export function createSessionToken(user: Omit<SessionUser, 'isOwner'> & { isOwner?: boolean }): string {
  const owner = isOwnerEmail(user.email)
  const payloadData: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || '',
    plan: owner ? 'premium' : user.plan || 'normal',
    isOwner: owner,
  }
  const payload = Buffer.from(
    JSON.stringify({ ...payloadData, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
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
    const owner = isOwnerEmail(data.email)
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      avatar: data.avatar || '',
      plan: owner ? 'premium' : data.plan || 'normal',
      isOwner: owner,
    }
  } catch {
    return null
  }
}
