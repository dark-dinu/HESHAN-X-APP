import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { User, createSessionToken, isOwnerEmail } from '@/lib/auth'

const MONGODB_URI = process.env.MONGODB_URI || ''
const FIREBASE_API_KEY = 'AIzaSyCcvPQLZ2oBm3YUISuuW2rraBVB_lK7ktc'

async function ensureDb() {
  if (mongoose.connection.readyState >= 1) return
  if (!MONGODB_URI) throw new Error('MONGODB_URI is missing')
  await mongoose.connect(MONGODB_URI)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const idToken = String(body.idToken || '').trim()
    if (!idToken) {
      return NextResponse.json({ error: 'Missing Firebase token' }, { status: 400 })
    }

    // Verify Firebase ID token via Google Identity Toolkit
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    )
    const verifyData = await verifyRes.json()
    const fbUser = verifyData?.users?.[0]

    if (!verifyRes.ok || !fbUser?.email) {
      return NextResponse.json({ error: 'Google ගිණුම තහවුරු කිරීමට නොහැකි විය.' }, { status: 401 })
    }

    const email = String(fbUser.email).trim().toLowerCase()
    const name = String(fbUser.displayName || email.split('@')[0]).trim()
    const avatar = String(fbUser.photoUrl || '').trim()
    const owner = isOwnerEmail(email)

    await ensureDb()

    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({
        name,
        email,
        avatar,
        provider: 'google',
        plan: owner ? 'premium' : 'normal',
      })
    } else {
      let changed = false
      if (avatar && user.avatar !== avatar) {
        user.avatar = avatar
        changed = true
      }
      if (owner && user.plan !== 'premium') {
        user.plan = 'premium'
        changed = true
      }
      if (changed) await user.save()
    }

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
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Google Sign-in failed' }, { status: 500 })
  }
}
