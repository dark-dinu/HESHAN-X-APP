import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import mongoose from 'mongoose'
import {
  User,
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  isOwnerEmail,
} from '@/lib/auth'

const MONGODB_URI = process.env.MONGODB_URI || ''

async function ensureDb() {
  if (mongoose.connection.readyState >= 1) return
  if (!MONGODB_URI) throw new Error('MONGODB_URI is missing')
  await mongoose.connect(MONGODB_URI)
}

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('heshan_session')?.value
  const sessionUser = verifySessionToken(token)
  if (!sessionUser) return NextResponse.json({ user: null })

  try {
    await ensureDb()
    const dbUser = await User.findOne({ email: sessionUser.email }).lean()
    if (dbUser) {
      const owner = isOwnerEmail(dbUser.email)
      const latestPlan = owner ? 'premium' : (dbUser.plan || 'normal')
      return NextResponse.json({
        user: {
          id: String(dbUser._id),
          name: dbUser.name,
          email: dbUser.email,
          avatar: dbUser.avatar || '',
          plan: latestPlan,
          isOwner: owner,
        },
      })
    }
  } catch {}

  return NextResponse.json({ user: sessionUser })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')

    if (action === 'logout') {
      const res = NextResponse.json({ ok: true })
      res.cookies.delete('heshan_session')
      return res
    }

    await ensureDb()

    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const name = String(body.name || '').trim()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'වලංගු Gmail ලිපිනයක් ඇතුළත් කරන්න.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password එක අවම වශයෙන් අකුරු 6ක් විය යුතුයි.' }, { status: 400 })
    }

    if (action === 'register') {
      if (!name) return NextResponse.json({ error: 'ඔබේ නම ඇතුළත් කරන්න.' }, { status: 400 })
      const exists = await User.findOne({ email })
      if (exists) {
        return NextResponse.json({ error: 'මෙම Gmail ලිපිනය දැනටමත් Register වී ඇත. Login වන්න.' }, { status: 400 })
      }
      const owner = isOwnerEmail(email)
      const created = await User.create({
        name,
        email,
        passwordHash: hashPassword(password),
        provider: 'credentials',
        plan: owner ? 'premium' : 'normal',
      })
      const sessionUser = {
        id: String(created._id),
        name: created.name,
        email: created.email,
        avatar: '',
        plan: owner ? ('premium' as const) : ('normal' as const),
        isOwner: owner,
      }
      const token = createSessionToken(sessionUser)
      const res = NextResponse.json({ user: sessionUser })
      res.cookies.set('heshan_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      })
      return res
    }

    if (action === 'login') {
      const user = await User.findOne({ email })
      if (!user) {
        return NextResponse.json({ error: 'මෙම Gmail ලිපිනයට ගිණුමක් නැත. Register වන්න.' }, { status: 404 })
      }
      if (user.provider === 'google' && !user.passwordHash) {
        return NextResponse.json({ error: 'මෙම ගිණුම Google Login හරහා සාදා ඇත.' }, { status: 400 })
      }
      if (!verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: 'Password එක වැරදියි. නැවත පරීක්ෂා කරන්න.' }, { status: 401 })
      }
      const owner = isOwnerEmail(user.email)
      const sessionUser = {
        id: String(user._id),
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        plan: owner ? ('premium' as const) : (user.plan || 'normal'),
        isOwner: owner,
      }
      const token = createSessionToken(sessionUser)
      const res = NextResponse.json({ user: sessionUser })
      res.cookies.set('heshan_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      })
      return res
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Authentication error' }, { status: 500 })
  }
}
