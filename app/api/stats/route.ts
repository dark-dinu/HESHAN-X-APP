import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ActiveUser, GlobalStats } from '@/models/SiteStats'
import { PLATFORM_IDS } from '@/config/platforms'

export const dynamic = 'force-dynamic'

const empty = { db: false, onlineUsers: 0, totalDownloads: 0, categories: {}, percentages: {}, recent: [] }

export async function GET(req: Request) {
  try {
    await connectDB()
    const sid = new URL(req.url).searchParams.get('sid')
    if (sid && /^[\w-]{6,40}$/.test(sid)) {
      await ActiveUser.updateOne({ sessionId: sid }, { $set: { lastActive: new Date() } }, { upsert: true })
    }

    const [online, doc] = await Promise.all([
      ActiveUser.countDocuments({ lastActive: { $gte: new Date(Date.now() - 35000) } }),
      GlobalStats.findOneAndUpdate(
        { key: 'main' },
        { $setOnInsert: { key: 'main', totalDownloads: 0 } },
        { upsert: true, new: true, lean: true }
      ),
    ])

    const cats: Record<string, number> = (doc as any)?.categories || {}
    const sum = Object.values(cats).reduce((a, b) => a + Number(b || 0), 0)
    const percentages: Record<string, number> = {}
    for (const id of PLATFORM_IDS) percentages[id] = sum ? Math.round(((cats[id] || 0) / sum) * 100) : 0

    return NextResponse.json({
      db: true,
      onlineUsers: online,
      totalDownloads: (doc as any)?.totalDownloads || 0,
      categories: cats,
      percentages,
      recent: ((doc as any)?.recent || []).slice(-6).reverse(),
    })
  } catch {
    return NextResponse.json(empty)
  }
}

// Called when the user actually clicks "Save File"
export async function POST(req: Request) {
  try {
    const { platform } = await req.json()
    if (!PLATFORM_IDS.includes(platform)) return NextResponse.json({ ok: false }, { status: 400 })
    await connectDB()
    await GlobalStats.updateOne(
      { key: 'main' },
      {
        $inc: { totalDownloads: 1, [`categories.${platform}`]: 1 },
        $push: { recent: { $each: [{ p: platform, t: new Date() }], $slice: -8 } },
      },
      { upsert: true }
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
