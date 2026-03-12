/**
 * CricketTips.ai — YouTube Live Streaming Service
 *
 * REST API:
 *   POST /stream/start        { matchKey, rtmpUrl, teamA, teamB }
 *   POST /stream/start-auto   { matchKey, teamA, teamB, title?, description? }
 *                              — Creates YouTube Live broadcast automatically
 *   POST /stream/stop
 *   GET  /stream/status
 *   POST /stream/auto-mode    { enabled: true|false }  — toggle auto-detection
 *   GET  /stream/auto-mode                             — auto-mode status
 *   GET  /health
 */
require('dotenv').config()
const express = require('express')
const {
  getBallByBall, getScoreText, getMatchData, getTournamentTopStats,
  getPlayerCareerStats, getPlayerRecentForm,
} = require('./roanuz')
const { generateCommentary } = require('./commentary')
const { textToSpeech, cleanupOldAudio, preCacheEventSounds } = require('./tts')
const { createNewsVideo, createHighlightVideo } = require('./news-video')
const { playCrowdSound } = require('./crowd-sounds')
const { createLiveBroadcast, goLive, endLive, getWatchUrl, startChatPolling, stopChatPolling } = require('./youtube-live')
const autoStream = require('./auto-stream')
const {
  initFiles,
  updateScore, updateInningsContext, updateCommentary, updateEvent,
  updateCurrentPlayers, updatePlayerExtras, updateTournamentStats, updateChat,
  updatePitchReport, clearPitchReport, updateAnnouncement, clearAnnouncement,
  startFFmpeg, playAudioFile, stopFFmpeg, isStreaming,
} = require('./ffmpeg-stream')

const app = express()
app.use(express.json())

// ─── State ────────────────────────────────────────────────────────────────────

let currentMatchKey = null
let pollInterval = null
let tournamentInterval = null
let lastBallKey = null
let ballCount = 0
let streamStartTime = null
let currentBroadcastId = null   // YouTube broadcast ID (if auto-created)
let currentLiveChatId  = null   // YouTube liveChatId for chat polling
let goLiveTimer        = null   // Timer to transition broadcast to 'live'
let currentWatchUrl    = null   // YouTube watch URL

// Countdown mode state
let countdownTimer    = null    // setInterval that ticks the countdown every second
let checkMatchTimer   = null    // setInterval that polls Roanuz every 30s for match start
let isCountdownMode   = false

// Score-change commentary: track total runs+wickets between polls
let lastTotalRuns    = 0
let lastTotalWickets = 0

// Tournament player stats map: playerName_lowercase → { runs, avg, sr }
let tournamentPlayerMap = {}
// Cache of player career stats to avoid repeated API calls: playerKey → { careerLine, formLine }
const playerCareerCache = {}

// Pre-cached event sound files (generated on stream start, played instantly)
// Keys: six | four | wicket | noball | wide  →  file path or null
let eventSounds = {}

// ─── Stream Orchestrator ──────────────────────────────────────────────────────

/**
 * @param {string} matchKey
 * @param {string} rtmpUrl
 * @param {string} teamA
 * @param {string} teamB
 * @param {{ isUpcoming?: boolean, scheduledTime?: string|null }} [opts]
 */
async function startStream(matchKey, rtmpUrl, teamA, teamB, opts = {}) {
  console.log(`[Stream] Starting for match: ${matchKey}`)
  console.log(`[Stream] ${teamA} vs ${teamB}`)
  console.log(`[Stream] RTMP: ${rtmpUrl.substring(0, 40)}...`)

  currentMatchKey  = matchKey
  streamStartTime  = new Date()
  isCountdownMode  = opts.isUpcoming === true
  lastTotalRuns    = 0
  lastTotalWickets = 0
  extractBalls._debugOnce = true  // reset so we see [BBB] logs for each new match

  initFiles(teamA, teamB)
  startFFmpeg(rtmpUrl)

  // Pre-cache event sounds in background (SIX! FOUR! WICKET!) for instant playback
  preCacheEventSounds().then(sounds => {
    eventSounds = sounds
    const count = Object.keys(sounds).length
    console.log(`[Stream] Event sounds ready: ${count} clips cached`)
  }).catch(err => console.warn('[Stream] Event sound pre-cache failed:', err.message))

  if (isCountdownMode && opts.scheduledTime) {
    // ── Pre-match countdown mode ──────────────────────────────────────────
    console.log(`[Stream] Countdown mode — match scheduled at ${opts.scheduledTime}`)

    updateScore(`${teamA} vs ${teamB}  —  COMING UP`)
    updateCommentary('CricketTips.ai — LIVE AI Commentary coming soon! Subscribe & Like!')
    updateCurrentPlayers(null, null, null)

    const schedMs = new Date(opts.scheduledTime).getTime()

    // Tick the countdown display every second
    countdownTimer = setInterval(() => tickCountdown(schedMs, teamA, teamB), 1000)
    tickCountdown(schedMs, teamA, teamB)

    // Poll every 30s to detect when match actually starts
    checkMatchTimer = setInterval(
      () => checkIfMatchStarted(matchKey, teamA, teamB),
      30000
    )
    console.log('[Stream] Countdown started')

  } else {
    // ── Live match mode ───────────────────────────────────────────────────
    pollInterval = setInterval(() => pollForNewBalls(matchKey, teamA, teamB), 8000)
    await pollForNewBalls(matchKey, teamA, teamB)
    console.log('[Stream] Live polling started')
  }
}

/** Update the countdown display in the innings-context overlay. */
function tickCountdown(schedMs, teamA, teamB) {
  const remaining = schedMs - Date.now()
  if (remaining <= 0) {
    updateInningsContext('MATCH STARTING NOW!')
    return
  }
  const h   = Math.floor(remaining / 3600000)
  const m   = Math.floor((remaining % 3600000) / 60000)
  const s   = Math.floor((remaining % 60000) / 1000)
  const pad = n => String(n).padStart(2, '0')
  const display = h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(m)}:${pad(s)}`
  updateInningsContext(`STARTS IN: ${display}`)
}

/**
 * Called every 30s during countdown mode.
 * Switches to live polling as soon as Roanuz reports the match has started.
 */
async function checkIfMatchStarted(matchKey, teamA, teamB) {
  try {
    const data   = await getMatchData(matchKey)
    const match  = data?.match || data
    const status = match?.status || ''
    const started = status === 'started' || status === 'in_play' || status === 'live'

    if (started) {
      console.log('[Stream] Match has started! Switching from countdown to live mode...')

      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
      if (checkMatchTimer) { clearInterval(checkMatchTimer); checkMatchTimer = null }
      isCountdownMode  = false
      lastTotalRuns    = 0
      lastTotalWickets = 0

      updateScore(`${teamA} vs ${teamB}  —  LIVE`)
      updateCommentary('LIVE! CricketTips.ai AI Commentary starting...')

      pollInterval = setInterval(() => pollForNewBalls(matchKey, teamA, teamB), 8000)
      await pollForNewBalls(matchKey, teamA, teamB)
    }
  } catch (err) {
    console.warn('[Stream] checkIfMatchStarted error:', err.message)
  }
}

async function pollForNewBalls(matchKey, teamA, teamB) {
  try {
    // Update score + current players (single API call)
    const scoreData = await getScoreText(matchKey, teamA, teamB)
    updateScore(scoreData.scoreText)
    updateInningsContext(scoreData.contextText)
    updateCurrentPlayers(scoreData.striker, scoreData.nonStriker, scoreData.bowler)

    // Enrich player overlays with tournament + career stats
    await enrichPlayerOverlays(scoreData.striker, scoreData.nonStriker)

    // First poll: kick off tournament stats if we have a tournament key
    if (scoreData.tournamentKey && !tournamentInterval) {
      fetchAndUpdateTournamentStats(scoreData.tournamentKey)
      tournamentInterval = setInterval(
        () => fetchAndUpdateTournamentStats(scoreData.tournamentKey),
        5 * 60 * 1000 // every 5 minutes
      )
    }

    // ── Ball-by-ball commentary (primary) ─────────────────────────────────
    let bbbData = null
    try { bbbData = await getBallByBall(matchKey) } catch (bbbErr) {
      console.warn('[Poll] Ball-by-ball unavailable:', bbbErr.message)
    }
    const balls = extractBalls(bbbData)

    if (balls.length > 0) {
      const latestBall = balls[0]
      // Use uniqueKey (ball.key) when available — most reliable dedup
      const ballKey    = latestBall.uniqueKey || `${latestBall.over}.${latestBall.ball}`

      if (ballKey !== lastBallKey) {
        lastBallKey = ballKey
        ballCount++

        console.log(`[Stream] New ball: ${ballKey} — ${latestBall.batsman} vs ${latestBall.bowler} — ${latestBall.runs} runs`)

        const event = getBallEvent(latestBall)
        playCrowdSound(event.soundType)
        if (event.display) updateEvent(event.display, event.field)

        // Play pre-cached event sound IMMEDIATELY (same time as visual overlay)
        // This ensures audio + screen are in sync — no TTS API delay for key events
        if (event.soundType === 'six'      && eventSounds.six)     playAudioFile(eventSounds.six)
        else if (event.soundType === 'boundary' && eventSounds.four)    playAudioFile(eventSounds.four)
        else if (event.soundType === 'wicket'   && eventSounds.wicket)  playAudioFile(eventSounds.wicket)

        const commentaryText = await generateCommentary(
          { ...latestBall, teamA, teamB, scoreText: scoreData.scoreText, contextText: scoreData.contextText },
          {}
        )
        console.log(`[Commentary] ${commentaryText}`)
        updateCommentary(commentaryText)

        // Queue full TTS commentary after the event sound finishes
        const audioFile = await textToSpeech(commentaryText, `ball-${ballCount}-${Date.now()}.mp3`)
        if (audioFile) await playAudioFile(audioFile)
        if (ballCount % 20 === 0) cleanupOldAudio()
      }

    } else {
      // ── Score-change fallback (when ball-by-ball is unavailable) ─────────
      const totalRuns    = (scoreData.rawScores || []).reduce((sum, s) => sum + (s.r ?? 0), 0)
      const totalWickets = (scoreData.rawScores || []).reduce((sum, s) => sum + (s.w ?? 0), 0)
      const runsDelta    = totalRuns    - lastTotalRuns
      const wicketDelta  = totalWickets - lastTotalWickets

      if (runsDelta > 0 || wicketDelta > 0) {
        lastTotalRuns    = totalRuns
        lastTotalWickets = totalWickets
        ballCount++

        const isWicket = wicketDelta > 0
        const syntheticBall = {
          over: '-', ballNum: '-',
          batsman: scoreData.striker?.name || 'Batsman',
          bowler:  scoreData.bowler?.name  || 'Bowler',
          runs:    runsDelta, isWicket, isSix: runsDelta === 6, isFour: runsDelta === 4,
          wicketType: isWicket ? 'OUT' : null,
          teamA, teamB, scoreText: scoreData.scoreText,
        }

        const event = isWicket
          ? { soundType: 'wicket', display: 'WICKET!', field: 'OUT!' }
          : getBallEvent(syntheticBall)
        playCrowdSound(event.soundType)
        if (event.display) updateEvent(event.display, event.field)

        // Instant event sound (pre-cached, no API delay)
        if (event.soundType === 'six'      && eventSounds.six)     playAudioFile(eventSounds.six)
        else if (event.soundType === 'boundary' && eventSounds.four)    playAudioFile(eventSounds.four)
        else if (event.soundType === 'wicket'   && eventSounds.wicket)  playAudioFile(eventSounds.wicket)

        const commentaryText = await generateCommentary(syntheticBall, {})
        console.log(`[Commentary/ScoreChange] ${commentaryText}`)
        updateCommentary(commentaryText)

        const audioFile = await textToSpeech(commentaryText, `ball-${ballCount}-${Date.now()}.mp3`)
        if (audioFile) await playAudioFile(audioFile)
        if (ballCount % 20 === 0) cleanupOldAudio()
      }
    }

  } catch (err) {
    console.error('[Poll] Error:', err.message)
  }
}

/**
 * Determine event type, display text, and field position from ball data.
 */
function getBallEvent(ball) {
  if (ball.isWicket) {
    const type = ball.wicketType || 'OUT'
    return {
      soundType: 'wicket',
      display: `WICKET!`,
      field: `${type.toUpperCase()} - ${ball.batsman}`,
    }
  }
  if (ball.isSix) {
    const positions = ['OVER LONG ON', 'OVER LONG OFF', 'OVER MID WICKET', 'OVER SQUARE LEG', 'STRAIGHT SIX']
    return {
      soundType: 'six',
      display: `SIX!`,
      field: positions[Math.floor(Math.random() * positions.length)],
    }
  }
  if (ball.isFour) {
    const positions = ['THROUGH COVERS', 'SQUARE LEG', 'FINE LEG', 'POINT', 'MID ON', 'EXTRA COVER']
    return {
      soundType: 'boundary',
      display: `FOUR!`,
      field: positions[Math.floor(Math.random() * positions.length)],
    }
  }
  if (ball.runs === 2) {
    return { soundType: 'double', display: `2 RUNS`, field: 'GOOD RUNNING' }
  }
  if (ball.runs === 1) {
    return { soundType: 'single', display: ``, field: '1 RUN' }
  }
  return { soundType: 'dot', display: ``, field: 'DOT BALL' }
}

/**
 * Format a Roanuz player_key into a display name.
 * "t_seifert" → "T Seifert"  |  "finn_allen" → "Finn Allen"
 */
function formatPlayerKey(key) {
  if (!key || typeof key !== 'string') return null
  return key.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

/**
 * Parse a single Roanuz v5 ball object into our normalised format.
 * overNum comes from over.index (Roanuz v5 per-over endpoint).
 *
 * Confirmed Roanuz v5 ball structure (from debug logs):
 *   ball.key              — numeric string ID e.g. "1052288"
 *   ball.batsman          — { player_key: "t_seifert", runs: 4, is_wicket: false, ... }
 *   ball.bowler           — { player_key: "l_ngidi", runs: 4, ... }
 *   ball.is_wicket        — boolean (top-level)
 *   ball.ball_in_innings  — "b_1_0_1" (inn_over_ball positional)
 *   ball.milestone        — { type: "half-century", runs: 53, balls_faced: 28 } or null
 *   ball.comment          — full text e.g. "Lungi Ngidi to Tim Seifert, 4 runs"
 */
function parseBallObj(ball, overNum) {
  // ── Runs ──────────────────────────────────────────────────────────────────
  // Roanuz v5: bat runs are in ball.batsman.runs
  let runs = 0
  if (ball.batsman && typeof ball.batsman.runs === 'number') {
    runs = ball.batsman.runs
  } else if (typeof ball.runs_off_bat === 'number') {
    runs = ball.runs_off_bat
  } else if (ball.runs && typeof ball.runs === 'object') {
    runs = ball.runs.bat ?? ball.runs.total ?? 0
  } else if (typeof ball.runs === 'number') {
    runs = ball.runs
  }
  runs = Number(runs) || 0

  // ── Players ───────────────────────────────────────────────────────────────
  // Roanuz v5: batsman/bowler have player_key ("t_seifert") not a .name field
  const batsman = ball.batsman?.name
    || ball.batsman?.player?.name
    || ball.batsman?.short_name
    || formatPlayerKey(ball.batsman?.player_key)
    || (typeof ball.batsman === 'string' ? ball.batsman : null)
    || 'Batsman'

  const bowler = ball.bowler?.name
    || ball.bowler?.player?.name
    || ball.bowler?.short_name
    || formatPlayerKey(ball.bowler?.player_key)
    || (typeof ball.bowler === 'string' ? ball.bowler : null)
    || 'Bowler'

  // ── Wicket ────────────────────────────────────────────────────────────────
  // Roanuz v5: is_wicket is at ball level AND in ball.batsman.is_wicket
  const isWicket = !!(ball.is_wicket || ball.batsman?.is_wicket || ball.wicket || ball.wkt)
  const wicketType = ball.wicket?.kind || ball.wicket?.type || ball.wicket_type
    || (isWicket ? 'OUT' : null)

  // ── Ball position ─────────────────────────────────────────────────────────
  // ball.ball_in_innings = "b_1_0_1" → split → last part = ball number in over
  let ballNum = ball.num ?? ball.number ?? ball.ball_num ?? null
  if (ballNum == null && ball.ball_in_innings) {
    const parts = String(ball.ball_in_innings).split('_')
    ballNum = parseInt(parts[parts.length - 1], 10) || 0
  }
  ballNum = ballNum ?? 0

  // ── Milestone (50, 100, 5-wicket haul, etc.) ──────────────────────────────
  const milestone = ball.milestone?.type || null  // e.g. "half-century", "century"

  // ── Unique key ────────────────────────────────────────────────────────────
  const uniqueKey = ball.key || `${overNum}_${ballNum}_${batsman}`

  return {
    over: overNum ?? 0,
    ball: ballNum,
    uniqueKey,
    runs, batsman, bowler, isWicket, wicketType,
    isSix: runs === 6,
    isFour: runs === 4,
    milestone,
    roanuzComment: ball.comment || null,  // raw Roanuz commentary for AI context
  }
}

function extractBalls(bbbData) {
  try {
    if (!bbbData) {
      if (extractBalls._debugOnce) {
        extractBalls._debugOnce = false
        console.log('[BBB] bbbData is null/undefined — API returned nothing')
      }
      return []
    }

    // ── Debug on first call ────────────────────────────────────────────────
    if (extractBalls._debugOnce) {
      extractBalls._debugOnce = false
      console.log('[BBB] bbbData top keys:', JSON.stringify(Object.keys(bbbData)))
      if (bbbData.over) {
        console.log('[BBB] over keys:', JSON.stringify(Object.keys(bbbData.over)))
        const sample = (bbbData.over.balls || bbbData.over.ball || [])[0]
        if (sample) console.log('[BBB] firstBall FULL:', JSON.stringify(sample).slice(0, 600))
        else console.log('[BBB] over.balls is empty or missing')
      }
    }

    // ── Roanuz v5: ball-by-ball returns ONE over at a time ─────────────────
    //   bbbData = { over: { index: N, balls: [...] }, previous_over_key, next_over_key }
    if (bbbData?.over) {
      const over    = bbbData.over
      const overNum = over.index ?? over.num ?? over.number ?? 0
      const balls   = over.balls || over.ball || []

      const allBalls = (Array.isArray(balls) ? balls : []).map(b => parseBallObj(b, overNum))
      // Most recent ball is last in array → reverse so index 0 = latest
      return allBalls.reverse()
    }

    // ── Fallback: full-innings structure ───────────────────────────────────
    //   { innings: { a_1: { overs: [...] } } }
    const innings = bbbData?.innings || bbbData?.match?.innings || {}
    const allBalls = []

    for (const [innKey, inningsData] of Object.entries(innings)) {
      if (typeof inningsData !== 'object' || !inningsData) continue
      const overs = inningsData?.overs || inningsData?.over || []
      if (!Array.isArray(overs)) continue

      for (const over of overs) {
        const overNum = over.index ?? over.num ?? over.number ?? null
        const balls   = over?.balls || over?.ball || []
        if (!Array.isArray(balls)) continue
        for (const ball of balls) {
          allBalls.push(parseBallObj(ball, overNum ?? 0))
        }
      }
    }

    return allBalls.reverse()
  } catch (err) {
    console.error('[BBB] extractBalls error:', err.message, err.stack?.split('\n')[1])
    return []
  }
}
extractBalls._debugOnce = true

async function fetchAndUpdateTournamentStats(tournamentKey) {
  try {
    const { topScorers, topWicketTakers, playerMap } = await getTournamentTopStats(tournamentKey)
    updateTournamentStats(topScorers, topWicketTakers)
    tournamentPlayerMap = playerMap || {}
    console.log(`[Tournament] Stats updated — ${topScorers.length} scorers, ${topWicketTakers.length} wicket-takers`)
  } catch (err) {
    console.error('[Tournament] Stats update failed:', err.message)
  }
}

/**
 * Build and write the per-player tournament + career stat lines to overlays.
 * Cached to avoid hammering the API on every 8-second poll.
 */
async function enrichPlayerOverlays(striker, nonStriker) {
  const extras = await Promise.all([
    buildPlayerExtra(striker),
    buildPlayerExtra(nonStriker),
  ])
  updatePlayerExtras(extras[0], extras[1])
}

async function buildPlayerExtra(player) {
  if (!player?.name) return null

  const nameLower = player.name.toLowerCase()

  // Tournament stats: cross-reference with fetched playerMap
  let tourn = ' '
  const tStats = tournamentPlayerMap[nameLower]
  if (tStats) {
    const avg = tStats.avg ? Number(tStats.avg).toFixed(1) : '-'
    const sr  = tStats.sr  ? Number(tStats.sr).toFixed(1)  : '-'
    tourn = `Tourn: ${tStats.runs} runs  Avg ${avg}  SR ${sr}`
  }

  // Career stats: fetch once per player key then cache
  let career = ' '
  if (player.key) {
    if (!playerCareerCache[player.key]) {
      const [careerRes, formRes] = await Promise.all([
        getPlayerCareerStats(player.key),
        getPlayerRecentForm(player.key),
      ])
      playerCareerCache[player.key] = {
        careerLine: careerRes?.careerLine || null,
        formLine:   formRes              || null,
      }
    }
    const cached = playerCareerCache[player.key]
    const parts = [cached.careerLine, cached.formLine].filter(Boolean)
    if (parts.length > 0) career = parts.join('  |  ')
  }

  return { tourn, career }
}

async function stopStream() {
  if (pollInterval)      { clearInterval(pollInterval);      pollInterval      = null }
  if (tournamentInterval){ clearInterval(tournamentInterval); tournamentInterval = null }
  if (goLiveTimer)       { clearTimeout(goLiveTimer);         goLiveTimer        = null }
  if (countdownTimer)    { clearInterval(countdownTimer);     countdownTimer     = null }
  if (checkMatchTimer)   { clearInterval(checkMatchTimer);    checkMatchTimer    = null }
  isCountdownMode  = false
  lastTotalRuns    = 0
  lastTotalWickets = 0
  stopFFmpeg()

  // Stop YouTube chat polling
  stopChatPolling()
  currentLiveChatId = null

  // End YouTube broadcast if it was auto-created
  if (currentBroadcastId) {
    try {
      await endLive(currentBroadcastId)
    } catch (err) {
      console.warn('[Stream] Could not end YouTube broadcast:', err.message)
    }
    currentBroadcastId = null
  }

  currentMatchKey = null
  lastBallKey = null
  ballCount = 0
  streamStartTime = null
  currentWatchUrl = null
  tournamentPlayerMap = {}
  console.log('[Stream] Stopped')
}

// ─── REST API ─────────────────────────────────────────────────────────────────

app.post('/stream/start', async (req, res) => {
  const { matchKey, rtmpUrl, teamA, teamB } = req.body

  if (!matchKey || !rtmpUrl) {
    return res.status(400).json({ error: 'matchKey and rtmpUrl are required' })
  }

  if (isStreaming()) {
    return res.status(409).json({ error: 'Stream already active', matchKey: currentMatchKey })
  }

  try {
    await startStream(matchKey, rtmpUrl, teamA || 'Team A', teamB || 'Team B')
    res.json({ success: true, matchKey, message: 'Stream started' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/stream/stop', async (req, res) => {
  await stopStream()
  res.json({ success: true, message: 'Stream stopped' })
})

app.get('/stream/status', (req, res) => {
  res.json({
    streaming: isStreaming(),
    matchKey: currentMatchKey,
    ballsCommented: ballCount,
    broadcastId: currentBroadcastId,
    watchUrl: currentWatchUrl,
    countdown: isCountdownMode,
    uptime: streamStartTime
      ? Math.floor((Date.now() - streamStartTime) / 1000) + 's'
      : null,
  })
})

/**
 * POST /stream/start-auto
 * Body: { matchKey, teamA, teamB, title?, description? }
 *
 * Automatically creates a YouTube Live broadcast, binds the stream,
 * starts FFmpeg, and transitions the broadcast to live.
 * Returns the YouTube watch URL.
 */
app.post('/stream/start-auto', async (req, res) => {
  const { matchKey, teamA, teamB, title, description } = req.body

  if (!matchKey) {
    return res.status(400).json({ error: 'matchKey is required' })
  }

  if (isStreaming()) {
    return res.status(409).json({
      error: 'Stream already active',
      matchKey: currentMatchKey,
      watchUrl: currentWatchUrl,
    })
  }

  // Check YouTube credentials are configured
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_REFRESH_TOKEN) {
    return res.status(503).json({
      error: 'YouTube credentials not configured. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in .env',
    })
  }

  try {
    const broadcastTitle = title || `${teamA || 'Team A'} vs ${teamB || 'Team B'} | LIVE Cricket`
    const broadcastDesc = description ||
      `Watch ${teamA || 'Team A'} vs ${teamB || 'Team B'} LIVE with AI-powered commentary!\n\n` +
      `🏏 Real-time ball-by-ball analysis\n🤖 AI commentary\n📊 Live statistics\n\n` +
      `Powered by CricketTips.ai — Your AI Cricket Assistant`

    // 1. Create YouTube broadcast + stream, get RTMP URL + liveChatId
    console.log('[AutoStream] Creating YouTube Live broadcast...')
    const { broadcastId, rtmpUrl, liveChatId } = await createLiveBroadcast({
      title: broadcastTitle,
      description: broadcastDesc,
    })

    currentBroadcastId = broadcastId
    currentLiveChatId  = liveChatId
    currentWatchUrl    = getWatchUrl(broadcastId)
    console.log(`[AutoStream] Watch URL: ${currentWatchUrl}`)

    // 2. Start FFmpeg + score polling
    await startStream(matchKey, rtmpUrl, teamA || 'Team A', teamB || 'Team B')

    // 3. Transition to 'live' after 20 seconds, then start chat polling
    goLiveTimer = setTimeout(async () => {
      try {
        await goLive(broadcastId)
        console.log(`[AutoStream] Broadcast transitioned to LIVE — ${currentWatchUrl}`)

        // Start chat polling now that broadcast is live
        if (liveChatId) {
          startChatPolling(liveChatId, (messages) => {
            updateChat(messages)
          })
        }
      } catch (err) {
        console.error('[AutoStream] goLive failed:', err.message)
      }
    }, 20000)

    res.json({
      success: true,
      matchKey,
      broadcastId,
      watchUrl: currentWatchUrl,
      message: 'YouTube Live stream started. Will go live in ~20 seconds.',
    })
  } catch (err) {
    console.error('[AutoStream] Failed:', err.message)
    // Clean up if partially created
    if (currentBroadcastId) {
      try { await endLive(currentBroadcastId) } catch {}
      currentBroadcastId = null
      currentWatchUrl = null
    }
    res.status(500).json({ error: err.message })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crickettips-stream', version: '1.0.0' })
})

// ─── Custom Announcement ───────────────────────────────────────────────────────
//  POST /stream/announce         { text }  — show banner + speak on stream (30s auto-clear)
//  DELETE /stream/announce                 — clear immediately

app.post('/stream/announce', async (req, res) => {
  const { text } = req.body
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }

  if (!isStreaming()) {
    return res.status(409).json({ error: 'No active stream' })
  }

  const cleaned = text.trim().slice(0, 200)
  updateAnnouncement(cleaned)

  // Speak the announcement via TTS (queued after any playing audio)
  try {
    const audioFile = await textToSpeech(cleaned, `announce-${Date.now()}.mp3`)
    if (audioFile) await playAudioFile(audioFile)
  } catch (err) {
    console.warn('[Announce] TTS failed:', err.message)
  }

  res.json({ success: true, text: cleaned })
})

app.delete('/stream/announce', (req, res) => {
  clearAnnouncement()
  res.json({ success: true })
})

// ─── Pitch Report ──────────────────────────────────────────────────────────────
//  POST /stream/pitch-report     { text }  — show pitch conditions on stream
//  DELETE /stream/pitch-report             — clear pitch report

app.post('/stream/pitch-report', async (req, res) => {
  const { text } = req.body
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }

  if (!isStreaming()) {
    return res.status(409).json({ error: 'No active stream' })
  }

  const cleaned = text.trim().slice(0, 200)
  // Prefix "PITCH: " if not already there
  const display = cleaned.toUpperCase().startsWith('PITCH') ? cleaned : `PITCH: ${cleaned}`
  updatePitchReport(display)

  // Speak the pitch report once via TTS
  try {
    const audioFile = await textToSpeech(cleaned, `pitch-${Date.now()}.mp3`)
    if (audioFile) await playAudioFile(audioFile)
  } catch (err) {
    console.warn('[PitchReport] TTS failed:', err.message)
  }

  res.json({ success: true, text: display })
})

app.delete('/stream/pitch-report', (req, res) => {
  clearPitchReport()
  res.json({ success: true })
})

// ─── Auto-Stream Mode ─────────────────────────────────────────────────────────
//
//  POST /stream/auto-mode  { enabled: true }   — start watching for live matches
//  POST /stream/auto-mode  { enabled: false }  — stop watching
//  GET  /stream/auto-mode                      — current auto-mode status
//
//  When enabled, the service polls Roanuz every 60 seconds.
//  As soon as a match status = 'started' it auto-creates a YouTube broadcast
//  and starts streaming — no manual action needed.

app.post('/stream/auto-mode', (req, res) => {
  const { enabled } = req.body
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' })
  }

  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_REFRESH_TOKEN) {
    return res.status(503).json({
      error: 'YouTube credentials not configured. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN.',
    })
  }

  if (enabled) {
    autoStream.enable()
  } else {
    autoStream.disable()
  }

  res.json({ success: true, ...autoStream.status() })
})

app.get('/stream/auto-mode', (req, res) => {
  res.json(autoStream.status())
})

// ─── News Video API ───────────────────────────────────────────────────────────
//
//  POST /video/news    { title, excerpt, slug, keywords[] }  — queue a video job
//  POST /video/test    { }  — queue a test video with dummy content
//  GET  /video/status  — current queue status
//  GET  /video/recent  — last 20 completed job results
//  GET  /video/diagnose — check all required env vars + tools

const videoQueue = []
let videoJobRunning = false
const recentVideoJobs = []  // stores last 20 results

function recordJobResult(job, result) {
  recentVideoJobs.unshift({
    slug: job.slug,
    title: job.title?.slice(0, 80),
    success: result.success,
    url: result.url || null,
    error: result.error || null,
    at: new Date().toISOString(),
  })
  if (recentVideoJobs.length > 20) recentVideoJobs.pop()
}

async function processVideoQueue() {
  if (videoJobRunning || videoQueue.length === 0) return
  videoJobRunning = true
  const job = videoQueue.shift()
  console.log(`[VideoQueue] Processing: "${job.title?.slice(0, 60)}" (type: ${job._type || 'news'})`)
  try {
    const result = job._type === 'highlight'
      ? await createHighlightVideo(job)
      : await createNewsVideo(job)
    recordJobResult(job, result)
    if (result.success) {
      console.log(`[VideoQueue] ✓ Done: ${result.url}`)
    } else {
      console.error(`[VideoQueue] ✗ Failed: ${result.error}`)
    }
  } catch (err) {
    console.error('[VideoQueue] Unexpected error:', err.message)
    recordJobResult(job, { success: false, error: err.message })
  } finally {
    videoJobRunning = false
    if (videoQueue.length > 0) processVideoQueue()
  }
}

app.post('/video/news', (req, res) => {
  const { title, excerpt, slug, keywords } = req.body
  if (!title || !slug) {
    return res.status(400).json({ error: 'title and slug are required' })
  }
  videoQueue.push({ title, excerpt: excerpt || title, slug, keywords: keywords || [] })
  console.log(`[VideoQueue] Queued: "${title.slice(0, 50)}" (queue length: ${videoQueue.length})`)
  processVideoQueue()
  res.json({ queued: true, queueLength: videoQueue.length, slug })
})

// POST /video/highlight { topic, stats?, type?, keywords? }
app.post('/video/highlight', (req, res) => {
  const { topic, stats, type, keywords } = req.body
  if (!topic) return res.status(400).json({ error: 'topic is required' })
  const validTypes = ['highlight', 'preview', 'analysis']
  const videoType = validTypes.includes(type) ? type : 'highlight'
  const job = {
    _type: 'highlight',
    topic,
    stats: stats || '',
    type: videoType,
    keywords: keywords || [],
    title: topic,
    slug: `highlight-${Date.now()}`,
  }
  videoQueue.push(job)
  console.log(`[VideoQueue] Highlight queued: "${topic}" (${videoType})`)
  processVideoQueue()
  res.json({ queued: true, queueLength: videoQueue.length, topic, type: videoType })
})

// Manual test — creates a short test video with dummy cricket content
app.post('/video/test', (req, res) => {
  const testJob = {
    title: 'Test: CricketTips.ai News Video Generation',
    excerpt: 'This is an automated test of the YouTube news video pipeline for CricketTips.ai. The pipeline converts blog posts into short YouTube videos.',
    slug: `test-video-${Date.now()}`,
    keywords: ['cricket', 'test', 'crickettips'],
  }
  videoQueue.push(testJob)
  console.log('[VideoQueue] Test video queued')
  processVideoQueue()
  res.json({ queued: true, message: 'Test video job queued — check /video/recent in a few minutes' })
})

app.get('/video/status', (req, res) => {
  res.json({
    running: videoJobRunning,
    queued: videoQueue.length,
    queuedJobs: videoQueue.map(j => ({ slug: j.slug, title: j.title?.slice(0, 60) })),
  })
})

app.get('/video/recent', (req, res) => {
  res.json({ jobs: recentVideoJobs })
})

// Diagnose: check env vars and tools needed for video generation
app.get('/video/diagnose', async (req, res) => {
  const { execSync } = require('child_process')

  const checks = {
    env: {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      GOOGLE_TTS_API_KEY: !!process.env.GOOGLE_TTS_API_KEY,
      YOUTUBE_CLIENT_ID: !!process.env.YOUTUBE_CLIENT_ID,
      YOUTUBE_CLIENT_SECRET: !!process.env.YOUTUBE_CLIENT_SECRET,
      YOUTUBE_REFRESH_TOKEN: !!process.env.YOUTUBE_REFRESH_TOKEN,
    },
    tools: {},
    ready: false,
  }

  // Check ffmpeg
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' })
    checks.tools.ffmpeg = true
  } catch {
    checks.tools.ffmpeg = false
  }
  // Check ffprobe
  try {
    execSync('ffprobe -version', { stdio: 'pipe' })
    checks.tools.ffprobe = true
  } catch {
    checks.tools.ffprobe = false
  }

  checks.ready = (checks.env.OPENAI_API_KEY || checks.env.GOOGLE_TTS_API_KEY) &&
    checks.env.YOUTUBE_CLIENT_ID &&
    checks.env.YOUTUBE_CLIENT_SECRET &&
    checks.env.YOUTUBE_REFRESH_TOKEN &&
    checks.tools.ffmpeg

  res.json(checks)
})

// ─── Start Server ─────────────────────────────────────────────────────────────

// Wire auto-stream module to the stream orchestrator
autoStream.init({
  startStream,
  stopStream,
  isStreaming,
  createLiveBroadcast,
  goLive,
  endLive,
})

// If AUTO_STREAM=true in env, enable auto-mode on startup
if (process.env.AUTO_STREAM === 'true') {
  console.log('[AutoStream] AUTO_STREAM=true — enabling auto-mode on startup')
  autoStream.enable()
}

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CricketTips Stream] Running on port ${PORT}`)
  if (process.env.AUTO_STREAM === 'true') {
    console.log('[CricketTips Stream] Auto-stream mode ON — will start streaming when a match goes live')
  } else {
    console.log('[CricketTips Stream] Ready to stream cricket to YouTube!')
    console.log('[CricketTips Stream] Tip: Set AUTO_STREAM=true in .env to stream automatically')
  }
})
