import { NextRequest, NextResponse } from 'next/server'
import { getMatchStats, getPlayerCareer, getLeagueRecentFixtures } from '@/lib/sportmonks'

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(v: any): number {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

// Parse over.ball notation (e.g. 3.4 = over 3, ball 4)
function parseBall(ballNum: any): { over: number; ball: number } {
  const s = String(ballNum)
  const [o, b] = s.split('.')
  return { over: parseInt(o) || 0, ball: parseInt(b) || 0 }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface BattingEntry {
  name: string
  playerId: number
  runs: number
  balls: number
  fours: number
  sixes: number
  strikeRate: number
  dismissed: boolean
  dismissalType: string | null
  teamSide: 'a' | 'b'
  scoreboard: string
}

interface BowlingEntry {
  name: string
  playerId: number
  overs: number
  balls: number
  runs: number
  wickets: number
  economy: number
  maidens: number
  teamSide: 'a' | 'b'
  scoreboard: string
}

interface OverEntry {
  over: number
  runs: number
  wickets: number
  teamSide: 'a' | 'b'
  scoreboard: string
}

// ── Ball processing ───────────────────────────────────────────────────────────

function processBalls(
  balls: any[],
  localTeamId: number,
  visitorTeamId: number,
): {
  batting: BattingEntry[]
  bowling: BowlingEntry[]
  overByOver: OverEntry[]
} {
  const battingMap = new Map<string, BattingEntry>()
  const bowlingMap = new Map<string, BowlingEntry>()
  const overMap = new Map<string, OverEntry>()

  for (const ball of balls) {
    const score = ball.score || {}
    const batsman = ball.batsman || {}
    const bowler = ball.bowler || {}
    const scoreboard: string = ball.scoreboard || 'S1'
    const teamId = ball.team?.id ?? null

    // Determine which team is batting (the ball.team is the batting team)
    const battingTeamId = teamId
    const teamSide: 'a' | 'b' =
      battingTeamId === localTeamId ? 'a' : battingTeamId === visitorTeamId ? 'b' : 'a'

    const batsmanId = batsman.id
    const batsmanName = batsman.fullname || batsman.name || 'Unknown'
    const bowlerId = bowler.id
    const bowlerName = bowler.fullname || bowler.name || 'Unknown'

    if (!batsmanId || !bowlerId) continue

    const batsmanKey = `${batsmanId}:${scoreboard}`
    const bowlerKey = `${bowlerId}:${scoreboard}`

    const batsmanRuns = safeNum(score.runs)
    const isWicket = !!score.is_wicket
    const isFour = !!score.four
    const isSix = !!score.six
    const noBall = safeNum(score.noball_runs)
    const isBye = !!score.bye
    const isLegBye = !!score.leg_bye

    // Only count legal deliveries for balls faced (no wides, no no-balls for batter)
    const isWide = score.name === 'wide' || (safeNum(score.runs) === 0 && noBall === 0 && !isBye && !isLegBye && !isFour && !isSix && score.name?.includes('wide'))
    // Simpler: a wide is indicated when score.name includes 'wide'
    const isWideBall = typeof score.name === 'string' && score.name.toLowerCase().includes('wide')

    // Batting
    if (!battingMap.has(batsmanKey)) {
      battingMap.set(batsmanKey, {
        name: batsmanName,
        playerId: batsmanId,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        dismissed: false,
        dismissalType: null,
        teamSide,
        scoreboard,
      })
    }
    const bEntry = battingMap.get(batsmanKey)!
    bEntry.runs += batsmanRuns
    if (!isWideBall) bEntry.balls += 1
    if (isFour) bEntry.fours += 1
    if (isSix) bEntry.sixes += 1
    if (isWicket) {
      bEntry.dismissed = true
      bEntry.dismissalType = score.name || 'out'
    }

    // Bowling
    if (!bowlingMap.has(bowlerKey)) {
      bowlingMap.set(bowlerKey, {
        name: bowlerName,
        playerId: bowlerId,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
        maidens: 0,
        teamSide: teamSide === 'a' ? 'b' : 'a', // bowler is on the other team
        scoreboard,
      })
    }
    const bwEntry = bowlingMap.get(bowlerKey)!
    if (!isWideBall) bwEntry.balls += 1
    // Runs conceded = total - byes - leg byes
    const runsConceded = safeNum(score.runs) - (isBye ? batsmanRuns : 0) - (isLegBye ? batsmanRuns : 0)
    bwEntry.runs += Math.max(0, runsConceded) + noBall
    if (isWicket && score.name !== 'run out') bwEntry.wickets += 1

    // Over-by-over
    const { over } = parseBall(ball.ball)
    const overKey = `${scoreboard}:${over}`
    if (!overMap.has(overKey)) {
      overMap.set(overKey, { over, runs: 0, wickets: 0, teamSide, scoreboard })
    }
    const oEntry = overMap.get(overKey)!
    oEntry.runs += safeNum(score.runs) + noBall
    if (isWicket) oEntry.wickets += 1
  }

  // Finalize strike rates and economies
  const batting: BattingEntry[] = []
  for (const e of battingMap.values()) {
    e.strikeRate = e.balls > 0 ? parseFloat(((e.runs / e.balls) * 100).toFixed(1)) : 0
    batting.push(e)
  }

  const bowling: BowlingEntry[] = []
  for (const e of bowlingMap.values()) {
    e.overs = Math.floor(e.balls / 6) + (e.balls % 6) / 10
    e.economy = e.balls > 0 ? parseFloat(((e.runs / e.balls) * 6).toFixed(1)) : 0
    bowling.push(e)
  }

  const overByOver: OverEntry[] = Array.from(overMap.values()).sort((a, b) => {
    if (a.scoreboard !== b.scoreboard) return a.scoreboard < b.scoreboard ? -1 : 1
    return a.over - b.over
  })

  return { batting, bowling, overByOver }
}

// ── Career normalization ──────────────────────────────────────────────────────

function normalizeCareer(career: any[]): Record<string, any> {
  const t20 = career.find((c: any) => c.type === 'T20' || c.type === 'T20I') || career[0] || {}
  const b = t20.batting || {}
  const bw = t20.bowling || {}
  return {
    t20Matches: safeNum(b.matches),
    t20Runs: safeNum(b.runs_scored),
    t20Average: b.average ? parseFloat(Number(b.average).toFixed(1)) : null,
    t20StrikeRate: b.strike_rate ? parseFloat(Number(b.strike_rate).toFixed(1)) : null,
    t20HighScore: b.highest_inning_score || null,
    t20Hundreds: safeNum(b.hundreds),
    t20Fifties: safeNum(b.fifties),
    t20Fours: safeNum(b.four_x),
    t20Sixes: safeNum(b.six_x),
    t20Wickets: safeNum(bw.wickets),
    t20BowlAvg: bw.average ? parseFloat(Number(bw.average).toFixed(1)) : null,
    t20Economy: bw.economy_rate ? parseFloat(Number(bw.economy_rate).toFixed(1)) : null,
    t20BowlSR: bw.strike_rate ? parseFloat(Number(bw.strike_rate).toFixed(1)) : null,
    t20FiveWickets: safeNum(bw.five_wickets),
  }
}

// ── Team form helper ──────────────────────────────────────────────────────────

function extractTeamForm(
  fixtures: any[],
  teamId: number,
  currentMatchId: number,
  opponentMap: Record<number, string>,
): Array<{ matchId: string; opponent: string; result: string; score: string; date: string }> {
  const results: any[] = []
  for (const f of fixtures) {
    if (f.id === currentMatchId) continue
    const isLocal = f.localteam_id === teamId || f.localteam?.id === teamId
    const isVisitor = f.visitorteam_id === teamId || f.visitorteam?.id === teamId
    if (!isLocal && !isVisitor) continue

    // Only completed matches
    if (!f.winner_team_id && !f.draw_noresult) continue

    const opponentId = isLocal
      ? (f.visitorteam_id || f.visitorteam?.id)
      : (f.localteam_id || f.localteam?.id)
    const opponentName =
      (isLocal ? f.visitorteam?.name : f.localteam?.name) ||
      opponentMap[opponentId] ||
      'Unknown'

    let result = 'nr'
    if (f.draw_noresult) result = 'nr'
    else if (f.winner_team_id === teamId) result = 'won'
    else result = 'lost'

    // Score for this team
    const runs: any[] = Array.isArray(f.runs) ? f.runs : (f.runs?.data || [])
    const teamRuns = runs.filter((r: any) => r.team_id === teamId)
    const score = teamRuns.map((r: any) => {
      const sc = r.score ?? r.runs ?? ''
      const wk = r.wickets ?? ''
      const ov = r.overs ?? ''
      return `${sc}/${wk} (${ov})`
    }).join(' & ') || '—'

    results.push({
      matchId: String(f.id),
      opponent: opponentName,
      result,
      score,
      date: (f.starting_at || '').split('T')[0] || '',
    })

    if (results.length >= 5) break
  }
  return results
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { matchKey: string } },
) {
  const matchKey = params.matchKey

  try {
    // 1. Fetch the fixture with balls + scoreboards
    const fixtureRes = await getMatchStats(matchKey)
    const fixture = fixtureRes?.data
    if (!fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })
    }

    const localTeam = fixture.localteam?.data || fixture.localteam || {}
    const visitorTeam = fixture.visitorteam?.data || fixture.visitorteam || {}
    const localTeamId: number = localTeam.id || fixture.localteam_id
    const visitorTeamId: number = visitorTeam.id || fixture.visitorteam_id
    const leagueId: number = fixture.league_id

    const balls: any[] = Array.isArray(fixture.balls)
      ? fixture.balls
      : (fixture.balls?.data || [])

    // 2. Process ball-by-ball data
    const { batting, bowling, overByOver } = processBalls(balls, localTeamId, visitorTeamId)

    // 3. Fetch career stats for top players (up to 6 batters + 4 bowlers)
    const topBatters = [...batting]
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 6)
      .map((b) => b.playerId)

    const topBowlers = [...bowling]
      .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
      .slice(0, 4)
      .map((b) => b.playerId)

    const playerIds = [...new Set([...topBatters, ...topBowlers])]

    const careerResults = await Promise.allSettled(
      playerIds.map((id) => getPlayerCareer(String(id)))
    )

    const playerCareer: Record<string, any> = {}
    careerResults.forEach((res, idx) => {
      const id = playerIds[idx]
      if (res.status === 'fulfilled' && res.value?.data) {
        const career = res.value.data.career?.data || res.value.data.career || []
        playerCareer[String(id)] = normalizeCareer(Array.isArray(career) ? career : [career])
      }
    })

    // 4. Fetch last 5 matches per team from league
    let teamLastFive: { a: any[]; b: any[] } = { a: [], b: [] }
    if (leagueId) {
      try {
        const leagueRes = await getLeagueRecentFixtures(String(leagueId))
        const recentFixtures: any[] = Array.isArray(leagueRes?.data) ? leagueRes.data : []

        const opponentMap: Record<number, string> = {}
        for (const f of recentFixtures) {
          const lt = f.localteam?.data || f.localteam || {}
          const vt = f.visitorteam?.data || f.visitorteam || {}
          if (lt.id) opponentMap[lt.id] = lt.name
          if (vt.id) opponentMap[vt.id] = vt.name
        }

        teamLastFive.a = extractTeamForm(recentFixtures, localTeamId, fixture.id, opponentMap)
        teamLastFive.b = extractTeamForm(recentFixtures, visitorTeamId, fixture.id, opponentMap)
      } catch {
        // Non-fatal — just leave empty
      }
    }

    // 5. Scoreboards
    const scoreboards: any[] = Array.isArray(fixture.scoreboards)
      ? fixture.scoreboards
      : (fixture.scoreboards?.data || [])

    const scoreTotals: Record<string, { total: number; wickets: number; overs: string; extras: number }> = {}
    for (const sb of scoreboards) {
      const key = sb.scoreboard || 'S1'
      if (!scoreTotals[key]) scoreTotals[key] = { total: 0, wickets: 0, overs: '0', extras: 0 }
      if (sb.type === 'total') {
        scoreTotals[key].total = safeNum(sb.total)
        scoreTotals[key].wickets = safeNum(sb.wickets)
        scoreTotals[key].overs = String(sb.overs || '0')
      }
      if (sb.type === 'extra') {
        scoreTotals[key].extras += safeNum(sb.total)
      }
    }

    // 6. AI prediction from DB
    let prediction: any = null
    try {
      const { prisma } = await import('@/lib/prisma')
      const cached = await prisma.matchAnalysis.findFirst({
        where: { matchKey },
        orderBy: { createdAt: 'desc' },
      })
      if (cached) {
        prediction = {
          teamA: cached.teamA,
          teamB: cached.teamB,
          winProbabilityA: cached.winProbabilityA,
          winProbabilityB: cached.winProbabilityB,
          confidence: cached.confidence,
          tips: cached.tips,
          reasoning: cached.reasoning,
          conditions: cached.conditions,
          recentForm: cached.recentForm,
          playersToWatch: cached.playersToWatch,
        }
      }
    } catch { /* no prediction cached */ }

    // 7. Live in-match prediction from ball data (simple projected score model)
    let livePrediction: any = null
    try {
      const currentInnings = overByOver.filter(o => o.scoreboard === 'S1')
      if (currentInnings.length > 0) {
        const oversCompleted = currentInnings.length
        const totalRuns = currentInnings.reduce((s, o) => s + o.runs, 0)
        const totalWickets = batting.filter(b => b.dismissed && b.scoreboard === 'S1').length
        const currentRR = oversCompleted > 0 ? totalRuns / oversCompleted : 0
        const wicketsRemaining = 10 - totalWickets

        // Projected final score using current RR (adjusted for wicket pressure)
        const wicketFactor = Math.max(0.5, wicketsRemaining / 10)
        const projectedTotal = Math.round(totalRuns + (currentRR * (20 - oversCompleted) * wicketFactor))

        livePrediction = {
          oversCompleted,
          currentScore: `${totalRuns}/${totalWickets}`,
          currentRR: Math.round(currentRR * 100) / 100,
          projectedTotal,
          wicketsRemaining,
        }
      }
    } catch { /* skip */ }

    return NextResponse.json({
      batting,
      bowling,
      overByOver,
      playerCareer,
      teamLastFive,
      scoreTotals,
      teams: {
        a: { id: localTeamId, name: localTeam.name || '', code: localTeam.code || '' },
        b: { id: visitorTeamId, name: visitorTeam.name || '', code: visitorTeam.code || '' },
      },
      prediction,
      livePrediction,
    })
  } catch (err: any) {
    console.error('[stats route]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
