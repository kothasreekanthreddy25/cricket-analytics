import { NextRequest, NextResponse } from 'next/server'
import { analyzeMatch, getAvailableMatches } from '@/lib/analysis-engine'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const matchKey = request.nextUrl.searchParams.get('match')

  // If no match key, return available matches for analysis
  if (!matchKey) {
    try {
      const matches = await getAvailableMatches()
      return NextResponse.json({ matches })
    } catch (error: any) {
      console.error('Failed to get available matches:', error)
      return NextResponse.json(
        { error: 'Failed to fetch available matches', detail: error.message },
        { status: 500 }
      )
    }
  }

  try {
    // Check for cached analysis (less than 30 minutes old)
    const cached = await prisma.matchAnalysis.findFirst({
      where: {
        matchKey,
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (cached) {
      // Skip cache if it contains generic fallback player names — force fresh analysis
      const ptw = cached.playersToWatch as any
      const allPlayers = [
        ...(ptw?.teamA || []),
        ...(ptw?.teamB || []),
      ]
      const hasGenericPlayers = allPlayers.some(
        (p: any) => typeof p.name === 'string' && (
          p.name.includes('Captain') || p.name.includes('Star Bowler')
        )
      )

      if (!hasGenericPlayers) {
        return NextResponse.json({
          analysis: {
            matchKey: cached.matchKey,
            teamA: cached.teamA,
            teamB: cached.teamB,
            winProbabilityA: cached.winProbabilityA,
            winProbabilityB: cached.winProbabilityB,
            confidence: cached.confidence,
            tips: cached.tips,
            playersToWatch: cached.playersToWatch,
            conditions: cached.conditions,
            recentForm: cached.recentForm,
            reasoning: cached.reasoning,
          },
          cached: true,
        })
      }
    }

    // Run fresh analysis
    const analysis = await analyzeMatch(matchKey)

    // Cache in database
    try {
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
        },
      })
    } catch (dbError) {
      console.warn('Could not cache analysis:', dbError)
    }

    return NextResponse.json({ analysis, cached: false })
  } catch (error: any) {
    console.error('Analysis failed:', error)
    return NextResponse.json(
      { error: 'Analysis failed', detail: error.message },
      { status: 500 }
    )
  }
}
