/**
 * Live Score Poller — CricAPI powered
 *
 * Architecture:
 *   ONE call to CricAPI /currentMatches every 5 seconds
 *   covers ALL live matches globally (IPL, T20, ODI, Test — everything)
 *   Results pushed to all connected clients via Socket.IO
 *
 * Fallback: Roanuz (if CricAPI fails)
 */

import { Server as SocketIOServer } from 'socket.io'
import type {
  LiveScoreUpdate,
  ServerToClientEvents,
  ClientToServerEvents,
} from './socket-types'

const POLL_INTERVAL_MS = 5_000        // 5 seconds — all live matches
const DISCOVERY_INTERVAL_MS = 60_000  // re-check for new matches every 60s

const CRICAPI_KEY = process.env.CRICKET_API_KEY || ''
const CRICAPI_URL = process.env.CRICKET_API_URL || 'https://api.cricapi.com/v1'

let pollingTimer: NodeJS.Timeout | null = null
let discoveryTimer: NodeJS.Timeout | null = null
let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null
let subscriberCount = 0
let cachedLiveScores: LiveScoreUpdate[] = []
let liveMatchIds: string[] = []
let pollCount = 0
let isPolling = false
let isDiscovering = false

// ─── Public API ──────────────────────────────────────────────────────────────

export function setIO(server: SocketIOServer) {
  io = server
}

export function incrementSubscribers() {
  subscriberCount++
  maybeStartPolling()
}

export function decrementSubscribers() {
  subscriberCount = Math.max(0, subscriberCount - 1)
  maybeStopPolling()
}

export function getCachedScores(): LiveScoreUpdate[] {
  return cachedLiveScores
}

// ─── Polling Control ─────────────────────────────────────────────────────────

function maybeStartPolling() {
  if (subscriberCount <= 0) return
  if (!pollingTimer) {
    console.log('[LivePoller] Starting — 5s polls for all global matches, subscribers:', subscriberCount)
    pollScores()
    pollingTimer = setInterval(pollScores, POLL_INTERVAL_MS)
  }
  if (!discoveryTimer) {
    discoverLiveMatches()
    discoveryTimer = setInterval(discoverLiveMatches, DISCOVERY_INTERVAL_MS)
  }
}

function maybeStopPolling() {
  if (subscriberCount > 0) return
  if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null }
  if (discoveryTimer) { clearInterval(discoveryTimer); discoveryTimer = null }
  console.log('[LivePoller] Stopped — no subscribers')
}

// ─── CricAPI Fetch ───────────────────────────────────────────────────────────

async function fetchCurrentMatches(): Promise<any[]> {
  const res = await fetch(
    `${CRICAPI_URL}/currentMatches?apikey=${CRICAPI_KEY}&offset=0`,
    { cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`CricAPI currentMatches returned ${res.status}`)
  const json = await res.json()
  if (!json.data) throw new Error(`CricAPI: ${json.reason || 'no data'}`)
  return json.data as any[]
}

async function fetchMatchInfo(matchId: string): Promise<any> {
  const res = await fetch(
    `${CRICAPI_URL}/match_info?apikey=${CRICAPI_KEY}&id=${matchId}`,
    { cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`CricAPI match_info returned ${res.status}`)
  const json = await res.json()
  return json.data
}

// ─── Score Extraction ────────────────────────────────────────────────────────

function extractCricapiScore(match: any): { scoreA: string; scoreB: string } {
  const scores = match.score || []
  const scoreA = scores[0]
    ? `${scores[0].r}/${scores[0].w} (${scores[0].o} ov)`
    : ''
  const scoreB = scores[1]
    ? `${scores[1].r}/${scores[1].w} (${scores[1].o} ov)`
    : ''
  return { scoreA, scoreB }
}

function normalizeMatch(m: any): LiveScoreUpdate | null {
  if (!m || !m.id) return null
  const isLive = m.matchStarted === true && m.matchEnded !== true
  if (!isLive) return null

  const { scoreA, scoreB } = extractCricapiScore(m)
  const teamA = m.teams?.[0] || 'TBD'
  const teamB = m.teams?.[1] || 'TBD'

  return {
    matchKey: m.id,
    teamA,
    teamB,
    scoreA,
    scoreB,
    status: 'live',
    statusNote: m.status || '',
    lastUpdated: Date.now(),
  } as LiveScoreUpdate
}

// ─── Discovery Loop ───────────────────────────────────────────────────────────
// Runs every 60s to find which matches are currently live

async function discoverLiveMatches() {
  if (isDiscovering) return
  isDiscovering = true

  try {
    const allMatches = await fetchCurrentMatches()
    const live = allMatches.filter(
      (m) => m.matchStarted === true && m.matchEnded !== true
    )
    const newIds = live.map((m) => m.id)

    const added = newIds.filter((id) => !liveMatchIds.includes(id))
    const removed = liveMatchIds.filter((id) => !newIds.includes(id))

    liveMatchIds = newIds

    if (added.length > 0) {
      console.log(`[LivePoller] New live matches: ${added.join(', ')}`)
    }
    if (removed.length > 0) {
      console.log(`[LivePoller] Matches ended: ${removed.join(', ')}`)
    }

    if (liveMatchIds.length > 0) {
      console.log(`[LivePoller] Tracking ${liveMatchIds.length} live match(es) globally`)
    }
  } catch (err: any) {
    console.warn('[LivePoller] Discovery failed:', err.message)
  } finally {
    isDiscovering = false
  }
}

// ─── Score Polling Loop ───────────────────────────────────────────────────────
// Runs every 5 seconds — fetches ALL current matches in ONE API call

async function pollScores() {
  if (isPolling) return
  isPolling = true
  pollCount++

  try {
    io?.emit('polling:status', {
      active: true,
      liveMatchCount: liveMatchIds.length,
      connectedClients: subscriberCount,
    })

    // ONE API call covers all live matches globally
    const allMatches = await fetchCurrentMatches()

    const updates: LiveScoreUpdate[] = []

    for (const m of allMatches) {
      const update = normalizeMatch(m)
      if (update) updates.push(update)
    }

    // Update known live match IDs
    liveMatchIds = updates.map((u) => u.matchKey)

    if (updates.length > 0) {
      io?.emit('score:update', updates)
      if (pollCount % 12 === 1) { // log every ~60s
        console.log(
          `[LivePoller] Poll #${pollCount}: ${updates.length} live — ` +
          updates.map((u) => `${u.teamA} ${u.scoreA || '—'} vs ${u.teamB} ${u.scoreB || '—'}`).join(' | ') +
          ` → ${subscriberCount} client(s)`
        )
      }
    } else {
      if (cachedLiveScores.length > 0) {
        io?.emit('score:update', [])
        console.log(`[LivePoller] Poll #${pollCount}: No live matches — cleared client scores`)
      }
    }

    cachedLiveScores = updates
  } catch (err: any) {
    console.warn(`[LivePoller] Poll #${pollCount} failed (CricAPI):`, err.message)

    // Fallback: try Roanuz for T20 WC only
    try {
      const { getMatchDetails } = await import('./roanuz')
      const roanuzUpdates: LiveScoreUpdate[] = []

      for (const matchKey of liveMatchIds) {
        try {
          const detail = await getMatchDetails(matchKey)
          const d = detail?.data
          if (!d || d.status === 'completed') continue

          const teamKeys = Object.keys(d.teams || {})
          const teamA = d.teams?.[teamKeys[0]]?.name || 'TBD'
          const teamB = d.teams?.[teamKeys[1]]?.name || 'TBD'

          roanuzUpdates.push({
            matchKey,
            teamA,
            teamB,
            scoreA: '',
            scoreB: '',
            status: 'live',
            statusNote: d.status_note || '',
            lastUpdated: Date.now(),
          } as LiveScoreUpdate)
        } catch { /* skip */ }
      }

      if (roanuzUpdates.length > 0) {
        io?.emit('score:update', roanuzUpdates)
        cachedLiveScores = roanuzUpdates
      }
    } catch { /* both failed */ }
  } finally {
    isPolling = false
  }
}