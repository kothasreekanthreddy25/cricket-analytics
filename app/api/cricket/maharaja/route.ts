import { NextRequest, NextResponse } from 'next/server'
import { searchLeagues, getLeagueSeasons, getHistoricalFixtures, normalizeSportMonksMatch } from '@/lib/sportmonks'
import { trainModel, getModel, MatchFeatures } from '@/lib/tf-model'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

// Known Maharaja Trophy league IDs on SportMonks (KSCA T20 / Maharaja Trophy)
// We'll discover dynamically first, then fall back to these
const KNOWN_MAHARAJA_LEAGUE_IDS = ['114', '3466']

// Venue conditions for Karnataka (spin-friendly, India)
const KARNATAKA_PITCH = 0.75

function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_').replace(/[^a-z_]/g, '')
}

function buildFeatures(
  teamA: string,
  teamB: string,
  teamStats: Record<string, { elo: number; winRate: number; momentum: number; batStrength: number; bowlStrength: number }>,
  h2hRecords: Record<string, { aWins: number; bWins: number }>,
): MatchFeatures {
  const normA = normalizeTeamName(teamA)
  const normB = normalizeTeamName(teamB)

  const statsA = teamStats[normA]
  const statsB = teamStats[normB]

  const getEloNorm = (stats: typeof statsA) =>
    stats ? Math.max(0, Math.min(1, (stats.elo - 1200) / 600)) : 0.5

  const keyAB = `${normA}_vs_${normB}`
  const keyBA = `${normB}_vs_${normA}`
  let h2h = 0.5
  if (h2hRecords[keyAB]) {
    const r = h2hRecords[keyAB]
    const t = r.aWins + r.bWins
    h2h = t > 0 ? r.aWins / t : 0.5
  } else if (h2hRecords[keyBA]) {
    const r = h2hRecords[keyBA]
    const t = r.aWins + r.bWins
    h2h = t > 0 ? r.bWins / t : 0.5
  }

  return {
    teamARanking: getEloNorm(statsA),
    teamBRanking: getEloNorm(statsB),
    teamARecentWinRate: statsA?.winRate ?? 0.5,
    teamBRecentWinRate: statsB?.winRate ?? 0.5,
    h2hTeamAWinRate: h2h,
    isHome: 0.5,
    pitchType: KARNATAKA_PITCH,
    formatFactor: 1, // T20
    teamAMomentum: statsA?.momentum ?? 0.5,
    teamBMomentum: statsB?.momentum ?? 0.5,
    teamABattingStrength: statsA?.batStrength ?? 0.5,
    teamBBattingStrength: statsB?.batStrength ?? 0.5,
    teamABowlingStrength: statsA?.bowlStrength ?? 0.5,
    teamBBowlingStrength: statsB?.bowlStrength ?? 0.5,
  }
}

function updateElo(
  winnerElo: number,
  loserElo: number,
  K = 32,
): { winnerNew: number; loserNew: number } {
  const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400))
  return {
    winnerNew: winnerElo + K * (1 - expected),
    loserNew: loserElo + K * (0 - (1 - expected)),
  }
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('mode') || 'predict'

  try {
    // --- Step 1: Discover Maharaja Trophy leagues ---
    let leagueIds: string[] = [...KNOWN_MAHARAJA_LEAGUE_IDS]

    try {
      const searchRes = await searchLeagues('Maharaja')
      const found = searchRes?.data || []
      const foundIds = found
        .filter((l: any) => /maharaja|ksca/i.test(l.name || ''))
        .map((l: any) => String(l.id))
      if (foundIds.length > 0) {
        leagueIds = [...new Set([...foundIds, ...leagueIds])]
      }
    } catch (e) {
      console.warn('League search failed, using known IDs:', e)
    }

    // --- Step 2: Fetch historical fixtures from all Maharaja leagues ---
    const allFixtures: any[] = []
    for (const lid of leagueIds) {
      try {
        const res = await getHistoricalFixtures(lid)
        const fixtures = res?.data || []
        allFixtures.push(...fixtures)
      } catch (e) {
        // league might not exist on this plan — skip
      }
    }

    if (allFixtures.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No Maharaja Trophy fixtures found on SportMonks. The league may not be in your subscription plan.',
        leaguesSearched: leagueIds,
      })
    }

    // --- Step 3: Separate completed vs upcoming ---
    const completed = allFixtures.filter(m =>
      m.status === 'Finished' || m.winner_team_id || m.draw_noresult
    )
    const upcoming = allFixtures.filter(m =>
      m.live === true || (!m.winner_team_id && !m.draw_noresult && m.status !== 'Finished')
    )

    console.log(`[Maharaja] Found ${completed.length} completed, ${upcoming.length} upcoming fixtures`)

    // --- Step 4: Build team stats from completed matches (Elo + win rate + H2H) ---
    const teamStats: Record<string, { elo: number; winRate: number; momentum: number; batStrength: number; bowlStrength: number; wins: number; losses: number }> = {}
    const h2hRecords: Record<string, { aWins: number; bWins: number }> = {}

    const getOrInit = (name: string) => {
      const key = normalizeTeamName(name)
      if (!teamStats[key]) {
        teamStats[key] = { elo: 1500, winRate: 0.5, momentum: 0.5, batStrength: 0.5, bowlStrength: 0.5, wins: 0, losses: 0 }
      }
      return key
    }

    // Build training data from completed matches
    const trainingData: { features: MatchFeatures; winner: 'A' | 'B' }[] = []

    // Sort by date so Elo updates sequentially
    const sorted = [...completed].sort((a, b) => {
      const aDate = new Date(a.starting_at || 0).getTime()
      const bDate = new Date(b.starting_at || 0).getTime()
      return aDate - bDate
    })

    for (const m of sorted) {
      const teamA = m.localteam?.data || m.localteam || {}
      const teamB = m.visitorteam?.data || m.visitorteam || {}
      const teamAName = teamA.name || ''
      const teamBName = teamB.name || ''
      if (!teamAName || !teamBName) continue

      const keyA = getOrInit(teamAName)
      const keyB = getOrInit(teamBName)

      // Capture features BEFORE this match (pre-match state)
      const preFeatures = buildFeatures(teamAName, teamBName, teamStats as any, h2hRecords)

      // Determine winner
      let winner: 'A' | 'B' | null = null
      if (m.winner_team_id) {
        if (m.winner_team_id === (teamA.id || m.localteam_id)) winner = 'A'
        else if (m.winner_team_id === (teamB.id || m.visitorteam_id)) winner = 'B'
      }
      if (m.draw_noresult) continue // skip draws/no results for training

      if (!winner) continue

      trainingData.push({ features: preFeatures, winner })

      // Update Elo
      const sA = teamStats[keyA]
      const sB = teamStats[keyB]
      if (winner === 'A') {
        const { winnerNew, loserNew } = updateElo(sA.elo, sB.elo)
        sA.elo = winnerNew; sB.elo = loserNew
        sA.wins++; sB.losses++
        // H2H
        const hKey = `${keyA}_vs_${keyB}`
        h2hRecords[hKey] = h2hRecords[hKey] || { aWins: 0, bWins: 0 }
        h2hRecords[hKey].aWins++
      } else {
        const { winnerNew, loserNew } = updateElo(sB.elo, sA.elo)
        sB.elo = winnerNew; sA.elo = loserNew
        sB.wins++; sA.losses++
        const hKey = `${keyA}_vs_${keyB}`
        h2hRecords[hKey] = h2hRecords[hKey] || { aWins: 0, bWins: 0 }
        h2hRecords[hKey].bWins++
      }

      // Recalculate normalized metrics
      for (const key of [keyA, keyB]) {
        const s = teamStats[key]
        const total = s.wins + s.losses
        s.winRate = total > 0 ? s.wins / total : 0.5
        s.momentum = Math.max(0, Math.min(1, (s.elo - 1200) / 600))
        s.batStrength = s.winRate * 0.8 + 0.1
        s.bowlStrength = (1 - s.winRate) * 0.3 + s.winRate * 0.7
      }
    }

    // --- Step 5: Train model if we have enough data AND mode=train ---
    let trainResult: any = null
    if (mode === 'train' && trainingData.length >= 5) {
      try {
        const history = await trainModel(trainingData)
        const lastAccuracy = (history.history.acc || history.history.accuracy || [0]).slice(-1)[0]
        trainResult = {
          samplesUsed: trainingData.length,
          epochs: 50,
          finalAccuracy: Math.round((lastAccuracy as number) * 1000) / 10,
        }

        // Persist updated team stats so they're available across requests
        const modelDir = path.join(process.cwd(), 'public', 'model')
        if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true })

        const mergedStats: Record<string, any> = {}
        for (const [key, s] of Object.entries(teamStats)) {
          mergedStats[key] = { elo: s.elo, winRate: s.winRate, momentum: s.momentum, batStrength: s.batStrength, bowlStrength: s.bowlStrength }
        }

        // Merge with existing team stats (don't overwrite international teams)
        let existingStats: Record<string, any> = {}
        const statsPath = path.join(modelDir, 'team-stats.json')
        if (fs.existsSync(statsPath)) {
          existingStats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'))
        }
        const finalStats = { ...existingStats, ...mergedStats }
        fs.writeFileSync(statsPath, JSON.stringify(finalStats, null, 2))

        // Merge H2H records
        let existingH2H: Record<string, any> = {}
        const h2hPath = path.join(modelDir, 'h2h-records.json')
        if (fs.existsSync(h2hPath)) {
          existingH2H = JSON.parse(fs.readFileSync(h2hPath, 'utf-8'))
        }
        const finalH2H = { ...existingH2H, ...h2hRecords }
        fs.writeFileSync(h2hPath, JSON.stringify(finalH2H, null, 2))

        console.log(`[Maharaja] Saved stats for ${Object.keys(mergedStats).length} teams and ${Object.keys(h2hRecords).length} H2H records`)
      } catch (trainErr) {
        console.error('[Maharaja] Training failed:', trainErr)
      }
    }

    // --- Step 6: Generate predictions for upcoming Maharaja Trophy matches ---
    const predictions: any[] = []

    for (const m of upcoming) {
      const normalized = normalizeSportMonksMatch(m)
      if (!normalized || !normalized.teamA || !normalized.teamB) continue

      const features = buildFeatures(normalized.teamA, normalized.teamB, teamStats as any, h2hRecords)

      // Import predict inline to avoid circular dependencies
      const { predict } = await import('@/lib/tf-model')
      const predResult = predict(features)

      const matchKey = normalized.key
      const teamA = normalized.teamA
      const teamB = normalized.teamB

      const winProbA = predResult.teamAWinProb
      const winProbB = predResult.teamBWinProb
      const favored = winProbA > winProbB ? teamA : teamB
      const tips = [
        `${favored} are favored with ${Math.max(winProbA, winProbB)}% win probability`,
        'Karnataka pitches are spin-friendly — spinners will be key',
        'T20 format — powerplay and death overs will be decisive',
        `${teamA} vs ${teamB} — Maharaja Trophy KSCA T20 2025-26`,
      ]

      const analysisPayload = {
        matchKey,
        teamA,
        teamB,
        winProbabilityA: winProbA,
        winProbabilityB: winProbB,
        confidence: predResult.confidence,
        tips,
        playersToWatch: { teamA: [], teamB: [] },
        conditions: {
          venue: normalized.venue || 'Karnataka',
          pitchType: 'Spin-friendly conditions',
          weatherImpact: 'Hot and humid — dew factor possible in evening matches',
          tossAdvice: 'Win toss and bat first — pitch deteriorates, spinners dominate later',
        },
        recentForm: {
          teamA: { wins: Math.round(teamStats[normalizeTeamName(teamA)]?.wins || 0), losses: Math.round(teamStats[normalizeTeamName(teamA)]?.losses || 0), trend: 'Based on Maharaja Trophy 2025-26 data' },
          teamB: { wins: Math.round(teamStats[normalizeTeamName(teamB)]?.wins || 0), losses: Math.round(teamStats[normalizeTeamName(teamB)]?.losses || 0), trend: 'Based on Maharaja Trophy 2025-26 data' },
        },
        reasoning: `Analysis based on ${trainingData.length} historical Maharaja Trophy matches. ${favored} have the edge based on Elo rating and H2H records from this tournament.`,
      }

      // Store in DB — matchKey has no @unique so we delete-then-create
      try {
        await prisma.matchAnalysis.deleteMany({ where: { matchKey } })
        await prisma.matchAnalysis.create({
          data: {
            matchKey,
            teamA,
            teamB,
            winProbabilityA: winProbA,
            winProbabilityB: winProbB,
            confidence: predResult.confidence,
            tips: tips as any,
            playersToWatch: { teamA: [], teamB: [] } as any,
            conditions: analysisPayload.conditions as any,
            recentForm: analysisPayload.recentForm as any,
            reasoning: analysisPayload.reasoning,
          },
        })
        predictions.push({ matchKey, teamA, teamB, winProbA, winProbB, confidence: predResult.confidence, stored: true })
      } catch (dbErr) {
        console.warn('[Maharaja] DB upsert failed for', matchKey, dbErr)
        predictions.push({ matchKey, teamA, teamB, winProbA, winProbB, confidence: predResult.confidence, stored: false })
      }
    }

    return NextResponse.json({
      success: true,
      leaguesSearched: leagueIds,
      historicalMatches: completed.length,
      trainingDataPoints: trainingData.length,
      upcomingMatches: upcoming.length,
      predictionsGenerated: predictions.length,
      predictions,
      teamStats: Object.fromEntries(
        Object.entries(teamStats).map(([k, v]) => [k, { elo: Math.round(v.elo), winRate: Math.round(v.winRate * 100) + '%', wins: v.wins, losses: v.losses }])
      ),
      h2hRecords,
      training: trainResult,
    })
  } catch (error: any) {
    console.error('[Maharaja] Route error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
