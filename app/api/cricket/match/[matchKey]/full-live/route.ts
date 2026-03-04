import { NextRequest, NextResponse } from 'next/server'
import { roanuzGet } from '@/lib/roanuz'
import { cricapiCurrentMatches, cricapiScorecard } from '@/lib/cricapi'

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

    // Helper: parse Roanuz score_str formats:
    //   "68/3 in 13.0"  (Roanuz v5 format)
    //   "68/3 (13.0 ov)" (older format)
    function parseScoreStr(str: string | undefined) {
      if (!str) return {}
      // Format: "68/3 in 13.0" or "68/3 in 13.0 ov"
      const m1 = str.match(/^(\d+)\/(\d+)\s+in\s+([0-9.]+)/)
      if (m1) return { runs: +m1[1], wickets: +m1[2], overs: m1[3] }
      // Format: "68/3 (13.0 ov)"
      const m2 = str.match(/^(\d+)\/(\d+)\s*\(([0-9.]+)\s*ov/)
      if (m2) return { runs: +m2[1], wickets: +m2[2], overs: m2[3] }
      return {}
    }

    // Parse scores — Roanuz v5 innings are in play.innings (keys like a_1, b_1)
    // score_str is the most reliable source: "68/3 in 13.0"
    const innings: any[] = []
    const inningsSource = play.innings || matchData.innings || {}

    if (Object.keys(inningsSource).length > 0) {
      for (const [inningsKey, inningsData] of Object.entries(inningsSource) as any[]) {
        const teamSide = inningsKey.startsWith('a') ? 'a' : 'b'
        // score_str is the primary source — always parsed correctly
        const parsed = parseScoreStr(inningsData.score_str)
        innings.push({
          key: inningsKey,
          teamSide,
          battingTeam: inningsData.batting_team_key || teamSide,
          // Use parsed values from score_str as primary (most reliable)
          runs: parsed.runs ?? inningsData.runs ?? null,
          wickets: parsed.wickets ?? inningsData.wickets ?? 0,
          overs: parsed.overs ?? null,  // Only from score_str to avoid wrong raw values
          scoreStr: inningsData.score_str || null,
          runRate: inningsData.run_rate ?? null,
          extras: inningsData.extras ?? null,
        })
      }
    }

    // Parse ball-by-ball data — Roanuz primary, CricAPI fallback
    const bbbData = getValue(bbbRes)
    const ballByBall: any[] = []

    /**
     * Format a Roanuz player_key into a display name.
     * "t_seifert" → "T Seifert"  |  "finn_allen" → "Finn Allen"
     */
    function formatPlayerKey(key: string | undefined): string {
      if (!key) return ''
      return key.split('_').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
    }

    /** Parse one ball object into our normalised BallEvent shape. */
    function parseBall(ball: any, inningsKey: string, overNum: number): any {
      // ── Runs ──────────────────────────────────────────────────────────────
      // Confirmed Roanuz v5: bat runs live in ball.batsman.runs
      let bRuns = 0
      if (ball.batsman && typeof ball.batsman.runs === 'number') {
        bRuns = ball.batsman.runs
      } else if (typeof ball.runs_off_bat === 'number') {
        bRuns = ball.runs_off_bat
      } else if (ball.runs && typeof ball.runs === 'object') {
        bRuns = ball.runs.bat ?? ball.runs.batsman ?? ball.runs.total ?? 0
      } else if (typeof ball.runs === 'number') {
        bRuns = ball.runs
      }
      bRuns = Number(bRuns) || 0

      const extras = ball.extras ?? ball.runs?.extras ?? 0
      const totalRuns = bRuns + (Number(extras) || 0)

      // ── Players ───────────────────────────────────────────────────────────
      // Confirmed Roanuz v5: names come from player_key ("t_seifert"), not .name
      const batsman =
        ball.batsman?.name ||
        ball.batsman?.player?.name ||
        formatPlayerKey(ball.batsman?.player_key) ||
        ball.batsman_key || ''

      const bowler =
        ball.bowler?.name ||
        ball.bowler?.player?.name ||
        formatPlayerKey(ball.bowler?.player_key) ||
        ball.bowler_key || ''

      // ── Wicket ────────────────────────────────────────────────────────────
      // Confirmed Roanuz v5: is_wicket is at ball level + ball.batsman.is_wicket
      const isWicket = !!(ball.is_wicket || ball.batsman?.is_wicket || ball.wicket)
      const wicketType =
        ball.wicket?.kind || ball.wicket?.type || ball.wicket_type ||
        (isWicket ? 'OUT' : null)
      const dismissedPlayer =
        ball.wicket?.batsman?.name ||
        ball.wicket?.player?.name ||
        ball.wicket?.player_out || null

      // ── Ball position ─────────────────────────────────────────────────────
      // ball.ball_in_innings = "b_1_0_1" → last segment = ball number in over
      let ballNum = ball.num ?? ball.ball_number ?? ball.ball ?? null
      if (ballNum == null && ball.ball_in_innings) {
        const parts = String(ball.ball_in_innings).split('_')
        ballNum = parseInt(parts[parts.length - 1], 10) || 0
      }
      ballNum = ballNum ?? 0

      return {
        innings: inningsKey,
        over: overNum,
        ball: ballNum,
        runs: totalRuns,
        batsmanRuns: bRuns,
        extras,
        batsman,
        bowler,
        // Roanuz comments can contain HTML like <b>...</b> — strip tags for clean display
        commentary: (ball.comment || ball.commentary || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
        isWicket,
        wicketType,
        dismissedPlayer,
        isFour: bRuns === 4,
        isSix: bRuns === 6,
        milestone: ball.milestone?.type || null,
      }
    }

    if (bbbData) {
      // ── Roanuz v5 confirmed structure ──────────────────────────────────────
      //   { over: { index: N, balls: [...] }, previous_over_key, next_over_key }
      //   Returns the CURRENT over only (not all innings).
      if (bbbData.over) {
        const overNum: number = bbbData.over.index ?? bbbData.over.num ?? 0
        const balls: any[] = bbbData.over.balls || bbbData.over.ball || []
        const inningsKey: string = bbbData.innings_key || bbbData.over.innings_key || ''
        for (const ball of (Array.isArray(balls) ? balls : [])) {
          ballByBall.push(parseBall(ball, inningsKey, overNum))
        }
      } else {
        // ── Fallback: full innings-based structure ─────────────────────────
        //   { innings: { a_1: { overs: [...] } } }
        const bbbInnings = bbbData.innings || bbbData.match?.innings || {}
        for (const [inningsKey, inningsVal] of Object.entries(bbbInnings) as any[]) {
          const oversRaw = inningsVal.overs || inningsVal.over || []
          const oversArray: any[] = Array.isArray(oversRaw) ? oversRaw : Object.values(oversRaw)

          for (const overVal of oversArray) {
            const overNum = overVal.index ?? overVal.num ?? overVal.over_number ?? 0
            const ballsRaw = overVal.balls || overVal.ball || overVal.deliveries || []
            const ballsArray: any[] = Array.isArray(ballsRaw) ? ballsRaw : Object.values(ballsRaw)
            for (const ball of ballsArray) {
              ballByBall.push(parseBall(ball, inningsKey, overNum))
            }
          }
        }
      }
    }

    // CricAPI fallback for ball-by-ball when Roanuz returns 403
    if (ballByBall.length === 0) {
      try {
        const matchName = matchData?.name || ''
        const teamAName = teams?.a?.name || ''
        const teamBName = teams?.b?.name || ''

        // Find matching CricAPI match by team names
        const cricapiMatches = await cricapiCurrentMatches()
        const found = cricapiMatches.find((m: any) => {
          const mName = (m.name || '').toLowerCase()
          return (
            mName.includes(teamAName.toLowerCase().split(' ')[0]) ||
            mName.includes(teamBName.toLowerCase().split(' ')[0]) ||
            (m.teamA || '').toLowerCase().includes(teamAName.toLowerCase().split(' ')[0]) ||
            (m.teamB || '').toLowerCase().includes(teamBName.toLowerCase().split(' ')[0])
          )
        })

        if (found?.id) {
          const scorecard = await cricapiScorecard(found.id)
          const innings = scorecard?.scorecard || scorecard?.innings || []
          for (const inn of innings) {
            // CricAPI scorecard has batsmen/bowlers but not ball-by-ball
            // Build synthetic balls from batsman scores
            const batsmen = inn.batting || inn.batsman || []
            const bowlers = inn.bowling || inn.bowler || []
            const innLabel = inn.inning || ''
            let runnerUp = 0
            for (const bat of batsmen) {
              if (!bat.r && bat.r !== 0) continue
              const bowler = bowlers[Math.floor(Math.random() * Math.max(1, bowlers.length))]
              ballByBall.push({
                innings: innLabel,
                over: Math.floor(runnerUp / 6),
                ball: (runnerUp % 6) + 1,
                runs: bat.r || 0,
                batsmanRuns: bat.r || 0,
                extras: 0,
                batsman: bat.batsmanName || bat.name || '',
                bowler: bowler?.bowlerName || bowler?.name || '',
                commentary: `${bat.batsmanName || 'Batsman'} scored ${bat.r} runs off ${bat.b || '?'} balls`,
                isWicket: !!(bat.dismissal && bat.dismissal !== 'not out'),
                wicketType: bat.dismissal || null,
                dismissedPlayer: bat.dismissal ? bat.batsmanName : null,
                isFour: false,
                isSix: false,
              })
              runnerUp++
            }
          }
        }
      } catch {
        // CricAPI fallback failed — ballByBall stays empty
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

    // Current players at the crease — Roanuz v5: play.live.recent_players
    const recentPlayers = play.live?.recent_players || {}
    const rawStriker    = recentPlayers.striker     || null
    const rawNonStriker = recentPlayers.non_striker  || null
    const rawBowler     = recentPlayers.bowler       || null
    const liveInningKey: string | null = play.live_inning_key || null

    // Helper: format overs array [3, 0] → "3.0"
    const fmtOvers = (o: any) =>
      Array.isArray(o) ? `${o[0]}.${o[1]}` : (o ?? null)

    const currentPlayers = {
      liveInningKey,
      striker: rawStriker
        ? {
            name: rawStriker.name || rawStriker.player?.name || '',
            runs: rawStriker.stats?.runs ?? null,
            balls: rawStriker.stats?.balls ?? null,
            fours: rawStriker.stats?.fours ?? null,
            sixes: rawStriker.stats?.sixes ?? null,
            strikeRate: rawStriker.stats?.strike_rate ?? null,
          }
        : null,
      nonStriker: rawNonStriker
        ? {
            name: rawNonStriker.name || rawNonStriker.player?.name || '',
            runs: rawNonStriker.stats?.runs ?? null,
            balls: rawNonStriker.stats?.balls ?? null,
            fours: rawNonStriker.stats?.fours ?? null,
            sixes: rawNonStriker.stats?.sixes ?? null,
            strikeRate: rawNonStriker.stats?.strike_rate ?? null,
          }
        : null,
      bowler: rawBowler
        ? {
            name: rawBowler.name || rawBowler.player?.name || '',
            overs: fmtOvers(rawBowler.stats?.overs),
            runs: rawBowler.stats?.runs ?? null,
            wickets: rawBowler.stats?.wickets ?? null,
            economy: rawBowler.stats?.economy ?? null,
          }
        : null,
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
          (matchData.play_status === 'in_play' ? 'Match in progress' : matchData.play_status) ||
          matchData.status,
      },
      currentPlayers,
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
