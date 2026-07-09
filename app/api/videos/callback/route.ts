import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/videos/callback
 *
 * The render service (lib/match-video.ts's render handoff) processes each
 * video in the background rather than holding the triggering request open —
 * a render (TTS + FFmpeg + upload) routinely takes 60-90s+, far longer than
 * is reasonable to block an API request on. This is where it reports back
 * once a job actually finishes, success or failure.
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

  const { jobId, status, youtubeVideoId, instagramMediaId, error } = body
  if (!jobId || !status) {
    return NextResponse.json({ error: 'Missing jobId or status' }, { status: 400 })
  }

  try {
    await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        status,
        error: error || null,
        ...(youtubeVideoId && { youtubeVideoId }),
        ...(instagramMediaId && { instagramMediaId }),
      },
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    // Unknown/stale jobId — nothing to update, but this shouldn't be a hard
    // error for the render service (it already did its job either way).
    console.warn('[VideoCallback] Could not update job:', err.message)
    return NextResponse.json({ success: false, warning: err.message })
  }
}
