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

    /** Coerce any value to a string, or return fallback if not a plain string */
    const safeStr = (v: any, fallback = ''): string =>
      typeof v === 'string' ? v : fallback

    /** Coerce any value to a number, or null */
    const safeNum = (v: any): number | null => {
      const n = Number(v)
      return typeof v === 'number' ? v : (isNaN(n) ? null : n)
    }

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
          key: safeStr(inningsKey),
          teamSide,
          battingTeam: safeStr(inningsData.batting_team_key) || teamSide,
          runs: parsed.runs ?? safeNum(inningsData.runs),
          wickets: parsed.wickets ?? safeNum(inningsData.wickets) ?? 0,
          overs: parsed.overs ?? null,
          scoreStr: safeStr(inningsData.score_str) || null,
          runRate: safeNum(inningsData.run_rate),
          extras: safeNum(inningsData.extras),
        })
      }
    }

    // Parse ball-by-ball data — Roanuz primary, CricAPI fallback
    const bbbData = getValue(bbbRes)
    const ballByBall: any[] = []

    /**
     * Extract a readable name from a Roanuz player_key.
     * Roanuz v5 uses two formats:
     *   Long:  "c__player__loren_tshuma__639fb"  → "Loren Tshuma"
     *   Short: "w_ml_green"                       → "W Ml Green"
     */
    function extractPlayerName(key: string | undefined): string {
      if (!key || typeof key !== 'string') return ''
      // Long format: segments separated by double-underscore
      const dblParts = key.split('__')
      if (dblParts.length >= 3) {
        // 3rd segment is the name: "loren_tshuma" → "Loren Tshuma"
        return dblParts[2].split('_').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
      }
      // Short format: single underscores, capitalise each word
      return key.split('_').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
    }

    /** Parse one ball object into our normalised BallEvent shape. */
    function parseBall(ball: any, fallbackInnings: string, fallbackOver: number): any {
      // ── Runs ──────────────────────────────────────────────────────────────
      // Roanuz v5: batsman runs in ball.batsman.runs
      //            total ball runs (incl extras) in ball.team_score.runs
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

      // Roanuz v5: extras are in team_score.extras
      const extras = Number(ball.team_score?.extras ?? ball.extras ?? ball.runs?.extras ?? 0) || 0
      // Use team_score.runs as total when available (includes extras)
      const totalRuns = typeof ball.team_score?.runs === 'number'
        ? ball.team_score.runs
        : bRuns + extras

      // ── Ball position ─────────────────────────────────────────────────────
      // Roanuz v5: ball.overs = [over_number, ball_in_over]  e.g. [33, 6]
      let ballOver = fallbackOver
      let ballNum = 0
      if (Array.isArray(ball.overs) && ball.overs.length >= 2) {
        // Use fallbackOver for the absolute over number — ball.overs[0] is a local
        // index in previous-over fetches (always 0 or 1), NOT the actual over number
        ballOver = fallbackOver
        ballNum  = Number(ball.overs[1]) || 0
      } else {
        // Legacy / other formats
        let rawBallNum: any = ball.num ?? ball.ball_number ?? null
        if (rawBallNum == null && (typeof ball.ball === 'number' || typeof ball.ball === 'string')) {
          rawBallNum = ball.ball
        }
        if (rawBallNum == null && ball.ball_in_innings) {
          const parts = String(ball.ball_in_innings).split('_')
          rawBallNum = parseInt(parts[parts.length - 1], 10) || 0
        }
        ballNum = Number.isFinite(Number(rawBallNum)) ? Number(rawBallNum) : 0
      }

      // ── Innings key ───────────────────────────────────────────────────────
      // Roanuz v5: ball.innings is the innings key directly on the ball
      const inningsKey = typeof ball.innings === 'string' && ball.innings
        ? ball.innings
        : fallbackInnings

      // ── Players ───────────────────────────────────────────────────────────
      // Roanuz v5: player_key on batsman/bowler objects — use extractPlayerName()
      const batsman =
        ball.batsman?.name ||
        extractPlayerName(ball.batsman?.player_key) ||
        extractPlayerName(ball.batsman_key) || ''

      const bowler =
        ball.bowler?.name ||
        extractPlayerName(ball.bowler?.player_key) ||
        extractPlayerName(ball.bowler_key) || ''

      // ── Wicket ────────────────────────────────────────────────────────────
      // Roanuz v5: team_score.is_wicket is most reliable; wicket.wicket_type for kind
      const isWicket = !!(ball.team_score?.is_wicket || ball.is_wicket || ball.batsman?.is_wicket || ball.wicket)
      const wicketType =
        ball.wicket?.wicket_type || ball.wicket?.kind || ball.wicket?.type || ball.wicket_type ||
        (isWicket ? 'OUT' : null)
      const dismissedPlayer =
        extractPlayerName(ball.wicket?.player_key) ||
        ball.wicket?.batsman?.name ||
        ball.wicket?.player?.name ||
        ball.wicket?.player_out || null

      // ── 4s and 6s ────────────────────────────────────────────────────────
      // Roanuz v5: ball.batsman.is_four / is_six are explicit booleans
      const isFour = !!(ball.batsman?.is_four || bRuns === 4)
      const isSix  = !!(ball.batsman?.is_six  || bRuns === 6)

      // ── Commentary ────────────────────────────────────────────────────────
      const rawComment = ball.comment || ball.commentary || ''
      const safeCommentary = typeof rawComment === 'string'
        ? rawComment.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
        : ''

      return {
        innings:          inningsKey,
        over:             Number.isFinite(ballOver) ? ballOver : 0,
        ball:             Number.isFinite(ballNum)  ? ballNum  : 0,
        runs:             Number.isFinite(totalRuns) ? totalRuns : 0,
        batsmanRuns:      Number.isFinite(bRuns) ? bRuns : 0,
        extras:           Number.isFinite(extras) ? extras : 0,
        batsman:          typeof batsman === 'string' ? batsman : '',
        bowler:           typeof bowler  === 'string' ? bowler  : '',
        commentary:       safeCommentary,
        isWicket:         !!isWicket,
        wicketType:       typeof wicketType === 'string' ? wicketType : (isWicket ? 'OUT' : null),
        dismissedPlayer:  typeof dismissedPlayer === 'string' && dismissedPlayer ? dismissedPlayer : null,
        isFour,
        isSix,
        milestone:        typeof ball.milestone?.type === 'string' ? ball.milestone.type : null,
      }
    }

    /**
     * Parse one Roanuz bbb response shape and return its balls + next prevKey.
     * Shape: { over: { index: {innings, over_number}, balls: [...] }, previous_over_key: "a_1_40" }
     */
    function parseBbbOverResponse(data: any): { balls: any[], prevKey: string | null } {
      if (!data?.over) return { balls: [], prevKey: null }
      const overIndex = data.over.index
      const overNum: number =
        (overIndex && typeof overIndex === 'object' && typeof overIndex.over_number === 'number')
          ? overIndex.over_number
          : (typeof overIndex === 'number' ? overIndex : (data.over.num ?? 0))
      const inningsKey: string =
        (overIndex && typeof overIndex === 'object' && typeof overIndex.innings === 'string')
          ? overIndex.innings
          : (data.innings_key || data.over.innings_key || '')
      const rawBalls: any[] = data.over.balls || data.over.ball || []
      const balls = Array.isArray(rawBalls)
        ? rawBalls.map((b: any) => parseBall(b, inningsKey, overNum))
        : []
      const prevKey = typeof data.previous_over_key === 'string' ? data.previous_over_key : null
      return { balls, prevKey }
    }

    if (bbbData) {
      // ── Roanuz v5 confirmed structure ──────────────────────────────────────
      //   { over: { index: {innings, over_number} | N, balls: [...] }, previous_over_key: "a_1_40" }
      //   Returns the CURRENT over only — fetch up to 2 previous overs to get ~18 balls
      if (bbbData.over) {
        // Parse current over
        const { balls: currentBalls } = parseBbbOverResponse(bbbData)
        ballByBall.push(...currentBalls)

        // Derive current over number + innings key to construct previous over keys directly.
        // DO NOT follow previous_over_key — the API skips overs (e.g. 9 → 5 → 4).
        // Instead build keys: {innings}_{over_number-1}, {innings}_{over_number-2} ...
        const curOverIndex = bbbData.over.index
        const curOverNum: number =
          (curOverIndex && typeof curOverIndex === 'object' && typeof curOverIndex.over_number === 'number')
            ? curOverIndex.over_number
            : (typeof curOverIndex === 'number' ? curOverIndex : 0)
        const curInningsKey: string =
          (curOverIndex && typeof curOverIndex === 'object' && typeof curOverIndex.innings === 'string')
            ? curOverIndex.innings
            : (bbbData.innings_key || '')

        if (curInningsKey && curOverNum > 0) {
          for (let i = 1; i <= 2; i++) {
            const targetOver = curOverNum - i
            if (targetOver < 0) break
            const overKey = `${curInningsKey}_${targetOver}`
            try {
              const prevRes = await roanuzGet(`match/${matchKey}/ball-by-ball/${overKey}/`)
              const { balls: prevBalls } = parseBbbOverResponse(prevRes?.data)
              ballByBall.push(...prevBalls)
            } catch {
              break
            }
          }
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
          winPct[item.team_key] = Math.round(Number(item.value))
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
      if (teamKeys.length >= 2 && Object.keys(winPct).length > 0) {
        // winPct keys are actual Roanuz team keys (e.g. "a-rz--cricket--ZIMS"),
        // NOT the positional 'a'/'b' keys — look up by teams[side].key
        const actualKeyA = safeStr(teams[teamKeys[0]]?.key)
        const actualKeyB = safeStr(teams[teamKeys[1]]?.key)
        const winPctKeys = Object.keys(winPct)

        // Try matching by actual team key; fall back to positional order within winPct
        const pctA = winPct[actualKeyA] ?? winPct[winPctKeys[0]] ?? 50
        const pctB = winPct[actualKeyB] ?? winPct[winPctKeys[1]] ?? (100 - pctA)

        probability = {
          teamA: {
            key: teamKeys[0],
            name: teams[teamKeys[0]]?.name || teamKeys[0],
            code: teams[teamKeys[0]]?.code || teamKeys[0].toUpperCase(),
            pct: pctA,
          },
          teamB: {
            key: teamKeys[1],
            name: teams[teamKeys[1]]?.name || teamKeys[1],
            code: teams[teamKeys[1]]?.code || teamKeys[1].toUpperCase(),
            pct: pctB,
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
        key: safeStr(matchData.key),
        name: safeStr(matchData.name),
        shortName: safeStr(matchData.short_name),
        subTitle: safeStr(matchData.sub_title),
        status: safeStr(matchData.status),
        playStatus: safeStr(matchData.play_status),
        format: safeStr(matchData.format),
        startAt: matchData.start_at
          ? new Date(matchData.start_at * 1000).toISOString()
          : null,
        winner: typeof matchData.winner === 'string' ? matchData.winner : null,
        toss: matchData.toss,
        venue: matchData.venue
          ? {
              name: safeStr(matchData.venue.name),
              city: safeStr(matchData.venue.city),
              country: safeStr(matchData.venue.country?.name),
            }
          : null,
        teams: {
          a: teams.a
            ? { key: safeStr(teams.a.key), name: safeStr(teams.a.name), code: safeStr(teams.a.code) }
            : null,
          b: teams.b
            ? { key: safeStr(teams.b.key), name: safeStr(teams.b.name), code: safeStr(teams.b.code) }
            : null,
        },
        innings,
        messages: matchData.messages || [],
        statusNote: (() => {
          const msgVal = matchData.messages?.[0]?.value
          if (typeof msgVal === 'string' && msgVal) return msgVal
          if (matchData.play_status === 'in_play') return 'Match in progress'
          if (typeof matchData.play_status === 'string') return matchData.play_status
          return typeof matchData.status === 'string' ? matchData.status : ''
        })(),
      },
      currentPlayers,
      ballByBall: ballByBall.sort((a, b) => {
        // Most recent ball first: descending over, then descending ball-in-over
        if (b.over !== a.over) return b.over - a.over
        return b.ball - a.ball
      }),
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
