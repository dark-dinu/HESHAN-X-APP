import { NextResponse } from 'next/server'
import mongoose from 'mongoose'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALL_PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook', 'spotify', 'pinterest', 'x', 'whatsapp']

async function getDb() {
  const m = mongoose as any
  if (m.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI
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

    const counts: Record<string, number> = {}
    let totalDownloads = 0

    for (const p of ALL_PLATFORMS) {
      const val = Number(rawDownloads[p] || 0)
      counts[p] = val
      totalDownloads += val
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const topPlatform = totalDownloads > 0 && sorted[0][1] > 0 ? sorted[0][0] : 'No data yet'

    const percentages: Record<string, number> = {}
    for (const [p, count] of Object.entries(counts)) {
      percentages[p] = totalDownloads > 0 ? Math.round((count / totalDownloads) * 100) : 0
    }

    return NextResponse.json({
      onlineUsers: Math.max(1, onlineUsers),
      totalDownloads,
      topPlatform,
      percentages,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Database connection failed' },
      { status: 500 }
    )
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
      { $inc: { [`downloads.${platform}`]: 1, total: 1 } },
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
