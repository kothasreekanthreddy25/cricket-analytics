import { NextRequest, NextResponse } from 'next/server'
import { analyzeMatch, getAvailableMatches } from '@/lib/analysis-engine'
import { prisma } from '@/lib/prisma'
import { resolveMatchInfo, openaiPreview, getCommentatorIntro, getPredictedXIs, enrichPlayersWithRealStats, buildFantasyXI } from '@/lib/ai-match-preview'

export const dynamic = 'force-dynamic'

// Pitch/player/history facts don't change pre-match — cache the GPT+Gemini
// enrichment for a while so repeat visits to the same match don't re-bill.
const RICH_CACHE_MS = 6 * 60 * 60 * 1000

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
    // Resolve real team/venue/tournament data — this is what was broken:
    // analyzeMatch used to depend entirely on Roanuz (now 403'd), so every
    // match fell back to "Team A" / "Team B" / "Venue TBD" placeholders.
    const info = await resolveMatchInfo(matchKey)
    if (!info) {
      return NextResponse.json(
        { error: 'Match not found', detail: 'Could not resolve team or venue data for this match.' },
        { status: 404 }
      )
    }

    // Win probability + baseline tips from the existing model, seeded with
    // real team data so it never needs its own Roanuz lookups.
    const base = await analyzeMatch(matchKey, {
      teamA: info.teamA,
      teamB: info.teamB,
      venueName: info.venue,
      format: info.format,
    })

    // Reuse a recent cached rich preview (pitch report / players / history /
    // commentary) if one exists for this match, regardless of how old the
    // win-probability row is — those facts are far more stable than the
    // probability, and GPT/Gemini calls are the expensive part.
    const existing = await prisma.matchAnalysis.findFirst({
      where: { matchKey },
      orderBy: { createdAt: 'desc' },
    })
    const existingRaw = (existing?.rawData as any) || {}
    const cachedRich = existingRaw.richPreview
    const cachedAt = existingRaw.richPreviewAt ? new Date(existingRaw.richPreviewAt).getTime() : 0
    const isFresh = !!cachedRich && Date.now() - cachedAt < RICH_CACHE_MS

    let rich = cachedRich
    let richGeneratedAt = existingRaw.richPreviewAt || null

    if (!isFresh) {
      const favourite = base.winProbabilityA >= base.winProbabilityB ? info.teamA : info.teamB
      const winContext = `${favourite} favoured at ${Math.max(base.winProbabilityA, base.winProbabilityB)}% probability. Confidence: ${base.confidence}.`

      // Ground "players to watch" in each team's actual submitted XI instead
      // of asking the model to recall the current squad from memory — this
      // match's own confirmed lineup if the toss has happened, else each
      // team's most recent finished match as a labeled "likely XI".
      const knownXIs = await getPredictedXIs(info.teamAId, info.teamBId, info.ownLineup)

      const [structured, commentator] = await Promise.all([
        openaiPreview(info.teamA, info.teamB, info.tournament, info.venue, info.format, winContext, info.startAt, knownXIs),
        getCommentatorIntro(info.teamA, info.teamB, info.tournament, info.venue, info.format, info.startAt),
      ])

      // Overwrite GPT's guessed keyStats with real SportMonks career figures
      // for any player we resolved via the known XIs.
      const playersToWatch = await enrichPlayersWithRealStats(structured.playersToWatch || [], knownXIs, info.format)

      // Free fantasy XI advisory — fully deterministic, built from the same
      // real lineup + career-stat data, no separate AI call. Renders null
      // (and the UI hides the section) unless both teams have a real lineup.
      const fantasyXI = await buildFantasyXI(knownXIs, info.teamA, info.teamB, info.format, structured.pitchReport)

      rich = {
        pitchReport: structured.pitchReport || {},
        playersToWatch,
        teamHistory: structured.teamHistory || {},
        prediction: structured.prediction || {},
        commentatorIntro: commentator.text,
        commentatorSource: commentator.source,
        lineupSource: { teamA: knownXIs.teamASource, teamB: knownXIs.teamBSource },
        lineupConfirmed: { teamA: knownXIs.teamAConfirmed, teamB: knownXIs.teamBConfirmed },
        fantasyXI,
        dataSources: {
          squads: knownXIs.teamA.length || knownXIs.teamB.length ? 'SportMonks' : 'AI estimate',
          playerStats: 'SportMonks',
          winProbability: 'CricketTips AI Model',
          pitchAndNarrative: commentator.source === 'OpenAI GPT-4o' ? 'OpenAI GPT-4o' : `${commentator.source} + OpenAI GPT-4o`,
        },
      }
      richGeneratedAt = new Date().toISOString()
    }

    // Persist — both to track this analysis view and to cache the rich preview
    try {
      await prisma.matchAnalysis.create({
        data: {
          matchKey,
          teamA: info.teamA,
          teamB: info.teamB,
          winProbabilityA: base.winProbabilityA,
          winProbabilityB: base.winProbabilityB,
          confidence: base.confidence,
          tips: base.tips as any,
          playersToWatch: base.playersToWatch as any,
          conditions: base.conditions as any,
          recentForm: base.recentForm as any,
          reasoning: base.reasoning,
          rawData: {
            ...existingRaw,
            venue: info.venue,
            tournament: info.tournament,
            format: info.format,
            date: info.startAt,
            richPreview: rich,
            richPreviewAt: richGeneratedAt,
          },
        },
      })
    } catch (dbError) {
      console.warn('Could not cache analysis:', dbError)
    }

    return NextResponse.json({
      analysis: {
        matchKey,
        teamA: info.teamA,
        teamB: info.teamB,
        tournament: info.tournament,
        format: info.format,
        venue: info.venue,
        startAt: info.startAt,
        winProbabilityA: base.winProbabilityA,
        winProbabilityB: base.winProbabilityB,
        confidence: base.confidence,
        tips: base.tips,
        reasoning: base.reasoning,
        recentForm: base.recentForm,
        ...rich,
      },
      cached: isFresh,
    })
  } catch (error: any) {
    console.error('Analysis failed:', error)
    return NextResponse.json(
      { error: 'Analysis failed', detail: error.message },
      { status: 500 }
    )
  }
}
