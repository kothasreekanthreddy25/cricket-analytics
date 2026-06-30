import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMatchDetails } from '@/lib/sportmonks'

/**
 * POST /api/predictions/update-results
 *
 * Batch-updates all pending predictions with actual match results from Roanuz.
 * Should be called daily via cron or manually from admin dashboard.
 *
 * This ensures the prediction stats widget stays up-to-date even if
 * nobody visits the /predictions page.
 */

async function resolveMatchResult(matchKey: string): Promise<{
  winner: string | null
  status: string
} | null> {
  try {
    const data = await getMatchDetails(matchKey)
    const match = data?.data
    if (!match) return null

    // SportMonks: status is "Finished", "Live", "NS" (not started), etc.
    const matchStatus: string = match.status || ''
    const isFinished = matchStatus === 'Finished' || matchStatus === 'Completed'

    if (!isFinished) {
      return { winner: null, status: matchStatus }
    }

    // SportMonks: winner_team_id matches localteam_id or visitorteam_id
    const winnerId: number | null = match.winner_team_id || null
    const localteam = match.localteam?.data || match.localteam || {}
    const visitorteam = match.visitorteam?.data || match.visitorteam || {}

    if (winnerId) {
      if (winnerId === localteam.id) return { winner: localteam.name || 'Local Team', status: matchStatus }
      if (winnerId === visitorteam.id) return { winner: visitorteam.name || 'Visitor Team', status: matchStatus }
    }

    if (match.draw_noresult) return { winner: null, status: 'no_result' }

    return { winner: null, status: matchStatus }
  } catch {
    return null
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
    // Fetch all analyses that don't have a stored result yet
    const allAnalysis = await prisma.matchAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Deduplicate — keep only latest per matchKey
    const seen = new Set<string>()
    const unique = allAnalysis.filter((a) => {
      if (seen.has(a.matchKey)) return false
      seen.add(a.matchKey)
      return true
    })

    // Filter to only pending ones (no actualWinner stored)
    const pending = unique.filter((a) => {
      const raw = a.rawData as any
      const storedStatus = raw?.matchResultStatus || ''
      return (
        !raw?.actualWinner &&
        storedStatus !== 'no_result' &&
        storedStatus !== 'tie'
      )
    })

    console.log(`[UpdateResults] Found ${pending.length} pending predictions to check`)

    let updated = 0
    let unchanged = 0
    let errors = 0
    const results: { matchKey: string; result: string }[] = []

    for (const analysis of pending) {
      try {
        const matchResult = await resolveMatchResult(analysis.matchKey)
        if (!matchResult) {
          unchanged++
          continue
        }

        const { winner, status } = matchResult

        // Only persist if match is settled
        if (
          winner ||
          status === 'completed' ||
          status === 'finished' ||
          status === 'no_result' ||
          status === 'tie'
        ) {
          const rawData = (analysis.rawData as any) || {}
          await prisma.matchAnalysis.update({
            where: { id: analysis.id },
            data: {
              rawData: {
                ...rawData,
                actualWinner: winner,
                matchResultStatus: status,
                resultUpdatedAt: new Date().toISOString(),
              },
            },
          })
          updated++
          results.push({
            matchKey: analysis.matchKey,
            result: winner || status,
          })
          console.log(
            `[UpdateResults] ${analysis.matchKey}: ${winner || status}`
          )
        } else {
          unchanged++
        }

        // Small delay to avoid SportMonks rate limiting
        await new Promise((r) => setTimeout(r, 300))
      } catch (err: any) {
        errors++
        console.error(
          `[UpdateResults] Error for ${analysis.matchKey}:`,
          err.message
        )
      }
    }

    return NextResponse.json({
      message: `Updated ${updated} predictions`,
      total_pending: pending.length,
      updated,
      unchanged,
      errors,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[UpdateResults] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update results' },
      { status: 500 }
    )
  }
}
