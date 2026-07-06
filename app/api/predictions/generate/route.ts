import { NextResponse } from 'next/server'
import { runPredictionGeneration } from '@/lib/prediction-generator'

/**
 * GET/POST /api/predictions/generate
 *
 * Auto-generates predictions for upcoming matches that don't already
 * have recent analysis in the database.
 *
 * Called by:
 *  - Admin / external cron (the background scheduler calls
 *    runPredictionGeneration directly, not over HTTP)
 */

// GET — called by external cron
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.BLOG_GENERATE_SECRET &&
    secret !== process.env.BLOG_GENERATE_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runPredictionGeneration()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[PredGen] Pipeline error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate predictions' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // Simple auth check
  const body = await req.json().catch(() => ({}))
  const secret = body.secret || req.headers.get('x-api-secret')
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.BLOG_GENERATE_SECRET &&
    secret !== process.env.BLOG_GENERATE_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runPredictionGeneration()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[PredGen] Pipeline error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate predictions' },
      { status: 500 }
    )
  }
}
