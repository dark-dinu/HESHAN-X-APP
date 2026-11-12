import { NextResponse } from 'next/server'
import { MongoClient, Db } from 'mongodb'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALL_PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook', 'spotify', 'pinterest', 'x', 'whatsapp']

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is missing in environment variables')

  cachedClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
  await cachedClient.connect()
  cachedDb = cachedClient.db('heshan_x_app')
  return cachedDb
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
    const activeCutoff = new Date(now.getTime() - 60_000) // තත්පර 60ක් ඇතුළත active users

    // 1. Real Online User presence update කිරීම
    const presence = db.collection('presence')
    await presence.updateOne({ sid }, { $set: { lastSeen: now } }, { upsert: true })
    await presence.deleteMany({ lastSeen: { $lt: activeCutoff } })
    const onlineUsers = await presence.countDocuments({ lastSeen: { $gte: activeCutoff } })

    // 2. Real Download Counts ලබා ගැනීම
    const statsDoc = await db.collection('stats').findOne({ _id: 'global' as any })
    const counts: Record<string, number> = {}
    let totalDownloads = 0

    for (const p of ALL_PLATFORMS) {
      const val = Number(statsDoc?.downloads?.[p] || 0)
      counts[p] = val
      totalDownloads += val
    }

    // වැඩිපුරම download වුණ platform එක (Top Trending)
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const topPlatform = totalDownloads > 0 && sorted[0][1] > 0 ? sorted[0][0] : 'No data yet'

    // Real Percentages ගණනය කිරීම
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
      { _id: 'global' as any },
      {
        $inc: {
          [`downloads.${platform}`]: 1,
          total: 1,
        },
        $set: { updatedAt: new Date() },
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
