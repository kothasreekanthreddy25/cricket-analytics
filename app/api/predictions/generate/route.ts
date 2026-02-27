import { NextResponse } from 'next/server'
import { analyzeMatch, getAvailableMatches } from '@/lib/analysis-engine'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/predictions/generate
 *
 * Auto-generates predictions for upcoming matches that don't already
 * have recent analysis in the database.
 *
 * Called by:
 *  - Background scheduler (every 6 hours)
 *  - Admin manually
 */
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
    // 1. Get all available matches from Roanuz
    console.log('[PredGen] Fetching available matches...')
    const matches = await getAvailableMatches()

    // 2. Filter to upcoming/live matches only (not completed)
    const upcoming = matches.filter(
      (m: any) =>
        m.status === 'upcoming' ||
        m.status === 'live' ||
        m.status === 'scheduled' ||
        m.status === 'not_started'
    )

    console.log(
      `[PredGen] Found ${upcoming.length} upcoming matches out of ${matches.length} total`
    )

    if (upcoming.length === 0) {
      return NextResponse.json({
        message: 'No upcoming matches found',
        generated: 0,
        skipped: 0,
      })
    }

    // 3. Check which matches already have recent predictions (within 12 hours)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
    const existingRecent = await prisma.matchAnalysis.findMany({
      where: {
        createdAt: { gte: twelveHoursAgo },
      },
      select: { matchKey: true },
    })
    const recentKeys = new Set(existingRecent.map((e) => e.matchKey))

    // 4. Filter to matches that need new predictions
    const needsPrediction = upcoming.filter(
      (m: any) => !recentKeys.has(m.key) && m.name && !m.name.includes('TBC')
    )

    console.log(
      `[PredGen] ${needsPrediction.length} matches need fresh predictions (${upcoming.length - needsPrediction.length} already have recent ones)`
    )

    // 5. Generate predictions
    const results: { match: string; status: string }[] = []
    let generated = 0
    let errors = 0

    for (const match of needsPrediction) {
      try {
        console.log(`[PredGen] Analyzing: ${match.name || match.key}`)
        const analysis = await analyzeMatch(match.key)

        // Save to database
        await prisma.matchAnalysis.create({
          data: {
            matchKey: analysis.matchKey,
            teamA: analysis.teamA,
            teamB: analysis.teamB,
            winProbabilityA: analysis.winProbabilityA,
            winProbabilityB: analysis.winProbabilityB,
            confidence: analysis.confidence,
            tips: analysis.tips as any,
            playersToWatch: analysis.playersToWatch as any,
            conditions: analysis.conditions as any,
            recentForm: analysis.recentForm as any,
            reasoning: analysis.reasoning,
            rawData: {
              date: match.startDateTs || null,
              venue: match.venue || null,
              stage: match.stage || 'Group',
              group: match.group || 'Group Stage',
              status: match.status,
              generatedAt: new Date().toISOString(),
            },
          },
        })

        generated++
        const winner =
          analysis.winProbabilityA >= analysis.winProbabilityB
            ? analysis.teamA
            : analysis.teamB
        results.push({
          match: `${analysis.teamA} vs ${analysis.teamB}`,
          status: `predicted: ${winner} (${Math.max(analysis.winProbabilityA, analysis.winProbabilityB)}%)`,
        })

        // Rate limit — 500ms between analyses
        await new Promise((r) => setTimeout(r, 500))
      } catch (err: any) {
        errors++
        results.push({
          match: match.name || match.key,
          status: `error: ${err.message}`,
        })
        console.error(`[PredGen] Error for ${match.key}:`, err.message)
      }
    }

    console.log(
      `[PredGen] Done — ${generated} generated, ${errors} errors, ${upcoming.length - needsPrediction.length} skipped`
    )

    return NextResponse.json({
      message: `Generated ${generated} predictions`,
      generated,
      errors,
      skipped: upcoming.length - needsPrediction.length,
      total_upcoming: upcoming.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[PredGen] Pipeline error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate predictions' },
      { status: 500 }
    )
  }
}
