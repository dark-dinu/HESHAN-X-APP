import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import ChatMessage from '@/models/ChatMessage'

export const dynamic = 'force-dynamic'

async function getSessionUser(req: Request) {
  try {
    const origin = new URL(req.url).origin
    const res = await fetch(`${origin}/api/auth`, {
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
    // Extra safety filter for messages within last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const messages = await ChatMessage.find({ createdAt: { $gte: since } })
      .sort({ createdAt: 1 })
      .limit(120)
      .lean()
    return NextResponse.json({ messages })
  } catch {
    return NextResponse.json({ error: 'Failed to load chat messages.' }, { status: 500 })
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
    const created = await ChatMessage.create({
      userEmail: String(user.email).toLowerCase(),
      userName: String(user.name || 'User'),
      role,
      text: String(text).trim().slice(0, 500),
      replyTo: replyTo?.id
        ? {
            id: String(replyTo.id),
            userName: String(replyTo.userName || 'User'),
            text: String(replyTo.text || '').slice(0, 120),
          }
        : undefined,
    })

    return NextResponse.json({ message: created })
  } catch {
    return NextResponse.json({ error: 'Could not send message.' }, { status: 500 })
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
    // Owner can delete any message; normal users can delete their own messages
    if (isOwner) {
      await ChatMessage.deleteOne({ _id: id })
    } else {
      await ChatMessage.deleteOne({
        _id: id,
        userEmail: String(user.email).toLowerCase(),
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
