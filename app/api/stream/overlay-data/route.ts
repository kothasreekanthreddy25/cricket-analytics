import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Lightweight, DB-only read for the streaming-service's live-overlay
// win-probability banner + player-impact ticker. Deliberately NOT
// /api/analysis — that route can trigger a fresh GPT-4o/Gemini generation
// on a cache miss, which is the wrong shape for something an unattended VPS
// process polls every 60s. This only ever reads whatever's already cached
// on the latest MatchAnalysis row for the match — never generates anything.
export async function GET(request: NextRequest) {
  const matchKey = request.nextUrl.searchParams.get('match')
  if (!matchKey) {
    return NextResponse.json({ available: false }, { status: 400 })
  }

  const existing = await prisma.matchAnalysis.findFirst({
    where: { matchKey },
    orderBy: { createdAt: 'desc' },
  })

  if (!existing) {
    return NextResponse.json({ available: false })
  }

  const raw = (existing.rawData as any) || {}
  const fantasyXI = raw.richPreview?.fantasyXI?.xi
  const topPlayers = Array.isArray(fantasyXI)
    ? [...fantasyXI]
        .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
        .slice(0, 5)
        .map((p: any) => ({
          name: p.name,
          team: p.team,
          value: p.value,
          statLine: p.statLine || null,
        }))
    : []

  return NextResponse.json({
    available: true,
    teamA: existing.teamA,
    teamB: existing.teamB,
    winProbA: Math.round(existing.winProbabilityA),
    winProbB: Math.round(existing.winProbabilityB),
    confidence: existing.confidence,
    topPlayers,
  })
}
