/**
 * GET /api/stream/auto-detect
 *
 * Polls the cricket ticker, detects live matches, and automatically
 * creates YouTube Live broadcasts for them.
 *
 * Called by:
 *   - A cron job / external scheduler
 *   - The admin stream dashboard
 *   - Manual trigger when setting up a stream
 *
 * Returns: { live: MatchStreamStatus[], upcomingSoon: MatchStreamStatus[] }
 *
 * POST /api/stream/auto-detect
 * Body: { matchKey, teamA, teamB, matchType?, venue? }
 * Manually trigger a broadcast creation for a specific match.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMatchBroadcast, buildBroadcastTitle, buildBroadcastDescription } from '@/lib/youtube'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

interface TickerMatch {
  key?: string
  id?: string
  teamA: string
  teamB: string
  status: string
  dateTimeGMT?: string
  venue?: string
  matchType?: string
  format?: string
}

export interface MatchStreamStatus {
  matchKey: string
  teamA: string
  teamB: string
  status: string
  scoreboardUrl: string
  broadcastCreated: boolean
  broadcastId?: string
  watchUrl?: string
  rtmpUrl?: string
  streamKey?: string
  error?: string
}

// Simple in-process set to avoid creating duplicate broadcasts per restart
const broadcastedKeys = new Set<string>()

export async function GET() {
  try {
    const res = await fetch(`${BASE}/api/cricket/ticker`, { cache: 'no-store' })
    const json = await res.json()

    const liveMatches: TickerMatch[] = json?.live || []
    const upcomingMatches: TickerMatch[] = (json?.upcoming || []).filter((m: any) => {
      // Flag matches starting within the next 30 minutes
      if (!m.dateTimeGMT) return false
      const diff = new Date(m.dateTimeGMT).getTime() - Date.now()
      return diff > 0 && diff < 30 * 60_000
    })

    const results: MatchStreamStatus[] = []

    // Process live matches — auto-create broadcasts
    for (const m of liveMatches) {
      const key = m.key || m.id || `${m.teamA}-${m.teamB}`
      const scoreboardUrl = `${BASE}/stream/scoreboard?match=${key}`

      if (broadcastedKeys.has(key)) {
        results.push({
          matchKey: key, teamA: m.teamA, teamB: m.teamB, status: 'live',
          scoreboardUrl, broadcastCreated: true,
        })
        continue
      }

      try {
        const title = buildBroadcastTitle(m.teamA, m.teamB, m.format || m.matchType || 'T20')
        const description = buildBroadcastDescription(m.teamA, m.teamB, m.format || m.matchType || 'T20', m.venue || 'TBD')
        const broadcast = await createMatchBroadcast({
          matchKey: key,
          title,
          description,
          scheduledStartTime: new Date().toISOString(),
        })
        broadcastedKeys.add(key)
        results.push({
          matchKey: key, teamA: m.teamA, teamB: m.teamB, status: 'live',
          scoreboardUrl, broadcastCreated: true,
          broadcastId: broadcast.broadcastId,
          watchUrl: broadcast.watchUrl,
          rtmpUrl: broadcast.rtmpUrl,
          streamKey: broadcast.streamKey,
        })
      } catch (err: any) {
        results.push({
          matchKey: key, teamA: m.teamA, teamB: m.teamB, status: 'live',
          scoreboardUrl, broadcastCreated: false,
          error: err.message,
        })
      }
    }

    // Process upcoming soon — just report, don't create yet
    const upcomingSoon: MatchStreamStatus[] = upcomingMatches.map(m => {
      const key = m.key || m.id || `${m.teamA}-${m.teamB}`
      return {
        matchKey: key, teamA: m.teamA, teamB: m.teamB, status: 'upcoming_soon',
        scoreboardUrl: `${BASE}/stream/scoreboard?match=${key}`,
        broadcastCreated: false,
      }
    })

    return NextResponse.json({
      success: true,
      live: results,
      upcomingSoon,
      checkedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { matchKey, teamA, teamB, matchType = 'T20', venue = 'TBD' } = body

    if (!matchKey || !teamA || !teamB) {
      return NextResponse.json(
        { error: 'matchKey, teamA, teamB are required' },
        { status: 400 }
      )
    }

    const title = buildBroadcastTitle(teamA, teamB, matchType)
    const description = buildBroadcastDescription(teamA, teamB, matchType, venue)

    const broadcast = await createMatchBroadcast({
      matchKey,
      title,
      description,
      scheduledStartTime: new Date().toISOString(),
    })

    broadcastedKeys.add(matchKey)

    return NextResponse.json({
      success: true,
      matchKey,
      scoreboardUrl: `${BASE}/stream/scoreboard?match=${matchKey}`,
      broadcast: {
        broadcastId: broadcast.broadcastId,
        watchUrl: broadcast.watchUrl,
        rtmpUrl: broadcast.rtmpUrl,
        streamKey: broadcast.streamKey,
        rtmpFull: `${broadcast.rtmpUrl}/${broadcast.streamKey}`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
