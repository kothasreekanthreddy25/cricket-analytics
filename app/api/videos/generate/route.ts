import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runDailyVideoGeneration, isVideoPipelineConfigured } from '@/lib/match-video'

export const dynamic = 'force-dynamic'

/**
 * POST /api/videos/generate — manually run the daily match-preview video
 * pipeline (script generation + optional render handoff). Same secret gating
 * as /api/blog/generate: only enforced in production when the secret is set.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const secret = body.secret || req.headers.get('x-api-secret')

  if (
    process.env.NODE_ENV === 'production' &&
    process.env.VIDEO_GENERATE_SECRET &&
    secret !== process.env.VIDEO_GENERATE_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isVideoPipelineConfigured()) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured — video pipeline is inactive' },
      { status: 503 }
    )
  }

  try {
    const result = await runDailyVideoGeneration()
    return NextResponse.json({
      message: `${result.created} script(s) created, ${result.skipped} skipped, ${result.failed} failed`,
      ...result,
    })
  } catch (err: any) {
    console.error('[VideoGen] Pipeline error:', err)
    return NextResponse.json({ error: err.message || 'Pipeline failed' }, { status: 500 })
  }
}

/**
 * GET /api/videos/generate — recent video jobs with status, for the admin
 * dashboard and for checking pipeline health without triggering a run.
 */
export async function GET() {
  try {
    const jobs = await prisma.videoJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, matchKey: true, kind: true, teamA: true, teamB: true,
        tournament: true, matchDate: true, title: true, status: true,
        error: true, youtubeVideoId: true, instagramMediaId: true, createdAt: true,
      },
    })
    return NextResponse.json({ configured: isVideoPipelineConfigured(), jobs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
