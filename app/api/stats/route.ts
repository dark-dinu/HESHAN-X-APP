import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ActiveUser, GlobalStats } from '@/models/SiteStats'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const sid = searchParams.get('sid')

    if (sid) {
      await ActiveUser.findOneAndUpdate(
        { sessionId: sid },
        { lastActive: new Date() },
        { upsert: true }
      )
    }

    const [onlineCount, doc] = await Promise.all([
      ActiveUser.countDocuments(),
      GlobalStats.findOneAndUpdate(
        { key: 'main' },
        { $setOnInsert: { key: 'main', totalDownloads: 0 } },
        { upsert: true, new: true }
      ),
    ])

    const cats = doc.categories || {}
    const sum = Object.values(cats).reduce((a: number, b: any) => a + Number(b || 0), 0)

    return NextResponse.json({
      onlineUsers: onlineCount,
      totalDownloads: doc.totalDownloads || 0,
      percentages: {
        tiktok: sum ? Math.round(((cats.tiktok || 0) / sum) * 100) : 0,
        youtube: sum ? Math.round(((cats.youtube || 0) / sum) * 100) : 0,
        instagram: sum ? Math.round(((cats.instagram || 0) / sum) * 100) : 0,
        facebook: sum ? Math.round(((cats.facebook || 0) / sum) * 100) : 0,
      },
    })
  } catch (e: any) {
    return NextResponse.json({
      onlineUsers: 0,
      totalDownloads: 0,
      percentages: { tiktok: 0, youtube: 0, instagram: 0, facebook: 0 },
    })
  }
}

export async function POST(req: Request) {
  try {
    await connectDB()
    const { platform } = await req.json()
    const incObj: Record<string, number> = { totalDownloads: 1 }
    if (platform) incObj[`categories.${platform}`] = 1

    await GlobalStats.findOneAndUpdate(
      { key: 'main' },
      { $inc: incObj },
      { upsert: true }
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
