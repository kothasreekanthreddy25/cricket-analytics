import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { roanuzGet } from '@/lib/roanuz'

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
    const data = await roanuzGet(`match/${matchKey}/`)
    // Roanuz v5: match data is at data.data (no .match nesting)
    const match = data?.data?.match || data?.data
    if (!match) return null

    const matchStatus: string = match.status || ''

    if (matchStatus !== 'completed' && matchStatus !== 'finished') {
      return { winner: null, status: matchStatus }
    }

    // Roanuz v5: winner is "a" or "b", teams is { a: {...}, b: {...} }
    const winnerSide: string | null = match.winner || null
    const teams = match.teams || {}

    if (winnerSide && teams[winnerSide]) {
      return {
        winner: teams[winnerSide].name || winnerSide,
        status: matchStatus,
      }
    }

    // Fallback: check legacy result object
    const result = match.result || match.match_result || {}
    const winnerKey: string | null =
      result.winner_team_key ||
      result.winner_key ||
      result.winning_team_key ||
      null

    if (winnerKey) {
      if (Array.isArray(teams)) {
        const found = teams.find((t: any) => t.key === winnerKey || t.team_key === winnerKey)
        return { winner: found?.name || winnerKey, status: matchStatus }
      } else {
        for (const side of Object.values(teams) as any[]) {
          if (side?.key === winnerKey) {
            return { winner: side.name || winnerKey, status: matchStatus }
          }
        }
        return { winner: winnerKey, status: matchStatus }
      }
    }

    const playStatus = match.play_status || ''
    if (result.result_type === 'no_result' || result.result_type === 'tie' || playStatus === 'no_result') {
      return { winner: null, status: 'no_result' }
    }

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

        // Small delay to avoid Roanuz rate limiting
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
