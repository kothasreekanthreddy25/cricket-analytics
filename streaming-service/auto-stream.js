/**
 * Auto-Stream Mode
 *
 * Polls Roanuz every 60 seconds for live matches.
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

const BASE_URL    = process.env.ROANUZ_BASE_URL  || 'https://api.sports.roanuz.com/v5'
const PROJECT_KEY = process.env.ROANUZ_PROJECT_KEY || ''
const API_KEY     = process.env.ROANUZ_API_KEY     || ''

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

// ─── Roanuz token (reused from roanuz.js logic) ───────────────────────────────

let cachedToken = null
let tokenExpiry = 0

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry - 5 * 60 * 1000) return cachedToken
  const res = await axios.post(`${BASE_URL}/core/${PROJECT_KEY}/auth/`, { api_key: API_KEY })
  cachedToken = res.data?.data?.token || res.data?.token
  const expires = res.data?.data?.expires || res.data?.expires
  tokenExpiry = expires ? expires * 1000 : Date.now() + 23 * 60 * 60 * 1000
  return cachedToken
}

async function roanuzGet(endpoint) {
  const token = await getToken()
  const res = await axios.get(`${BASE_URL}/cricket/${PROJECT_KEY}/${endpoint}`, {
    headers: { 'rs-token': token },
    timeout: 8000,
  })
  return res.data?.data
}

// ─── Detect live matches ───────────────────────────────────────────────────────

async function detectLiveMatch() {
  const data = await roanuzGet('featured-matches-2/')
  const matches = data?.matches || []

  const skipKeys = new Set(
    (process.env.SKIP_MATCH_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
  )

  // Priority 1: Find first "started" live match
  for (const m of matches) {
    if (m.status !== 'started') continue
    if (skipKeys.has(m.key)) continue
    if (stoppedKeys.has(m.key)) continue

    return {
      key:          m.key,
      teamA:        m.teams?.a?.name || m.team_a?.name || 'Team A',
      teamB:        m.teams?.b?.name || m.team_b?.name || 'Team B',
      name:         m.name || m.short_name || `${m.teams?.a?.name} vs ${m.teams?.b?.name}`,
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
    if (skipKeys.has(m.key)) continue
    if (stoppedKeys.has(m.key)) continue
    // Roanuz v5 possible time fields
    const rawTime = m.start_at || m.scheduled_date || m.local_date || m.date_time_gmt || null
    if (!rawTime) continue
    const matchMs = new Date(rawTime).getTime()
    const diff    = matchMs - now
    if (diff > 0 && diff < maxAheadMs && diff < soonestDiff) {
      soonestDiff = diff
      soonest     = m
    }
  }

  if (soonest) {
    const rawTime = soonest.start_at || soonest.scheduled_date || soonest.local_date || soonest.date_time_gmt
    return {
      key:           soonest.key,
      teamA:         soonest.teams?.a?.name || soonest.team_a?.name || 'Team A',
      teamB:         soonest.teams?.b?.name || soonest.team_b?.name || 'Team B',
      name:          soonest.name || soonest.short_name || 'Upcoming Match',
      isUpcoming:    true,
      scheduledTime: rawTime,
    }
  }

  return null
}

async function isMatchStillLive(matchKey) {
  try {
    const data = await roanuzGet(`match/${matchKey}/`)
    const status = data?.status || data?.match?.status || ''
    return status === 'started' || status === 'in_play' || status === 'live'
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
