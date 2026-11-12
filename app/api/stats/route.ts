import { NextResponse } from 'next/server'
import mongoose from 'mongoose'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALL_PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook', 'spotify', 'pinterest', 'x', 'whatsapp']

async function connectDB() {
  if (mongoose.connection.readyState === 1) return
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is missing in Render Environment Variables')
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
}

const PresenceSchema = new mongoose.Schema({
  sid: { type: String, unique: true },
  lastSeen: { type: Date, default: Date.now },
})

const StatsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  downloads: { type: Map, of: Number, default: {} },
  total: { type: Number, default: 0 },
})

const Presence = mongoose.models.Presence || mongoose.model('Presence', PresenceSchema)
const Stats = mongoose.models.Stats || mongoose.model('Stats', StatsSchema)

export async function GET(req: Request) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const sid =
      searchParams.get('sid') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'anonymous'

    const now = new Date()
    const activeCutoff = new Date(now.getTime() - 60_000)

    // 1. Real Active Online Users update කිරීම
    await Presence.updateOne({ sid }, { $set: { lastSeen: now } }, { upsert: true })
    await Presence.deleteMany({ lastSeen: { $lt: activeCutoff } })
    const onlineUsers = await Presence.countDocuments({ lastSeen: { $gte: activeCutoff } })

    // 2. Real Download Counts ලබා ගැනීම
    const doc = await Stats.findOne({ key: 'global' }).lean() as any
    const rawDownloads = doc?.downloads || {}

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

    await connectDB()
    await Stats.updateOne(
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
