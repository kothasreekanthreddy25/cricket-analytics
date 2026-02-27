import { NextRequest, NextResponse } from 'next/server'
import { roanuzGet } from '@/lib/roanuz'

/**
 * GET /api/cricket/match/{matchKey}/full-live
 *
 * Consolidated endpoint for the live match page.
 * Returns: match details, ball-by-ball, live odds/probability, and graph data.
 * Each section is independently resolved — one failure doesn't block others.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { matchKey: string } }
) {
  const matchKey = params.matchKey

  try {
    // Fire all requests in parallel
    const [
      matchRes,
      bbbRes,
      liveOddsRes,
      preOddsRes,
      wormRes,
      manhattanRes,
      runRateRes,
    ] = await Promise.allSettled([
      roanuzGet(`match/${matchKey}/`),
      roanuzGet(`match/${matchKey}/ball-by-ball/`),
      roanuzGet(`match/${matchKey}/live-match-odds/`),
      roanuzGet(`match/${matchKey}/pre-match-odds/`),
      roanuzGet(`match/${matchKey}/worm/`),
      roanuzGet(`match/${matchKey}/manhattan/`),
      roanuzGet(`match/${matchKey}/run-rate/`),
    ])

    const getValue = (res: PromiseSettledResult<any>) =>
      res.status === 'fulfilled' ? res.value?.data : null
    const getError = (res: PromiseSettledResult<any>) =>
      res.status === 'rejected' ? res.reason?.message : null

    // Parse match details
    const matchData = getValue(matchRes) || {}
    const teams = matchData.teams || {}
    const play = matchData.play || {}

    // Parse scores from play data
    const innings: any[] = []
    if (play.innings) {
      for (const [inningsKey, inningsData] of Object.entries(play.innings) as any[]) {
        innings.push({
          key: inningsKey,
          battingTeam: inningsData.batting_team_key || inningsKey.replace('_innings', ''),
          runs: inningsData.score?.runs ?? null,
          wickets: inningsData.score?.wickets ?? null,
          overs: inningsData.score?.overs ?? null,
          runRate: inningsData.score?.run_rate ?? null,
          extras: inningsData.score?.extras ?? null,
        })
      }
    }

    // Parse ball-by-ball data
    const bbbData = getValue(bbbRes)
    const ballByBall: any[] = []

    if (bbbData) {
      // Roanuz v5: ball-by-ball is in data.innings.{innings_key}.overs
      const bbbInnings = bbbData.innings || bbbData.match?.innings || {}
      for (const [inningsKey, inningsVal] of Object.entries(bbbInnings) as any[]) {
        const overs = inningsVal.overs || {}
        for (const [overKey, overVal] of Object.entries(overs) as any[]) {
          const balls = overVal.balls || overVal.deliveries || []
          const ballsArray = Array.isArray(balls) ? balls : Object.values(balls)
          for (const ball of ballsArray) {
            ballByBall.push({
              innings: inningsKey,
              over: overVal.over_number ?? overKey,
              ball: ball.ball_number ?? ball.ball,
              runs: ball.runs?.total ?? ball.runs ?? 0,
              batsmanRuns: ball.runs?.batsman ?? ball.batsman_runs ?? 0,
              extras: ball.runs?.extras ?? ball.extras ?? 0,
              batsman: ball.batsman?.name || ball.batsman_key || '',
              bowler: ball.bowler?.name || ball.bowler_key || '',
              commentary: ball.commentary || ball.comment || '',
              isWicket: !!ball.wicket || ball.is_wicket === true,
              wicketType: ball.wicket?.type || ball.wicket_type || null,
              dismissedPlayer: ball.wicket?.batsman?.name || ball.wicket?.player_out || null,
              isFour: (ball.runs?.batsman ?? ball.batsman_runs) === 4,
              isSix: (ball.runs?.batsman ?? ball.batsman_runs) === 6,
            })
          }
        }
      }
    }

    // Parse odds / probability
    let probability: any = null
    let oddsSource = 'unavailable'

    const liveOdds = getValue(liveOddsRes)
    const preOdds = getValue(preOddsRes)
    const oddsData = liveOdds || preOdds
    oddsSource = liveOdds ? 'live' : preOdds ? 'pre-match' : 'unavailable'

    if (oddsData) {
      const oddsMatch = oddsData.match || oddsData
      const prediction = oddsMatch.result_prediction?.automatic || {}
      const winPct: Record<string, number> = {}

      if (prediction.percentage && Array.isArray(prediction.percentage)) {
        for (const item of prediction.percentage) {
          winPct[item.team_key] = item.value
        }
      }

      // Fallback: calculate from decimal odds
      if (Object.keys(winPct).length === 0) {
        const betOdds = oddsMatch.bet_odds?.automatic || {}
        if (betOdds.decimal && Array.isArray(betOdds.decimal)) {
          const totalImplied = betOdds.decimal.reduce(
            (sum: number, item: any) => sum + 1 / item.value,
            0
          )
          for (const item of betOdds.decimal) {
            winPct[item.team_key] = Math.round(((1 / item.value) / totalImplied) * 100)
          }
        }
      }

      const teamKeys = Object.keys(teams)
      if (teamKeys.length >= 2 && Object.keys(winPct).length >= 2) {
        probability = {
          teamA: {
            key: teamKeys[0],
            name: teams[teamKeys[0]]?.name || teamKeys[0],
            code: teams[teamKeys[0]]?.code || teamKeys[0].toUpperCase(),
            pct: winPct[teamKeys[0]] ?? 50,
          },
          teamB: {
            key: teamKeys[1],
            name: teams[teamKeys[1]]?.name || teamKeys[1],
            code: teams[teamKeys[1]]?.code || teamKeys[1].toUpperCase(),
            pct: winPct[teamKeys[1]] ?? 50,
          },
        }
      }
    }

    return NextResponse.json({
      success: true,
      match: {
        key: matchData.key,
        name: matchData.name,
        shortName: matchData.short_name,
        subTitle: matchData.sub_title,
        status: matchData.status,
        playStatus: matchData.play_status,
        format: matchData.format,
        startAt: matchData.start_at
          ? new Date(matchData.start_at * 1000).toISOString()
          : null,
        winner: matchData.winner,
        toss: matchData.toss,
        venue: matchData.venue
          ? {
              name: matchData.venue.name,
              city: matchData.venue.city,
              country: matchData.venue.country?.name,
            }
          : null,
        teams: {
          a: teams.a
            ? { key: teams.a.key, name: teams.a.name, code: teams.a.code }
            : null,
          b: teams.b
            ? { key: teams.b.key, name: teams.b.name, code: teams.b.code }
            : null,
        },
        innings,
        messages: matchData.messages || [],
        statusNote:
          matchData.messages?.[0]?.value ||
          matchData.play_status ||
          matchData.status,
      },
      ballByBall: ballByBall.reverse(), // Most recent first
      probability: {
        data: probability,
        source: oddsSource,
      },
      graphs: {
        worm: getValue(wormRes),
        manhattan: getValue(manhattanRes),
        runRate: getValue(runRateRes),
      },
      errors: {
        match: getError(matchRes),
        ballByBall: getError(bbbRes),
        liveOdds: getError(liveOddsRes),
        worm: getError(wormRes),
        manhattan: getError(manhattanRes),
        runRate: getError(runRateRes),
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
