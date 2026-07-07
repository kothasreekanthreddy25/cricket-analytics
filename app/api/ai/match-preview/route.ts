import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFeaturedMatches, normalizeSportMonksMatch } from '@/lib/sportmonks'
import { isDummy, openaiPreview, getCommentatorIntro, getPredictedXIs, enrichPlayersWithRealStats } from '@/lib/ai-match-preview'

export const dynamic = 'force-dynamic'

const norm = (p: number) => p > 1 ? p / 100 : p

interface MatchSlot {
  teamA: string; teamB: string; matchKey: string
  tournament: string; venue: string; format: string
  startAt?: string | null
  teamAId?: number | null
  teamBId?: number | null
}

// ── Step 1: get upcoming matches (real API first, DB fallback) ─────────────────
async function getUpcomingMatches(): Promise<MatchSlot[]> {
  // Try SportMonks for real upcoming matches
  try {
    const data = await getFeaturedMatches()
    const raw = (data?.data || []).map(normalizeSportMonksMatch).filter(Boolean) as any[]
    const upcoming = raw
      .filter((m: any) => m.status === 'upcoming' && !isDummy(m.teamA) && !isDummy(m.teamB))
      .map((m: any) => ({
        teamA: m.teamA,
        teamB: m.teamB,
        matchKey: m.key,
        tournament: m.tournament || 'Cricket',
        venue: m.venue || '',
        format: m.matchType || 'T20',
        startAt: m.dateTimeGMT || null,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
      }))
    if (upcoming.length > 0) return upcoming.slice(0, 5)
  } catch {}

  // Fallback: pick 5 distinct-tournament international matches from DB
  const records = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 80,
    select: { matchKey: true, teamA: true, teamB: true, conditions: true },
  })

  const seenKeys = new Set<string>()
  const seenTournaments = new Set<string>()
  const results: MatchSlot[] = []

  // First pass: one match per tournament, skip domestic/maharaja
  for (const r of records) {
    if (isDummy(r.teamA) || isDummy(r.teamB)) continue
    if (seenKeys.has(r.matchKey)) continue
    seenKeys.add(r.matchKey)

    const cond = (r.conditions as any) || {}
    const tournament: string = cond.tournament || ''
    const tLower = tournament.toLowerCase()
    if (tLower.includes('maharaja') || tLower.includes('domestic')) continue
    if (seenTournaments.has(tournament)) continue
    seenTournaments.add(tournament)

    results.push({ teamA: r.teamA, teamB: r.teamB, matchKey: r.matchKey, tournament, venue: cond.venue || '', format: cond.format || 'T20' })
    if (results.length >= 5) break
  }

  // Second pass: fill remaining slots with any non-dummy non-seen records
  if (results.length < 3) {
    for (const r of records) {
      if (isDummy(r.teamA) || isDummy(r.teamB)) continue
      if (seenKeys.has(r.matchKey)) continue
      seenKeys.add(r.matchKey)
      const cond = (r.conditions as any) || {}
      results.push({ teamA: r.teamA, teamB: r.teamB, matchKey: r.matchKey, tournament: cond.tournament || 'Cricket', venue: cond.venue || '', format: cond.format || 'T20' })
      if (results.length >= 3) break
    }
  }

  return results
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const upcomingMatches = await getUpcomingMatches()

    if (upcomingMatches.length === 0) {
      return NextResponse.json({ success: true, previews: [] })
    }

    // Preview top 3 matches — sequential to avoid rate limits
    const toPreview = upcomingMatches.slice(0, 3)

    // Get stored win probabilities from DB for these matches
    const matchKeys = toPreview.map(m => m.matchKey)
    const dbPredictions = await prisma.matchAnalysis.findMany({
      where: { matchKey: { in: matchKeys } },
      orderBy: { createdAt: 'desc' },
      select: { matchKey: true, winProbabilityA: true, winProbabilityB: true, confidence: true, tips: true },
    })
    // Keep most recent per matchKey
    const predMap = new Map<string, typeof dbPredictions[0]>()
    for (const p of dbPredictions) {
      if (!predMap.has(p.matchKey)) predMap.set(p.matchKey, p)
    }

    // Generate previews sequentially (avoids GPT rate limit + ensures distinct responses)
    const previews: any[] = []
    for (const m of toPreview) {
      const stored = predMap.get(m.matchKey)
      let probA = 55, probB = 45
      let confidence = 'MEDIUM'

      if (stored) {
        const pA = norm(stored.winProbabilityA), pB = norm(stored.winProbabilityB)
        const t = pA + pB
        probA = Math.round((pA / t) * 100)
        probB = 100 - probA
        confidence = stored.confidence
      }

      const favourite = probA > probB ? m.teamA : m.teamB
      const winContext = `${favourite} are favourites at ${Math.max(probA, probB)}% probability. Confidence: ${confidence}.`

      // Ground "players to watch" in each team's actual last submitted XI
      // instead of asking the model to recall the current squad from memory.
      // (These are all genuinely upcoming matches, so there's never a "toss
      // has happened" confirmed lineup available yet — always tier 2.)
      const knownXIs = await getPredictedXIs(m.teamAId, m.teamBId)

      const [structured, commentator] = await Promise.all([
        openaiPreview(m.teamA, m.teamB, m.tournament, m.venue, m.format, winContext, m.startAt, knownXIs),
        getCommentatorIntro(m.teamA, m.teamB, m.tournament, m.venue, m.format, m.startAt),
      ])

      const playersToWatch = await enrichPlayersWithRealStats(structured.playersToWatch || [], knownXIs, m.format)

      previews.push({
        matchKey: m.matchKey,
        teamA: m.teamA,
        teamB: m.teamB,
        tournament: m.tournament,
        format: m.format,
        venue: m.venue,
        startAt: m.startAt || null,
        probA,
        probB,
        confidence,
        commentatorIntro: commentator.text,
        commentatorSource: commentator.source,
        lineupSource: { teamA: knownXIs.teamASource, teamB: knownXIs.teamBSource },
        lineupConfirmed: { teamA: knownXIs.teamAConfirmed, teamB: knownXIs.teamBConfirmed },
        dataSources: {
          squads: knownXIs.teamA.length || knownXIs.teamB.length ? 'SportMonks' : 'AI estimate',
          playerStats: 'SportMonks',
          winProbability: 'CricketTips AI Model',
          pitchAndNarrative: commentator.source === 'OpenAI GPT-4o' ? 'OpenAI GPT-4o' : `${commentator.source} + OpenAI GPT-4o`,
        },
        pitchReport: structured.pitchReport || {},
        playersToWatch,
        teamHistory: structured.teamHistory || {},
        recentForm: structured.recentForm || {},
        prediction: {
          ...structured.prediction,
          winnerProbPct: structured.prediction?.winner === m.teamA ? probA : probB,
        },
      })
    }

    return NextResponse.json({ success: true, previews })
  } catch (e: any) {
    console.error('[match-preview]', e.message)
    return NextResponse.json({ success: false, previews: [], error: e.message }, { status: 500 })
  }
}
