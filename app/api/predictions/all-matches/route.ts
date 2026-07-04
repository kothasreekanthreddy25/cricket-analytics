import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { roanuzGet } from '@/lib/roanuz'
import { analyzeMatch } from '@/lib/analysis-engine'

export const dynamic = 'force-dynamic'

const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'tbd', 'test', 'unknown'])
const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())
const norm = (p: number) => p > 1 ? p / 100 : p

function normaliseProbs(pA: number, pB: number) {
  const a = norm(Math.max(0.01, pA))
  const b = norm(Math.max(0.01, pB))
  const total = a + b
  return {
    probA: total > 0 ? a / total : 0.5,
    probB: total > 0 ? b / total : 0.5,
  }
}

export async function GET() {
  try {
    // 1. Fetch all featured matches from Roanuz (all tournaments)
    const featuredData = await roanuzGet('featured-matches-2/')
    const rawMatches: any[] = featuredData?.data?.matches || []

    // Filter valid matches only
    const validMatches = rawMatches.filter(m =>
      m?.key &&
      m?.teams?.a?.name &&
      m?.teams?.b?.name &&
      !isDummy(m.teams.a.name) &&
      !isDummy(m.teams.b.name)
    )

    if (validMatches.length === 0) {
      // Fall back to DB predictions if Roanuz returns nothing
      return fallbackToDb()
    }

    // 2. Get all existing DB predictions for these match keys
    const matchKeys = validMatches.map(m => m.key)
    const existing = await prisma.matchAnalysis.findMany({
      where: { matchKey: { in: matchKeys } },
      orderBy: { createdAt: 'desc' },
      select: {
        matchKey: true, teamA: true, teamB: true,
        winProbabilityA: true, winProbabilityB: true,
        confidence: true, tips: true, conditions: true, createdAt: true,
      },
    })

    // Keep only latest prediction per matchKey
    const predMap = new Map<string, typeof existing[0]>()
    for (const p of existing) {
      if (!predMap.has(p.matchKey)) predMap.set(p.matchKey, p)
    }

    // 3. Merge matches with predictions — generate missing ones in background
    const results: any[] = []
    const needsGeneration: string[] = []

    for (const m of validMatches) {
      const teamA = m.teams?.a?.name || 'TBD'
      const teamB = m.teams?.b?.name || 'TBD'
      const tournament = m.tournament?.name || m.sub_title || 'Cricket'
      const venue = [m.venue?.name, m.venue?.city].filter(Boolean).join(', ')
      const format = m.format?.toUpperCase() || 'T20'

      let status: string = m.status || 'upcoming'
      if (status === 'started') status = 'live'
      else if (status === 'completed' || m.winner) status = 'completed'
      else if (['not_started', 'scheduled'].includes(status)) status = 'upcoming'

      const startAt = m.start_at ? new Date(m.start_at * 1000).toISOString() : null
      const existing = predMap.get(m.key)

      if (existing) {
        const { probA, probB } = normaliseProbs(existing.winProbabilityA, existing.winProbabilityB)
        const tips = Array.isArray(existing.tips) ? existing.tips : []
        const conditions = existing.conditions as any
        results.push({
          matchKey: m.key,
          teamA,
          teamB,
          tournament,
          format,
          venue,
          status,
          startAt,
          hasPrediction: true,
          probA: Math.round(probA * 100),
          probB: Math.round(probB * 100),
          predictedWinner: probA >= probB ? teamA : teamB,
          winPct: Math.round(Math.max(probA, probB) * 100),
          confidence: existing.confidence,
          tip: tips[0] || null,
          aiOdds: parseFloat((1 / (Math.max(probA, probB) * 1.05)).toFixed(2)),
          venueNote: conditions?.pitchType || null,
          predictionAge: existing.createdAt,
        })
      } else {
        // No prediction yet — show match with basic info, flag for generation
        if (status !== 'completed') needsGeneration.push(m.key)
        results.push({
          matchKey: m.key,
          teamA,
          teamB,
          tournament,
          format,
          venue,
          status,
          startAt,
          hasPrediction: false,
          probA: null,
          probB: null,
          predictedWinner: null,
          winPct: null,
          confidence: null,
          tip: null,
          aiOdds: null,
          venueNote: null,
          predictionAge: null,
        })
      }
    }

    // 4. Trigger background generation for up to 5 matches missing predictions
    if (needsGeneration.length > 0) {
      generateInBackground(needsGeneration.slice(0, 5)).catch(() => {})
    }

    // Sort: live first, then upcoming, completed last
    const order: Record<string, number> = { live: 0, upcoming: 1, completed: 2 }
    results.sort((a, b) => (order[a.status] ?? 1) - (order[b.status] ?? 1))

    return NextResponse.json({ success: true, matches: results, total: results.length })
  } catch (e: any) {
    console.error('[all-matches]', e.message)
    return fallbackToDb()
  }
}

// Generate predictions for matches that don't have one yet
async function generateInBackground(matchKeys: string[]) {
  for (const key of matchKeys) {
    try {
      const analysis = await analyzeMatch(key)
      if (isDummy(analysis.teamA) || isDummy(analysis.teamB)) continue

      await prisma.matchAnalysis.upsert({
        where: { matchKey: key },
        create: {
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
          rawData: { generatedAt: new Date().toISOString() },
        },
        update: {
          teamA: analysis.teamA,
          teamB: analysis.teamB,
          winProbabilityA: analysis.winProbabilityA,
          winProbabilityB: analysis.winProbabilityB,
          confidence: analysis.confidence,
          tips: analysis.tips as any,
          conditions: analysis.conditions as any,
          reasoning: analysis.reasoning,
          rawData: { generatedAt: new Date().toISOString() },
        },
      })
    } catch {}
    await new Promise(r => setTimeout(r, 300))
  }
}

// Fallback: return last 50 DB predictions when Roanuz is unavailable
async function fallbackToDb() {
  const records = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      matchKey: true, teamA: true, teamB: true,
      winProbabilityA: true, winProbabilityB: true,
      confidence: true, tips: true, conditions: true, createdAt: true,
    },
  })

  const seen = new Set<string>()
  const matches = records
    .filter(r => {
      if (isDummy(r.teamA) || isDummy(r.teamB)) return false
      if (seen.has(r.matchKey)) return false
      seen.add(r.matchKey)
      return true
    })
    .map(r => {
      const { probA, probB } = normaliseProbs(r.winProbabilityA, r.winProbabilityB)
      const tips = Array.isArray(r.tips) ? r.tips : []
      const conditions = r.conditions as any
      const tournament = conditions?.tournament || conditions?.format
        ? (conditions.tournament || `${conditions.format || 'T20'} Cricket`)
        : 'Cricket'
      return {
        matchKey: r.matchKey,
        teamA: r.teamA,
        teamB: r.teamB,
        tournament,
        format: conditions?.format || 'T20',
        venue: conditions?.venue || null,
        status: 'upcoming',
        startAt: null,
        hasPrediction: true,
        probA: Math.round(probA * 100),
        probB: Math.round(probB * 100),
        predictedWinner: probA >= probB ? r.teamA : r.teamB,
        winPct: Math.round(Math.max(probA, probB) * 100),
        confidence: r.confidence,
        tip: tips[0] || null,
        aiOdds: parseFloat((1 / (Math.max(probA, probB) * 1.05)).toFixed(2)),
        venueNote: conditions?.pitchType || null,
        predictionAge: r.createdAt,
      }
    })

  return NextResponse.json({ success: true, matches, total: matches.length, source: 'db_fallback' })
}
