/**
 * GET /api/youtube/match/[matchKey]
 * Returns the YouTube broadcast for a specific match (if one exists).
 * Used by the YouTubePlayer component to auto-embed the stream.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveBroadcasts } from '@/lib/youtube'

export async function GET(
  _req: NextRequest,
  { params }: { params: { matchKey: string } }
) {
  const matchKey = (params?.matchKey ?? '') as string

  try {
    const broadcasts = await getActiveBroadcasts()

    // Find a broadcast whose title contains the matchKey or was created for this match
    const match = broadcasts.find(b =>
      b.snippet?.title?.toLowerCase().includes(matchKey.toLowerCase()) ||
      b.snippet?.description?.includes(matchKey)
    )

    if (!match) {
      return NextResponse.json({ broadcast: null })
    }

    return NextResponse.json({
      broadcast: {
        id: match.id,
        title: match.snippet?.title,
        status: match.status?.lifeCycleStatus,
        watchUrl: `https://www.youtube.com/watch?v=${match.id}`,
        thumbnailUrl: match.snippet?.thumbnails?.high?.url,
      },
    })
  } catch (err: any) {
    // If auth fails (no refresh token yet), return null silently
    if (err.message?.includes('YOUTUBE_REFRESH_TOKEN')) {
      return NextResponse.json({ broadcast: null })
    }
    console.error('[YouTube] Match lookup failed:', err.message)
    return NextResponse.json({ broadcast: null })
  }
}

export const dynamic = 'force-dynamic'
