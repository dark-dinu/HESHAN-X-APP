import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { User, createSessionToken } from '@/lib/auth'

const SUPABASE_URL = 'https://nnrykrraphocccgevvtk.supabase.co'
const SUPABASE_KEY = 'sb_publishable__BEyypvGz3hcwOC0PShF3Q_MuQoYmOf'
const MONGODB_URI = process.env.MONGODB_URI || ''

export async function POST(req: Request) {
  try {
    const { accessToken } = await req.json()
    if (!accessToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_KEY,
      },
    })
    const sbUser = await r.json()
    if (!r.ok || !sbUser?.email) {
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 401 })
    }

    if (mongoose.connection.readyState < 1 && MONGODB_URI) {
      await mongoose.connect(MONGODB_URI)
    }

    const email = sbUser.email.toLowerCase()
    const name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || email.split('@')[0]
    const avatar = sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || ''

    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({ name, email, avatar, provider: 'google' })
    } else if (avatar && !user.avatar) {
      user.avatar = avatar
      await user.save()
    }

    const token = createSessionToken({
      id: String(user._id),
      name: user.name,
      email: user.email,
      avatar: user.avatar || avatar,
    })

    const res = NextResponse.json({ ok: true })
    res.cookies.set('heshan_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Auth error' }, { status: 500 })
  }
}
