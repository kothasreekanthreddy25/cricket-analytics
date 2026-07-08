import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveMatchInfo } from '@/lib/ai-match-preview'

export const dynamic = 'force-dynamic'

const norm = (p: number) => (p > 1 ? p / 100 : p)

/**
 * GET /api/og/match-data?key=<matchKey>
 *
 * Plain JSON split out of /api/og/match specifically so the image renderer
 * can run on the edge runtime (see that route for why — a real Next.js bug
 * on Windows' Node.js runtime, unrelated to this app's code, breaks
 * next/og's ImageResponse there). Prisma needs the Node.js runtime, so the
 * DB/SportMonks lookup lives here and the edge route fetches this instead
 * of importing prisma directly.
 */
export async function GET(request: NextRequest) {
  const matchKey = request.nextUrl.searchParams.get('key')

  let teamA = 'Team A'
  let teamB = 'Team B'
  let tournament = 'Cricket'
  let probA: number | null = null
  let probB: number | null = null

  if (matchKey) {
    try {
      const cached = await prisma.matchAnalysis.findFirst({
        where: { matchKey },
        orderBy: { createdAt: 'desc' },
      })
      if (cached) {
        teamA = cached.teamA
        teamB = cached.teamB
        const a = norm(cached.winProbabilityA)
        const b = norm(cached.winProbabilityB)
        const total = a + b
        if (total > 0) {
          probA = Math.round((a / total) * 100)
          probB = 100 - probA
        }
        const rawData = (cached.rawData as any) || {}
        tournament = rawData.group || tournament
      } else {
        const info = await resolveMatchInfo(matchKey)
        if (info) {
          teamA = info.teamA
          teamB = info.teamB
          tournament = info.tournament
        }
      }
    } catch (err: any) {
      console.warn('[api/og/match-data] lookup failed:', err.message)
    }
  }

  return NextResponse.json(
    { teamA, teamB, tournament, probA, probB },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } }
  )
}
