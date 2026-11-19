import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import mongoose from 'mongoose'
import { User, verifySessionToken, isOwnerEmail } from '@/lib/auth'

const MONGODB_URI = process.env.MONGODB_URI || ''

async function ensureDb() {
  if (mongoose.connection.readyState >= 1) return
  if (!MONGODB_URI) throw new Error('MONGODB_URI is missing')
  await mongoose.connect(MONGODB_URI)
}

async function checkOwner() {
  const cookieStore = await cookies()
  const token = cookieStore.get('heshan_session')?.value
  const user = verifySessionToken(token)
  if (!user || !isOwnerEmail(user.email)) return null
  return user
}

export async function GET() {
  const owner = await checkOwner()
  if (!owner) {
    return NextResponse.json({ error: 'Unauthorized: Owner access only' }, { status: 403 })
  }

  try {
    await ensureDb()
    const users = await User.find({}, { name: 1, email: 1, plan: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    return NextResponse.json({
      users: users.map((u: any) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        plan: isOwnerEmail(u.email) ? 'premium' : (u.plan || 'normal'),
        isOwner: isOwnerEmail(u.email),
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load users' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const owner = await checkOwner()
  if (!owner) {
    return NextResponse.json({ error: 'Unauthorized: Owner access only' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    const plan = body.plan === 'premium' ? 'premium' : 'normal'

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'වලංගු Email ලිපිනයක් ඇතුළත් කරන්න.' }, { status: 400 })
    }
    if (isOwnerEmail(email)) {
      return NextResponse.json({ error: 'Owner ගිණුම සැමවිටම Premium වේ.' }, { status: 400 })
    }

    await ensureDb()
    const updated = await User.findOneAndUpdate(
      { email },
      { $set: { plan } },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json(
        { error: 'මෙම Email ලිපිනය Database එකේ නැත. User මුලින් Register විය යුතුයි.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: String(updated._id),
        name: updated.name,
        email: updated.email,
        plan: updated.plan,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Update failed' }, { status: 500 })
  }
}
