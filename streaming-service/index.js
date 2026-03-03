/**
 * CricketTips.ai — YouTube Live Streaming Service
 *
 * REST API:
 *   POST /stream/start   { matchKey, rtmpUrl, teamA, teamB }
 *   POST /stream/stop
 *   GET  /stream/status
 *   GET  /health
 */
require('dotenv').config()
const express = require('express')
const { getBallByBall, getScoreText } = require('./roanuz')
const { generateCommentary } = require('./commentary')
const { textToSpeech, cleanupOldAudio } = require('./tts')
const {
  initFiles,
  updateScore,
  updateCommentary,
  startFFmpeg,
  playAudioFile,
  stopFFmpeg,
  isStreaming,
} = require('./ffmpeg-stream')

const app = express()
app.use(express.json())

// ─── State ────────────────────────────────────────────────────────────────────

let currentMatchKey = null
let pollInterval = null
let lastBallKey = null
let ballCount = 0
let streamStartTime = null

// ─── Stream Orchestrator ──────────────────────────────────────────────────────

async function startStream(matchKey, rtmpUrl, teamA, teamB) {
  console.log(`[Stream] Starting for match: ${matchKey}`)
  console.log(`[Stream] ${teamA} vs ${teamB}`)
  console.log(`[Stream] RTMP: ${rtmpUrl.substring(0, 40)}...`)

  currentMatchKey = matchKey
  streamStartTime = new Date()

  // Init files + start FFmpeg
  initFiles(teamA, teamB)
  startFFmpeg(rtmpUrl)

  // Poll every 8 seconds for new balls
  pollInterval = setInterval(() => pollForNewBalls(matchKey, teamA, teamB), 8000)

  // Initial poll
  await pollForNewBalls(matchKey, teamA, teamB)
  console.log('[Stream] Live polling started')
}

async function pollForNewBalls(matchKey, teamA, teamB) {
  try {
    // Update score display
    const { scoreText } = await getScoreText(matchKey)
    updateScore(scoreText)

    // Get ball-by-ball data
    const bbbData = await getBallByBall(matchKey)
    const balls = extractBalls(bbbData)

    if (balls.length === 0) return

    // Find the latest ball
    const latestBall = balls[0]
    const ballKey = `${latestBall.over}.${latestBall.ball}`

    if (ballKey === lastBallKey) return // No new ball

    lastBallKey = ballKey
    ballCount++

    console.log(`[Stream] New ball: ${ballKey} — ${latestBall.batsman} vs ${latestBall.bowler} — ${latestBall.runs} runs`)

    // Generate AI commentary
    const commentaryText = await generateCommentary(
      { ...latestBall, teamA, teamB, scoreText },
      {}
    )
    console.log(`[Commentary] ${commentaryText}`)

    // Update commentary overlay
    updateCommentary(commentaryText)

    // Generate TTS audio
    const audioFile = await textToSpeech(
      commentaryText,
      `ball-${ballCount}-${Date.now()}.mp3`
    )

    if (audioFile) {
      await playAudioFile(audioFile)
    }

    // Cleanup old audio files
    if (ballCount % 20 === 0) cleanupOldAudio()

  } catch (err) {
    console.error('[Poll] Error:', err.message)
  }
}

function extractBalls(bbbData) {
  try {
    const innings = bbbData?.innings || bbbData?.match?.innings || bbbData || {}
    const allBalls = []

    for (const [, inningsData] of Object.entries(innings)) {
      const overs = inningsData?.overs || []
      if (!Array.isArray(overs)) continue

      for (const over of overs) {
        const balls = over?.balls || []
        for (const ball of balls) {
          allBalls.push({
            over: over.num || ball.over || 0,
            ball: ball.num || ball.ball || 0,
            runs: ball.runs_off_bat || ball.runs || 0,
            batsman: ball.batsman?.name || ball.batsman || 'Batsman',
            bowler: ball.bowler?.name || ball.bowler || 'Bowler',
            isWicket: !!(ball.wicket || ball.is_wicket),
            wicketType: ball.wicket?.kind || ball.wicket_type || null,
            isSix: (ball.runs_off_bat || ball.runs || 0) === 6,
            isFour: (ball.runs_off_bat || ball.runs || 0) === 4,
          })
        }
      }
    }

    // Return most recent ball first
    return allBalls.reverse()
  } catch {
    return []
  }
}

function stopStream() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  stopFFmpeg()
  currentMatchKey = null
  lastBallKey = null
  ballCount = 0
  streamStartTime = null
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

app.post('/stream/stop', (req, res) => {
  stopStream()
  res.json({ success: true, message: 'Stream stopped' })
})

app.get('/stream/status', (req, res) => {
  res.json({
    streaming: isStreaming(),
    matchKey: currentMatchKey,
    ballsCommented: ballCount,
    uptime: streamStartTime
      ? Math.floor((Date.now() - streamStartTime) / 1000) + 's'
      : null,
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crickettips-stream', version: '1.0.0' })
})

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CricketTips Stream] Running on port ${PORT}`)
  console.log('[CricketTips Stream] Ready to stream cricket to YouTube!')
})
