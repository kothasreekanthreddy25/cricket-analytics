/**
 * Prediction generation pipeline.
 *
 * Called directly by the background scheduler (lib/scheduler.ts) and by the
 * /api/predictions/generate route. Runs in-process — no HTTP self-calls.
 *
 * Match discovery tries Roanuz first, then falls back to SportMonks. The
 * Roanuz plan currently returns 403 (A-403-0 "Access is limited to specific
 * user groups"), and the rest of the site already runs on SportMonks, so the
 * fallback is the effective primary path until Roanuz access is restored.
 */

import { analyzeMatch, getAvailableMatches } from './analysis-engine'
import { getFeaturedMatches, normalizeSportMonksMatch } from './sportmonks'
import { prisma } from './prisma'

interface CandidateMatch {
  key: string
  name: string
  status: string
  teamA: string
  teamB: string
  venue: string
  format: string
  tournament: string
  startDate: string | null
}

async function discoverUpcomingMatches(): Promise<CandidateMatch[]> {
  // 1. Roanuz (original source)
  try {
    const matches = await getAvailableMatches()
    const upcoming = matches.filter((m: any) =>
      ['upcoming', 'live', 'scheduled', 'not_started'].includes(m.status)
    )
    if (upcoming.length > 0) {
      console.log(`[PredGen] Roanuz discovery: ${upcoming.length} upcoming matches`)
      return upcoming.map((m: any) => ({
        key: m.key,
        name: m.name || `${m.teams?.a?.name} vs ${m.teams?.b?.name}`,
        status: m.status,
        teamA: m.teams?.a?.name || 'TBD',
        teamB: m.teams?.b?.name || 'TBD',
        venue: m.venue?.name || m.venue || '',
        format: m.format || 'T20',
        tournament: m.tournament?.name || m.tournament || '',
        startDate: m.startDateTs || null,
      }))
    }
  } catch (e: any) {
    console.warn('[PredGen] Roanuz discovery failed:', e.message)
  }

  // 2. SportMonks fallback — same source the live site uses
  const res = await getFeaturedMatches()
  const normalized = (res?.data || [])
    .map(normalizeSportMonksMatch)
    .filter((m): m is NonNullable<typeof m> => !!m)
    .filter(m => m.status === 'upcoming' || m.status === 'live')

  console.log(`[PredGen] SportMonks discovery: ${normalized.length} upcoming matches`)
  return normalized.map(m => ({
    key: m.key,
    name: m.name,
    status: m.status,
    teamA: m.teamA,
    teamB: m.teamB,
    venue: m.venue,
    format: m.matchType,
    tournament: m.tournament,
    startDate: m.dateTimeGMT || null,
  }))
}

export async function runPredictionGeneration() {
  console.log('[PredGen] Fetching available matches...')
  const upcoming = await discoverUpcomingMatches()

  if (upcoming.length === 0) {
    return { message: 'No upcoming matches found', generated: 0, skipped: 0, errors: 0, results: [], total_upcoming: 0, timestamp: new Date().toISOString() }
  }

  // Skip matches that already have a recent prediction (within 12 hours)
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
  const existingRecent = await prisma.matchAnalysis.findMany({
    where: { createdAt: { gte: twelveHoursAgo } },
    select: { matchKey: true },
  })
  const recentKeys = new Set(existingRecent.map((e) => e.matchKey))

  const needsPrediction = upcoming.filter(
    (m) => !recentKeys.has(m.key) && m.teamA !== 'TBD' && m.teamB !== 'TBD' && !m.name.includes('TBC')
  )

  console.log(
    `[PredGen] ${needsPrediction.length} matches need fresh predictions (${upcoming.length - needsPrediction.length} already have recent ones)`
  )

  const results: { match: string; status: string }[] = []
  let generated = 0
  let errors = 0

  for (const match of needsPrediction) {
    try {
      console.log(`[PredGen] Analyzing: ${match.name}`)
      const analysis = await analyzeMatch(match.key, {
        teamA: match.teamA,
        teamB: match.teamB,
        venueName: match.venue,
        format: match.format,
      })

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
            date: match.startDate,
            venue: match.venue || null,
            stage: 'Group',
            group: match.tournament || 'Group Stage',
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
      results.push({ match: match.name, status: `error: ${err.message}` })
      console.error(`[PredGen] Error for ${match.key}:`, err.message)
    }
  }

  console.log(`[PredGen] Done — ${generated} generated, ${errors} errors, ${upcoming.length - needsPrediction.length} skipped`)

  return {
    message: `Generated ${generated} predictions`,
    generated,
    errors,
    skipped: upcoming.length - needsPrediction.length,
    total_upcoming: upcoming.length,
    results,
    timestamp: new Date().toISOString(),
  }
}
