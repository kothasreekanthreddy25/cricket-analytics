/**
 * Auto-Stream Mode
 *
 * Polls CricAPI every 60 seconds for live matches.
 * When a match starts:  → auto-creates YouTube broadcast + starts FFmpeg
 * When match ends:      → stops stream, ends YouTube broadcast
 *
 * Only ONE match is streamed at a time (whichever went live first).
 * Skips matches whose keys appear in the SKIP_MATCH_KEYS env var (comma-separated).
 *
 * Enable:  POST /stream/auto-mode  { enabled: true }
 * Disable: POST /stream/auto-mode  { enabled: false }
 * Status:  GET  /stream/auto-mode
 */

const axios = require('axios')

const CRICAPI_KEY = process.env.CRICKET_API_KEY || process.env.CRICAPI_KEY || ''
const CRICAPI_URL = process.env.CRICKET_API_URL || 'https://api.cricapi.com/v1'

// Interval between polls (ms). Set AUTO_STREAM_POLL_SECONDS env var to override.
const POLL_MS = (parseInt(process.env.AUTO_STREAM_POLL_SECONDS || '60') * 1000)

// ─── Module state ─────────────────────────────────────────────────────────────

let enabled        = false
let pollTimer      = null
let streamingKey   = null   // match key currently being streamed
let stoppedKeys    = new Set() // keys we streamed this session (avoid restarting completed matches)
let onStartStream  = null  // injected callback: async (matchKey, rtmpUrl, teamA, teamB)
let onStopStream   = null  // injected callback: async ()
let onIsStreaming   = null  // injected callback: () => boolean
let createBroadcast = null // injected: async ({ title, description }) => { broadcastId, rtmpUrl }
let goLiveFn       = null  // injected: async (broadcastId)
let endLiveFn      = null  // injected: async (broadcastId)
let activeBroadcastId = null

// ─── CricAPI helpers ──────────────────────────────────────────────────────────

async function cricapiGet(endpoint, params = {}) {
  const res = await axios.get(`${CRICAPI_URL}/${endpoint}`, {
    params: { apikey: CRICAPI_KEY, ...params },
    timeout: 8000,
  })
  if (res.data?.status !== 'success') throw new Error(res.data?.reason || 'CricAPI error')
  return res.data
}

// ─── Detect live matches ───────────────────────────────────────────────────────

async function detectLiveMatch() {
  const data = await cricapiGet('currentMatches', { offset: 0 })
  const matches = data?.data || []

  const skipKeys = new Set(
    (process.env.SKIP_MATCH_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
  )

  // Priority 1: Find first live/in-progress match
  for (const m of matches) {
    if (!m.matchStarted || m.matchEnded) continue
    if (skipKeys.has(m.id)) continue
    if (stoppedKeys.has(m.id)) continue

    const teams = m.teams || []
    return {
      key:          m.id,
      teamA:        teams[0] || 'Team A',
      teamB:        teams[1] || 'Team B',
      name:         m.name || `${teams[0]} vs ${teams[1]}`,
      isUpcoming:   false,
      scheduledTime: null,
    }
  }

  // Priority 2: Find soonest upcoming match within UPCOMING_STREAM_HOURS (default 3h)
  const maxAheadMs = (parseInt(process.env.UPCOMING_STREAM_HOURS || '3')) * 3600000
  const now        = Date.now()
  let soonest      = null
  let soonestDiff  = Infinity

  for (const m of matches) {
    if (skipKeys.has(m.id)) continue
    if (stoppedKeys.has(m.id)) continue
    if (m.matchStarted) continue  // already started
    const rawTime = m.dateTimeGMT || m.date || null
    if (!rawTime) continue
    const matchMs = new Date(rawTime).getTime()
    const diff    = matchMs - now
    if (diff > 0 && diff < maxAheadMs && diff < soonestDiff) {
      soonestDiff = diff
      soonest     = m
    }
  }

  if (soonest) {
    const teams = soonest.teams || []
    return {
      key:           soonest.id,
      teamA:         teams[0] || 'Team A',
      teamB:         teams[1] || 'Team B',
      name:          soonest.name || 'Upcoming Match',
      isUpcoming:    true,
      scheduledTime: soonest.dateTimeGMT || soonest.date,
    }
  }

  return null
}

async function isMatchStillLive(matchKey) {
  try {
    const data = await cricapiGet('match_info', { id: matchKey })
    const m = data?.data
    if (!m) return true
    return m.matchStarted && !m.matchEnded
  } catch {
    return true  // assume live if we can't check (avoid stopping prematurely)
  }
}

// ─── Core poll loop ────────────────────────────────────────────────────────────

async function poll() {
  if (!enabled) return

  try {
    if (onIsStreaming && onIsStreaming()) {
      // Currently streaming — check if the match has ended
      if (streamingKey) {
        const stillLive = await isMatchStillLive(streamingKey)
        if (!stillLive) {
          console.log(`[AutoStream] Match ${streamingKey} has ended — stopping stream`)
          await stopCurrentStream()
        }
      }
    } else {
      // Not streaming — look for a live match to start
      const liveMatch = await detectLiveMatch()

      if (liveMatch) {
        const label = liveMatch.isUpcoming ? 'Upcoming match' : 'Live match'
        console.log(`[AutoStream] ${label} detected: ${liveMatch.name} (${liveMatch.key})`)
        await startAutoStream(liveMatch)
      } else {
        console.log('[AutoStream] No live or upcoming matches found')
      }
    }
  } catch (err) {
    console.error('[AutoStream] Poll error:', err.message)
  }

  // Schedule next poll
  if (enabled) {
    pollTimer = setTimeout(poll, POLL_MS)
  }
}

async function startAutoStream(match) {
  if (!createBroadcast || !onStartStream || !goLiveFn) {
    console.error('[AutoStream] Callbacks not initialised')
    return
  }

  try {
    const liveLabel = match.isUpcoming ? 'COMING SOON' : 'LIVE Cricket'
    const title = `${match.teamA} vs ${match.teamB} | ${liveLabel} — AI Cricket Commentary`
    const description =
      `Watch ${match.teamA} vs ${match.teamB} LIVE with AI-powered ball-by-ball commentary!\n\n` +
      `🏏 Real-time analysis   🤖 AI commentary   📊 Live stats\n\n` +
      `AI Cricket Commentary — Live scores, analysis & more`

    console.log(`[AutoStream] Creating YouTube broadcast for: ${title}`)
    const { broadcastId, rtmpUrl } = await createBroadcast({ title, description })
    activeBroadcastId = broadcastId

    console.log(`[AutoStream] Starting FFmpeg stream to YouTube...`)
    // Pass isUpcoming + scheduledTime so index.js can start countdown mode
    await onStartStream(match.key, rtmpUrl, match.teamA, match.teamB, {
      isUpcoming:    match.isUpcoming    || false,
      scheduledTime: match.scheduledTime || null,
    })
    streamingKey = match.key

    // Transition to live after 20 seconds
    setTimeout(async () => {
      try {
        await goLiveFn(broadcastId)
        console.log(`[AutoStream] Broadcast is LIVE — https://www.youtube.com/watch?v=${broadcastId}`)
      } catch (err) {
        console.error('[AutoStream] goLive failed:', err.message)
      }
    }, 20000)

  } catch (err) {
    console.error('[AutoStream] Failed to start stream:', err.message)
    activeBroadcastId = null
    streamingKey = null
  }
}

async function stopCurrentStream() {
  if (onStopStream) {
    await onStopStream()
  }

  if (activeBroadcastId && endLiveFn) {
    try { await endLiveFn(activeBroadcastId) } catch {}
    activeBroadcastId = null
  }

  if (streamingKey) {
    stoppedKeys.add(streamingKey)
    streamingKey = null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the auto-stream module with callbacks from index.js.
 */
function init({ startStream, stopStream, isStreaming, createLiveBroadcast, goLive, endLive }) {
  onStartStream  = startStream
  onStopStream   = stopStream
  onIsStreaming  = isStreaming
  createBroadcast = createLiveBroadcast
  goLiveFn       = goLive
  endLiveFn      = endLive
}

function enable() {
  if (enabled) return
  enabled = true
  stoppedKeys.clear()
  console.log(`[AutoStream] Enabled — polling every ${POLL_MS / 1000}s`)
  poll()  // immediate first poll
}

function disable() {
  enabled = false
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
  console.log('[AutoStream] Disabled')
}

function status() {
  return {
    enabled,
    streamingKey,
    broadcastId: activeBroadcastId,
    watchUrl: activeBroadcastId ? `https://www.youtube.com/watch?v=${activeBroadcastId}` : null,
    pollIntervalSeconds: POLL_MS / 1000,
    stoppedMatchKeys: [...stoppedKeys],
  }
}

/**
 * Manually mark a match key as "done" so auto-mode won't re-stream it.
 */
function skipMatch(key) {
  stoppedKeys.add(key)
}

module.exports = { init, enable, disable, status, skipMatch }
