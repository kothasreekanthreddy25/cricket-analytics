/**
 * YouTube Broadcast API
 *
 * POST /api/youtube/broadcast   — Create a new live broadcast for a match
 * GET  /api/youtube/broadcast   — List active/upcoming broadcasts
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  createMatchBroadcast,
  getActiveBroadcasts,
  buildBroadcastTitle,
  buildBroadcastDescription,
} from '@/lib/youtube'

// ─── POST: Create broadcast ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { matchKey, teamA, teamB, matchType, venue, scheduledStartTime } = body

    if (!matchKey || !teamA || !teamB) {
      return NextResponse.json(
        { error: 'matchKey, teamA, teamB are required' },
        { status: 400 }
      )
    }

    const title = buildBroadcastTitle(teamA, teamB, matchType || 'T20')
    const description = buildBroadcastDescription(teamA, teamB, matchType || 'T20', venue || 'TBD')
    const startTime = scheduledStartTime || new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const broadcast = await createMatchBroadcast({
      matchKey,
      title,
      description,
      scheduledStartTime: startTime,
    })

    console.log(`[YouTube] Broadcast created for ${matchKey}: ${broadcast.watchUrl}`)

    return NextResponse.json({
      success: true,
      broadcast,
      rtmpFull: `${broadcast.rtmpUrl}/${broadcast.streamKey}`,
    })
  } catch (err: any) {
    console.error('[YouTube] Create broadcast failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── GET: List active broadcasts ──────────────────────────────────────────────

export async function GET() {
  try {
    const broadcasts = await getActiveBroadcasts()
    return NextResponse.json({
      success: true,
      broadcasts: broadcasts.map(b => ({
        id: b.id,
        title: b.snippet?.title,
        status: b.status?.lifeCycleStatus,
        scheduledStart: b.snippet?.scheduledStartTime,
        watchUrl: `https://www.youtube.com/watch?v=${b.id}`,
        thumbnailUrl: b.snippet?.thumbnails?.high?.url,
      })),
    })
  } catch (err: any) {
    console.error('[YouTube] List broadcasts failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
