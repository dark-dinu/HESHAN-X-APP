import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ChatMessage from '@/models/ChatMessage'

export const dynamic = 'force-dynamic'

async function getSessionUser(req: Request) {
  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = host ? `${proto}://${host}` : new URL(req.url).origin

    const res = await fetch(`${baseUrl}/api/auth`, {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    })
    const data = await res.json()
    return data?.user || null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    await connectDB()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const messages = await ChatMessage.find({ createdAt: { $gte: since } })
      .sort({ createdAt: 1 })
      .limit(120)
      .lean()
    return NextResponse.json({ messages })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to load chat messages.' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser(req)
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Please Sign In to send messages.' },
        { status: 401 }
      )
    }

    const { text, replyTo } = await req.json()
    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 })
    }

    const isOwner =
      user.isOwner || String(user.email).toLowerCase() === 'damiyamalinda@gmail.com'
    const role = isOwner ? 'owner' : user.plan === 'premium' ? 'premium' : 'normal'

    await connectDB()

    const docData: any = {
      userEmail: String(user.email).toLowerCase(),
      userName: String(user.name || 'User'),
      role,
      text: String(text).trim().slice(0, 500),
    }

    if (replyTo && replyTo.id) {
      docData.replyTo = {
        id: String(replyTo.id),
        userName: String(replyTo.userName || 'User'),
        text: String(replyTo.text || '').slice(0, 120),
      }
    }

    const created = await ChatMessage.create(docData)

    return NextResponse.json({ message: created })
  } catch (err: any) {
    console.error('CHAT POST ERROR:', err)
    return NextResponse.json(
      { error: err?.message || 'Could not send message.' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser(req)
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    const isOwner =
      user.isOwner || String(user.email).toLowerCase() === 'damiyamalinda@gmail.com'

    await connectDB()
    if (isOwner) {
      await ChatMessage.deleteOne({ _id: id })
    } else {
      await ChatMessage.deleteOne({
        _id: id,
        userEmail: String(user.email).toLowerCase(),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Delete failed' },
      { status: 500 }
    )
  }
}
