import { NextResponse } from 'next/server'
import mongoose from 'mongoose'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALL_PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook', 'spotify', 'pinterest', 'x', 'whatsapp']

async function getDb() {
  const m = mongoose as any
  if (m.connection.readyState !== 1) {
    let uri = (process.env.MONGODB_URI || '').trim()
    uri = uri.replace(/^MONGODB_URI\s*=\s*/i, '').replace(/^["']+|["']+$/g, '').trim()

    if (!uri) throw new Error('MONGODB_URI is missing in Render Environment Variables')
    await m.connect(uri, { serverSelectionTimeoutMS: 5000 })
  }
  const db = m.connection.db
  if (!db) throw new Error('Database not connected')
  return db
}

export async function GET(req: Request) {
  try {
    const db = await getDb()
    const { searchParams } = new URL(req.url)
    const sid =
      searchParams.get('sid') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'anonymous'

    const now = new Date()
    const activeCutoff = new Date(now.getTime() - 60_000)

    const presence = db.collection('presence')
    await presence.updateOne({ sid }, { $set: { lastSeen: now } }, { upsert: true })
    await presence.deleteMany({ lastSeen: { $lt: activeCutoff } })
    const onlineUsers = await presence.countDocuments({ lastSeen: { $gte: activeCutoff } })

    const statsCol = db.collection('stats')
    const doc = await statsCol.findOne({ key: 'global' })
    const rawDownloads = (doc?.downloads || {}) as Record<string, number>
    const recent = Array.isArray(doc?.recent) ? doc.recent.slice(0, 8) : []

    const counts: Record<string, number> = {}
    let totalDownloads = 0

    for (const p of ALL_PLATFORMS) {
      const val = Number(rawDownloads[p] || 0)
      counts[p] = val
      totalDownloads += val
    }

    const percentages: Record<string, number> = {}
    for (const [p, count] of Object.entries(counts)) {
      percentages[p] = totalDownloads > 0 ? Math.round((count / totalDownloads) * 100) : 0
    }

    return NextResponse.json({
      db: true,
      onlineUsers: Math.max(1, onlineUsers),
      totalDownloads,
      percentages,
      recent,
    })
  } catch (err: any) {
    return NextResponse.json({
      db: false,
      error: err?.message || 'Database connection failed',
      onlineUsers: 0,
      totalDownloads: 0,
      percentages: {},
      recent: [],
    })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const platform = String(body.platform || '').toLowerCase().trim()

    if (!ALL_PLATFORMS.includes(platform)) {
      return NextResponse.json({ ok: false, error: 'Invalid platform' }, { status: 400 })
    }

    const db = await getDb()
    await db.collection('stats').updateOne(
      { key: 'global' },
      {
        $inc: { [`downloads.${platform}`]: 1, total: 1 },
        $push: {
          recent: {
            $each: [{ p: platform, t: new Date().toISOString() }],
            $position: 0,
            $slice: 10,
          },
        },
      },
      { upsert: true }
    )

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to record download' },
      { status: 500 }
    )
  }
}
