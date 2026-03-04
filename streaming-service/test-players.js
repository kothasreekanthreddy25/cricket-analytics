/**
 * CricketTips — Local Player Data Test
 *
 * Tests Roanuz API: auth, live matches, current batsmen, bowler, tournament stats.
 * Works on Windows — no FFmpeg or FIFO needed.
 *
 * Usage:
 *   node test-players.js               ← auto-finds a live match
 *   node test-players.js <matchKey>    ← test a specific match
 */

require('dotenv').config()
const axios = require('axios')

const BASE_URL     = process.env.ROANUZ_BASE_URL    || 'https://api.sports.roanuz.com/v5'
const PROJECT_KEY  = process.env.ROANUZ_PROJECT_KEY
const API_KEY      = process.env.ROANUZ_API_KEY

if (!PROJECT_KEY || !API_KEY) {
  console.error('❌  ROANUZ_PROJECT_KEY and ROANUZ_API_KEY must be set in .env')
  process.exit(1)
}

// ─── helpers ──────────────────────────────────────────────────────────────────

let cachedToken = null

async function getToken() {
  if (cachedToken) return cachedToken
  const res = await axios.post(`${BASE_URL}/core/${PROJECT_KEY}/auth/`, { api_key: API_KEY })
  cachedToken = res.data?.data?.token || res.data?.token
  if (!cachedToken) throw new Error('No token in auth response: ' + JSON.stringify(res.data))
  return cachedToken
}

async function get(endpoint) {
  const token = await getToken()
  const res = await axios.get(`${BASE_URL}/cricket/${PROJECT_KEY}/${endpoint}`, {
    headers: { 'rs-token': token },
    timeout: 10000,
  })
  return res.data?.data
}

function line(char = '─', len = 52) { return char.repeat(len) }

function fmtBat(b) {
  const name = b.player?.name || b.name || '?'
  const sr   = b.strike_rate != null ? Number(b.strike_rate).toFixed(1) : '—'
  return `${name.padEnd(22)}  ${String(b.runs ?? 0).padStart(3)}(${b.balls ?? 0})  SR:${sr}  4s:${b.fours ?? 0}  6s:${b.sixes ?? 0}`
}

function fmtBowl(b) {
  const name = b.player?.name || b.name || '?'
  const eco  = b.economy != null ? Number(b.economy).toFixed(1) : '—'
  return `${name.padEnd(22)}  ${b.wickets ?? 0}/${b.runs ?? 0}  ${b.overs ?? '—'} ov  Eco:${eco}`
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + line('═') + '\n  CricketTips — Player Data Test\n' + line('═'))

  // Step 1: Auth
  process.stdout.write('\nAuthenticating with Roanuz... ')
  await getToken()
  console.log('✓')

  // Step 2: Find match
  let matchKey = process.argv[2]
  let matchName = ''

  if (!matchKey) {
    process.stdout.write('Finding live / recent matches... ')
    const data = await get('featured-matches-2/')
    const matches = data?.matches || data?.featured_matches || data?.data?.matches || []

    if (matches.length === 0) {
      console.log('\n❌  No matches returned. Try passing a matchKey directly.')
      console.log('    node test-players.js <matchKey>')
      return
    }

    // Prefer live, then in-play, then first
    const live = matches.find(m => m.status === 'started' || m.status === 'live' || m.play_status === 'in_play')
    const chosen = live || matches[0]
    matchKey  = chosen.key
    matchName = chosen.name || chosen.short_name || matchKey
    console.log('✓')
    console.log(`\nUsing match: ${matchName}`)
    console.log(`Match key:   ${matchKey}`)

    // Show all available matches too
    console.log('\nAll available matches:')
    matches.slice(0, 8).forEach((m, i) => {
      const live = (m.status === 'started' || m.play_status === 'in_play') ? ' ← LIVE' : ''
      console.log(`  ${i + 1}. [${m.key}]  ${m.name || m.short_name}${live}`)
    })
  } else {
    console.log(`\nUsing provided match key: ${matchKey}`)
  }

  // Step 3: Fetch full match data
  process.stdout.write('\nFetching match + player data... ')
  const data  = await get(`match/${matchKey}/`)
  const match = data?.match || data
  const play  = match?.play   || {}
  const teams = match?.teams  || {}
  const inningsMap = match?.innings || play?.innings || {}
  console.log('✓')

  // Raw dump for debugging
  console.log('\n' + line('─'))
  console.log('  RAW top-level data keys:')
  console.log(' ', Object.keys(data).join(', '))
  console.log('  RAW match keys:')
  console.log(' ', Object.keys(match).join(', '))
  console.log('  RAW play keys:')
  console.log(' ', Object.keys(play).join(', '))

  const firstInn = Object.values(inningsMap)[0]
  if (firstInn) {
    console.log('  RAW innings[0] keys:')
    console.log(' ', Object.keys(firstInn).join(', '))
  }
  console.log(line('─'))

  // Score
  console.log('\n' + line())
  console.log('  SCORE')
  console.log(line())
  if (Object.keys(inningsMap).length === 0) {
    console.log('  (no innings data yet)')
  } else {
    Object.entries(inningsMap).forEach(([key, inn]) => {
      const side = key.startsWith('a') ? teams.a?.name || 'Team A' : teams.b?.name || 'Team B'
      // Show score_str if available, otherwise try field names
      const scoreStr = inn.score_str || `${inn.runs ?? inn.score?.runs ?? '?'}/${inn.wickets ?? inn.score?.wickets ?? '?'} (${inn.overs ?? inn.score?.overs ?? '?'} ov)`
      console.log(`  ${side.padEnd(24)} ${scoreStr}`)
    })
  }

  // Play status
  console.log(`\n  Status: ${match?.status || '?'} / ${match?.play_status || play?.status || '?'}`)
  if (match?.messages?.[0]?.value) console.log(`  Note:   ${match.messages[0].value}`)

  // Current players — Roanuz v5: play.live.recent_players
  const liveSection     = play.live || {}
  const recentPlayers   = liveSection.recent_players || {}
  const rawStriker      = recentPlayers.striker    || null
  const rawNonStriker   = recentPlayers.non_striker || null
  const rawBowler       = recentPlayers.bowler     || null

  // Helper: format bowler overs array [3,0] → "3.0"
  const fmtOvers = (o) => Array.isArray(o) ? `${o[0]}.${o[1]}` : (o ?? '—')

  console.log('\n' + line())
  console.log('  BATTING AT THE CREASE')
  console.log(line())
  if (!rawStriker && !rawNonStriker) {
    console.log('  (no batting data — match may not be in play yet)')
  } else {
    if (rawStriker) {
      const s = rawStriker.stats || {}
      const sr = s.strike_rate != null ? Number(s.strike_rate).toFixed(1) : '—'
      console.log(`  ● ON STRIKE  ${rawStriker.name.padEnd(22)}  ${String(s.runs ?? 0).padStart(3)}(${s.balls ?? 0})  SR:${sr}  4s:${s.fours ?? 0}  6s:${s.sixes ?? 0}`)
    }
    if (rawNonStriker) {
      const s = rawNonStriker.stats || {}
      const sr = s.strike_rate != null ? Number(s.strike_rate).toFixed(1) : '—'
      console.log(`  ○ Non-striker ${rawNonStriker.name.padEnd(22)} ${String(s.runs ?? 0).padStart(3)}(${s.balls ?? 0})  SR:${sr}  4s:${s.fours ?? 0}  6s:${s.sixes ?? 0}`)
    }
  }

  console.log('\n' + line())
  console.log('  CURRENT BOWLER')
  console.log(line())
  if (!rawBowler) {
    console.log('  (no bowler data)')
  } else {
    const s   = rawBowler.stats || {}
    const eco = s.economy != null ? Number(s.economy).toFixed(1) : '—'
    console.log(`  ⚡  ${rawBowler.name.padEnd(22)}  ${s.wickets ?? 0}/${s.runs ?? 0}  ${fmtOvers(s.overs)} ov  Eco:${eco}`)
  }

  // Stream overlay preview
  console.log('\n' + line('─'))
  console.log('  STREAM OVERLAY TEXT PREVIEW')
  console.log(line('─'))
  if (rawStriker) {
    const s  = rawStriker.stats || {}
    const sr = s.strike_rate != null ? Number(s.strike_rate).toFixed(1) : '-'
    console.log(`  BATSMAN1: ${rawStriker.name}   ${s.runs ?? 0}(${s.balls ?? 0})   SR:${sr}  4s:${s.fours ?? 0}  6s:${s.sixes ?? 0}   ON STRIKE`)
  }
  if (rawNonStriker) {
    const s  = rawNonStriker.stats || {}
    const sr = s.strike_rate != null ? Number(s.strike_rate).toFixed(1) : '-'
    console.log(`  BATSMAN2: ${rawNonStriker.name}   ${s.runs ?? 0}(${s.balls ?? 0})   SR:${sr}  4s:${s.fours ?? 0}  6s:${s.sixes ?? 0}`)
  }
  if (rawBowler) {
    const s   = rawBowler.stats || {}
    const eco = s.economy != null ? Number(s.economy).toFixed(1) : '-'
    console.log(`  BOWLER:   ${rawBowler.name}   ${s.wickets ?? 0}/${s.runs ?? 0}   ${fmtOvers(s.overs)} ov   Eco:${eco}`)
  }
  if (!rawStriker && !rawNonStriker && !rawBowler) {
    console.log('  (overlay will show "Waiting for match to start...")')
  }

  // Tournament stats
  const tournamentKey  = match?.tournament?.key
  const tournamentName = match?.tournament?.name || tournamentKey
  if (tournamentKey) {
    console.log('\n' + line())
    console.log(`  TOURNAMENT STATS — ${tournamentName}`)
    console.log(line())
    try {
      const tData  = await get(`tournament/${tournamentKey}/player-stats/`)
      const stats  = tData?.stats || tData?.player_stats || tData || {}
      const batters = stats.most_runs || stats.batting?.most_runs || []
      const bowlers = stats.most_wickets || stats.bowling?.most_wickets || []

      if (batters.length > 0) {
        console.log('  Top Run Scorers:')
        batters.slice(0, 5).forEach((p, i) => {
          console.log(`    ${i + 1}. ${(p.player?.name || p.name || '?').padEnd(24)} ${p.runs ?? 0} runs`)
        })
      }
      if (bowlers.length > 0) {
        console.log('  Top Wicket-Takers:')
        bowlers.slice(0, 5).forEach((p, i) => {
          console.log(`    ${i + 1}. ${(p.player?.name || p.name || '?').padEnd(24)} ${p.wickets ?? 0} wkts`)
        })
      }
      if (batters.length === 0 && bowlers.length === 0) {
        console.log('  (stats not yet available for this tournament)')
        console.log('  Raw keys:', Object.keys(stats).join(', ') || '(empty)')
      }

      // Stream overlay preview
      const runs = batters.slice(0, 4).map(p => `${(p.player?.name || p.name || '?').split(' ').slice(-1)[0]} ${p.runs ?? 0}`)
      const wkts = bowlers.slice(0, 4).map(p => `${(p.player?.name || p.name || '?').split(' ').slice(-1)[0]} ${p.wickets ?? 0}`)
      if (runs.length > 0) console.log(`\n  TOURN_RUNS: RUNS: ${runs.join('  |  ')}`)
      if (wkts.length > 0) console.log(`  TOURN_WKTS: WKTS: ${wkts.join('  |  ')}`)
    } catch (err) {
      console.log(`  ⚠  Tournament stats fetch failed: ${err.message}`)
    }
  } else {
    console.log('\n  (no tournament key in match data)')
  }

  console.log('\n' + line('═'))
  console.log('  ✓ Test complete')
  console.log(line('═') + '\n')
}

main().catch(err => {
  console.error('\n❌  Test failed:', err.message)
  if (err.response?.data) {
    console.error('   API response:', JSON.stringify(err.response.data, null, 2))
  }
  process.exit(1)
})
