import { NextRequest, NextResponse } from 'next/server'
import { getLiveScorecard, getMatchBallByBall, getMatchOdds } from '@/lib/sportmonks'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/cricket/match/{matchKey}/full-live
 *
 * Consolidated endpoint for the live match page.
 * Returns: match details, ball-by-ball, odds/probability, and scorecard.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { matchKey: string } }
) {
  const matchKey = params.matchKey

  try {
    const [matchRes, bbbRes, oddsRes, dbPredRes] = await Promise.allSettled([
      getLiveScorecard(matchKey),
      getMatchBallByBall(matchKey),
      getMatchOdds(matchKey),
      prisma.matchAnalysis.findFirst({ where: { matchKey } }),
    ])

    const getValue = (res: PromiseSettledResult<any>) =>
      res.status === 'fulfilled' ? res.value : null
    const getError = (res: PromiseSettledResult<any>) =>
      res.status === 'rejected' ? res.reason?.message : null

    const matchRaw = getValue(matchRes)?.data || null

    if (!matchRaw) {
      return NextResponse.json(
        { success: false, error: 'Match not found. It may not be available on our data source.' },
        { status: 404 }
      )
    }

    // --- Teams ---
    const localteam = matchRaw.localteam?.data || matchRaw.localteam || {}
    const visitorteam = matchRaw.visitorteam?.data || matchRaw.visitorteam || {}

    const teamA = {
      key: String(localteam.id || matchRaw.localteam_id || 'a'),
      name: localteam.name || 'Team A',
      code: localteam.code || '',
    }
    const teamB = {
      key: String(visitorteam.id || matchRaw.visitorteam_id || 'b'),
      name: visitorteam.name || 'Team B',
      code: visitorteam.code || '',
    }

    // --- Status ---
    const smStatus = matchRaw.status || ''
    const isLive = matchRaw.live === true && smStatus !== 'NS'
    const isCompleted = smStatus === 'Finished' || !!matchRaw.winner_team_id || !!matchRaw.draw_noresult
    const status = isCompleted ? 'completed' : isLive ? 'live' : 'upcoming'

    // --- Runs / Innings ---
    const runsArray: any[] = Array.isArray(matchRaw.runs)
      ? matchRaw.runs
      : (matchRaw.runs?.data || [])

    // Group runs by innings number to build innings summary
    const inningsMap: Record<string, { runs: any[]; inning: number }> = {}
    for (const r of runsArray) {
      const inn = String(r.inning || 1)
      if (!inningsMap[inn]) inningsMap[inn] = { runs: [], inning: Number(inn) }
      inningsMap[inn].runs.push(r)
    }

    const innings = Object.values(inningsMap)
      .sort((a, b) => a.inning - b.inning)
      .map((entry) => {
        // Determine which team is batting this innings
        const firstRun = entry.runs[0]
        const teamId = firstRun?.team_id
        const teamSide: 'a' | 'b' =
          teamId === (localteam.id || matchRaw.localteam_id) ? 'a' : 'b'

        // Find the entry for this team in the runs array (aggregated)
        const teamRuns = entry.runs.filter((r: any) => r.team_id === teamId)
        const aggRun = teamRuns[0] || {}

        const runs = aggRun.score ?? null
        const wickets = aggRun.wickets ?? null
        const overs = aggRun.overs ?? null
        const runsNum = typeof runs === 'number' ? runs : null
        const oversNum = overs !== null ? parseFloat(String(overs)) : null
        const runRate =
          runsNum !== null && oversNum && oversNum > 0
            ? Math.round((runsNum / oversNum) * 100) / 100
            : null

        return {
          key: `inn_${entry.inning}`,
          teamSide,
          battingTeam: teamSide === 'a' ? teamA.name : teamB.name,
          runs: runsNum,
          wickets,
          overs,
          scoreStr: runsNum !== null ? `${runsNum}/${wickets ?? 0} (${overs ?? 0})` : null,
          runRate,
          extras: aggRun.pp_runs ?? null,
        }
      })

    // --- Scoreboards ---
    const scoreboards: any[] = matchRaw.scoreboards?.data || []

    // Current batting players from scoreboard
    const battingEntries: any[] = scoreboards
      .filter((s: any) => s.type === 'batting' || !s.type)
      .flatMap((s: any) => s.batting || s.players || [])

    const bowlingEntries: any[] = scoreboards
      .filter((s: any) => s.type === 'bowling')
      .flatMap((s: any) => s.bowling || s.players || [])

    const activeStriker =
      battingEntries.find((p: any) => p.active) || battingEntries[battingEntries.length - 1] || null
    const nonStriker = battingEntries.find(
      (p: any) => p !== activeStriker && !p.dismissed_ball && battingEntries.indexOf(p) !== battingEntries.indexOf(activeStriker)
    ) || null
    const activeBowler =
      bowlingEntries.find((p: any) => p.active) || bowlingEntries[bowlingEntries.length - 1] || null

    const currentPlayers = {
      liveInningKey: isLive ? `inn_${innings.length}` : null,
      striker: activeStriker
        ? {
            name: activeStriker.player?.fullname || activeStriker.player?.name || '',
            runs: activeStriker.score ?? null,
            balls: activeStriker.ball ?? null,
            fours: activeStriker.four_x ?? null,
            sixes: activeStriker.six_x ?? null,
            strikeRate: activeStriker.rate ?? null,
          }
        : null,
      nonStriker: nonStriker
        ? {
            name: nonStriker.player?.fullname || nonStriker.player?.name || '',
            runs: nonStriker.score ?? null,
            balls: nonStriker.ball ?? null,
            fours: nonStriker.four_x ?? null,
            sixes: nonStriker.six_x ?? null,
            strikeRate: nonStriker.rate ?? null,
          }
        : null,
      bowler: activeBowler
        ? {
            name: activeBowler.player?.fullname || activeBowler.player?.name || '',
            overs: activeBowler.overs ?? null,
            runs: activeBowler.runs ?? null,
            wickets: activeBowler.wickets ?? null,
            economy: activeBowler.rate ?? null,
          }
        : null,
    }

    // --- Ball-by-Ball ---
    // SportMonks returns balls as a direct array on data.balls (not nested under .data)
    const bbbFixture = getValue(bbbRes)?.data || null
    const rawBalls: any[] = Array.isArray(bbbFixture?.balls)
      ? bbbFixture.balls
      : (bbbFixture?.balls?.data || [])

    const ballByBall = rawBalls
      .map((b: any) => {
        const scoreObj = b.score || {}
        const totalRuns: number = scoreObj.runs ?? b.runs ?? 0
        const extras = (scoreObj.bye || 0) + (scoreObj.leg_bye || 0) + (scoreObj.noball_runs || 0) + (scoreObj.wide || 0)
        const batsmanRuns = Math.max(0, totalRuns - extras)
        const isFour = !!scoreObj.four
        const isSix = !!scoreObj.six
        const isWicket = !!(scoreObj.is_wicket || scoreObj.out || b.batsmanout_id)

        // Dismissed player — the one who got out
        const dismissedPlayer = isWicket
          ? (b.batsman?.fullname || b.batsman?.name || null)
          : null

        // Wicket type from score name e.g. "Wicket - Caught"
        let wicketType: string | null = null
        if (isWicket && scoreObj.name) {
          const parts = String(scoreObj.name).split('-')
          wicketType = (parts[1] || parts[0] || 'out').trim()
        }

        const overNum = b.ball ? Math.floor(Number(b.ball)) : 0
        const ballNum = b.ball ? Math.round((Number(b.ball) % 1) * 10) : 0

        return {
          innings: b.scoreboard || 'S1',
          over: overNum,
          ball: ballNum,
          runs: totalRuns,
          batsmanRuns,
          extras,
          batsman: b.batsman?.fullname || b.batsman?.name || '',
          bowler: b.bowler?.fullname || b.bowler?.name || '',
          commentary: scoreObj.name || '',
          isWicket,
          wicketType,
          dismissedPlayer,
          isFour,
          isSix,
          milestone: null,
        }
      })
      .sort((a, b) =>
        b.over !== a.over ? b.over - a.over : b.ball - a.ball
      )

    // --- Odds / Probability ---
    const oddsData = getValue(oddsRes)?.data || null
    let probability: any = null
    let probabilitySource = 'unavailable'

    if (oddsData && Array.isArray(oddsData) && oddsData.length > 0) {
      const market = oddsData[0]
      const runners = market.runners || []
      if (runners.length >= 2) {
        const totalImplied = runners.reduce((sum: number, r: any) => {
          const price = r.prices?.[0]?.value || r.decimal || 2
          return sum + 1 / price
        }, 0)
        if (totalImplied > 0) {
          probability = {
            teamA: {
              key: teamA.key,
              name: runners[0].name || teamA.name,
              code: teamA.code,
              pct: Math.round(((1 / (runners[0].prices?.[0]?.value || 2)) / totalImplied) * 100),
            },
            teamB: {
              key: teamB.key,
              name: runners[1].name || teamB.name,
              code: teamB.code,
              pct: Math.round(((1 / (runners[1].prices?.[0]?.value || 2)) / totalImplied) * 100),
            },
          }
          probabilitySource = 'sportmonks'
        }
      }
    }

    // Fallback: use AI prediction from DB if no live odds
    let predictionInsights: any = null
    const dbPred = getValue(dbPredRes)
    if (dbPred) {
      const predData = typeof dbPred.prediction === 'string'
        ? JSON.parse(dbPred.prediction)
        : dbPred.prediction as any

      if (!probability) {
        const pA = predData?.winProbabilityA ?? predData?.teamAWinProb ?? null
        const pB = predData?.winProbabilityB ?? predData?.teamBWinProb ?? null
        if (pA !== null && pB !== null) {
          probability = {
            teamA: { key: teamA.key, name: teamA.name, code: teamA.code, pct: Math.round(pA) },
            teamB: { key: teamB.key, name: teamB.name, code: teamB.code, pct: Math.round(pB) },
          }
          probabilitySource = 'ai'
        }
      }

      // Extract rich prediction insights for display
      predictionInsights = {
        predictedScoreA: predData?.predictedScoreA ?? predData?.predictedScore ?? null,
        predictedScoreB: predData?.predictedScoreB ?? null,
        confidence: predData?.confidence ?? null,
        teamAWinRate: predData?.teamAWinRate ?? null,
        teamBWinRate: predData?.teamBWinRate ?? null,
        avgScoreAtVenue: predData?.conditions?.avgScore ?? predData?.avgScore ?? null,
        venueInfo: predData?.conditions?.venue ?? null,
        pitchType: predData?.conditions?.pitchType ?? null,
        factors: predData?.factors ?? null,
        reasoning: typeof predData?.reasoning === 'string'
          ? predData.reasoning.slice(0, 300)
          : null,
      }
    }

    // --- Dynamic win probability from live state + team history ---
    if (!probability && innings.length > 0) {
      try {
        // Fetch historical records for both teams using direct schema columns
        const allRecords = await prisma.matchAnalysis.findMany({
          select: { teamA: true, teamB: true, winProbabilityA: true, winProbabilityB: true },
          where: {
            OR: [
              { teamA: { contains: teamA.name.split(' ')[0] } },
              { teamB: { contains: teamA.name.split(' ')[0] } },
              { teamA: { contains: teamB.name.split(' ')[0] } },
              { teamB: { contains: teamB.name.split(' ')[0] } },
            ],
          },
          take: 100,
        })

        // Derive win rates: team that had higher winProbability "won" that prediction
        const teamWins: Record<string, number> = {}
        const teamMatches: Record<string, number> = {}
        for (const rec of allRecords) {
          const tA = rec.teamA, tB = rec.teamB
          if (tA) teamMatches[tA] = (teamMatches[tA] || 0) + 1
          if (tB) teamMatches[tB] = (teamMatches[tB] || 0) + 1
          if (rec.winProbabilityA > rec.winProbabilityB) {
            if (tA) teamWins[tA] = (teamWins[tA] || 0) + 1
          } else {
            if (tB) teamWins[tB] = (teamWins[tB] || 0) + 1
          }
        }

        // Match team names with recorded names (fuzzy: first word)
        const findWinRate = (name: string) => {
          const key = Object.keys(teamMatches).find(k =>
            k.toLowerCase().includes(name.split(' ')[0].toLowerCase()) ||
            name.toLowerCase().includes(k.split(' ')[0].toLowerCase())
          )
          if (!key || !teamMatches[key]) return 0.5
          return (teamWins[key] || 0) / teamMatches[key]
        }

        // Historical win rates (fallback 50% if no data)
        const histWinRateA = findWinRate(teamA.name)
        const histWinRateB = findWinRate(teamB.name)

        // Live match state adjustment
        const inn1 = innings[0]
        const inn2 = innings[1] ?? null

        let liveAdjA = 0  // positive = team A favoured, negative = team B favoured

        if (inn2 && inn1.runs !== null && inn2.runs !== null) {
          // 2nd innings: chase in progress
          const target = (inn1.runs ?? 0) + 1
          const chaseRuns = inn2.runs
          const chaseOversRaw = parseFloat(String(inn2.overs ?? '0')) || 0
          const ballsDone = Math.floor(chaseOversRaw) * 6 + Math.round((chaseOversRaw % 1) * 10)
          const ballsLeft = 120 - ballsDone
          const needed = target - chaseRuns
          // Resources remaining factor (simplified Duckworth-Lewis style)
          const resourcesUsed = ballsDone / 120
          const difficulty = needed > 0 && ballsLeft > 0
            ? (needed / ballsLeft) * 6  // required RR
            : needed <= 0 ? 0 : 99
          // If req RR < 7: chasing team +10 to +20; if > 12: -15 to -25
          if (needed <= 0) liveAdjA = -30   // chaser won
          else if (difficulty < 6) liveAdjA = -20
          else if (difficulty < 8) liveAdjA = -10
          else if (difficulty < 10) liveAdjA = 0
          else if (difficulty < 13) liveAdjA = 12
          else liveAdjA = 22
          // The batting team in inn2 is inn2.teamSide
          if (inn2.teamSide === 'a') liveAdjA = -liveAdjA
        } else if (inn1 && inn1.runs !== null) {
          // 1st innings in progress — batting team has slight edge if scoring well
          const oversRaw = parseFloat(String(inn1.overs ?? '0')) || 0
          const ballsDone = Math.floor(oversRaw) * 6 + Math.round((oversRaw % 1) * 10)
          const currentRR = ballsDone > 0 ? (inn1.runs / ballsDone) * 6 : 0
          const wickets = inn1.wickets ?? 0
          // Score strength: high RR & low wickets = batting team favoured
          const scoreStrength = (currentRR - 7.75) * 2 - wickets * 1.5
          liveAdjA = inn1.teamSide === 'a' ? scoreStrength : -scoreStrength
        }

        // Combine: 55% history base + 45% live adjustment
        const rawA = (histWinRateA / (histWinRateA + histWinRateB)) * 100 * 0.55 + 50 * 0.45 + liveAdjA
        const pctA = Math.round(Math.max(5, Math.min(95, rawA)))
        const pctB = 100 - pctA

        probability = {
          teamA: { key: teamA.key, name: teamA.name, code: teamA.code, pct: pctA },
          teamB: { key: teamB.key, name: teamB.name, code: teamB.code, pct: pctB },
        }
        probabilitySource = 'live'

        // Enrich insights with historical rates
        if (!predictionInsights) predictionInsights = {} as any
        predictionInsights.teamAWinRate = histWinRateA
        predictionInsights.teamBWinRate = histWinRateB

        // Last 5 matches per team from DB
        const buildLast5 = (teamName: string, side: 'A' | 'B') => {
          const keyword = teamName.split(' ')[0].toLowerCase()
          const teamRecords = allRecords
            .filter(r =>
              r.teamA.toLowerCase().includes(keyword) ||
              r.teamB.toLowerCase().includes(keyword)
            )
            .slice(0, 5)
          return teamRecords.map(r => {
            const isTeamA = r.teamA.toLowerCase().includes(keyword)
            const won = isTeamA
              ? r.winProbabilityA >= r.winProbabilityB
              : r.winProbabilityB > r.winProbabilityA
            const opponent = isTeamA ? r.teamB : r.teamA
            return { result: won ? 'W' : 'L', opponent }
          })
        }
        predictionInsights.teamALast5 = buildLast5(teamA.name, 'A')
        predictionInsights.teamBLast5 = buildLast5(teamB.name, 'B')
      } catch { /* silently skip */ }
    }

    // --- Last 5 matches from DB (always fetch, not just in dynamic block) ---
    if (!predictionInsights?.teamALast5) {
      try {
        const keyword1 = teamA.name.split(' ')[0]
        const keyword2 = teamB.name.split(' ')[0]
        const last5Records = await prisma.matchAnalysis.findMany({
          select: { teamA: true, teamB: true, winProbabilityA: true, winProbabilityB: true },
          where: {
            OR: [
              { teamA: { contains: keyword1 } }, { teamB: { contains: keyword1 } },
              { teamA: { contains: keyword2 } }, { teamB: { contains: keyword2 } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })

        const buildForm = (name: string) => {
          const kw = name.split(' ')[0].toLowerCase()
          return last5Records
            .filter(r => r.teamA.toLowerCase().includes(kw) || r.teamB.toLowerCase().includes(kw))
            .slice(0, 5)
            .map(r => {
              const isA = r.teamA.toLowerCase().includes(kw)
              const won = isA ? r.winProbabilityA >= r.winProbabilityB : r.winProbabilityB > r.winProbabilityA
              return { result: won ? 'W' : 'L', opponent: isA ? r.teamB : r.teamA }
            })
        }

        if (!predictionInsights) predictionInsights = {} as any
        predictionInsights.teamALast5 = buildForm(teamA.name)
        predictionInsights.teamBLast5 = buildForm(teamB.name)
      } catch { /* skip */ }
    }

    // --- Venue ---
    const venue = matchRaw.venue?.data || matchRaw.venue || null

    // --- Winner ---
    let winner: string | null = null
    if (matchRaw.winner_team_id) {
      winner = matchRaw.winner_team_id === localteam.id ? teamA.name : teamB.name
    }

    // --- Toss ---
    let toss: any = null
    if (matchRaw.tosswon?.data || matchRaw.toss_won_team_id) {
      const tossTeamId = matchRaw.toss_won_team_id || matchRaw.tosswon?.data?.id
      const tossWinner = tossTeamId === localteam.id ? 'a' : 'b'
      toss = { winner: tossWinner, decision: matchRaw.elected || 'bat' }
    }

    return NextResponse.json({
      success: true,
      match: {
        key: String(matchRaw.id),
        name: `${teamA.name} vs ${teamB.name}`,
        shortName: `${teamA.code || teamA.name} vs ${teamB.code || teamB.name}`,
        subTitle: matchRaw.note || matchRaw.season?.data?.name || '',
        status,
        playStatus: isLive ? 'in_play' : status,
        format: (matchRaw.type || 'T20').toUpperCase(),
        startAt: matchRaw.starting_at || null,
        winner,
        toss,
        venue: venue
          ? {
              name: venue.name || '',
              city: venue.city || '',
              country: venue.country?.data?.name || venue.country || '',
            }
          : null,
        teams: { a: teamA, b: teamB },
        innings,
        messages: [],
        statusNote: matchRaw.note || smStatus || '',
      },
      currentPlayers,
      ballByBall,
      probability: {
        data: probability,
        source: probability ? probabilitySource : 'unavailable',
      },
      predictionInsights,
      graphs: { worm: null, manhattan: null, runRate: null },
      errors: {
        match: getError(matchRes),
        ballByBall: getError(bbbRes),
        odds: getError(oddsRes),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Full live API error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
