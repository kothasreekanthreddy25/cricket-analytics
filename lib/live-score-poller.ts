/**
 * Live Score Poller — Roanuz powered (primary) + CricAPI fallback
 *
 * Architecture:
 *   Roanuz featured-matches-2/ every 5 seconds — no quota issues
 *   Falls back to CricAPI if Roanuz fails
 *   Results pushed to all connected clients via Socket.IO
 */

import { Server as SocketIOServer } from 'socket.io'
import axios from 'axios'
import type {
  LiveScoreUpdate,
  ServerToClientEvents,
  ClientToServerEvents,
} from './socket-types'

const POLL_INTERVAL_MS = 5_000        // 5 seconds
const DISCOVERY_INTERVAL_MS = 60_000  // re-check for new matches every 60s

const ROANUZ_PROJECT_KEY = process.env.ROANUZ_PROJECT_KEY || ''
const ROANUZ_API_KEY = process.env.ROANUZ_API_KEY || ''
const ROANUZ_BASE_URL = process.env.ROANUZ_BASE_URL || 'https://api.sports.roanuz.com/v5'
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

// Roanuz auth token cache
let roanuzToken: string | null = null
let roanuzTokenExpiry = 0

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
    console.log('[LivePoller] Starting — 5s polls, Roanuz primary, subscribers:', subscriberCount)
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

// ─── Roanuz Auth ─────────────────────────────────────────────────────────────

async function getRoanuzToken(): Promise<string> {
  if (roanuzToken && Date.now() < roanuzTokenExpiry - 5 * 60 * 1000) {
    return roanuzToken
  }
  const res = await axios.post(
    `${ROANUZ_BASE_URL}/core/${ROANUZ_PROJECT_KEY}/auth/`,
    { api_key: ROANUZ_API_KEY }
  )
  roanuzToken = res.data?.data?.token || res.data?.token
  const expires = res.data?.data?.expires || res.data?.expires
  roanuzTokenExpiry = expires ? expires * 1000 : Date.now() + 23 * 60 * 60 * 1000
  if (!roanuzToken) throw new Error('Roanuz auth: no token in response')
  return roanuzToken
}

// ─── Roanuz Fetch ─────────────────────────────────────────────────────────────

async function fetchRoanuzFeaturedMatches(): Promise<any[]> {
  const token = await getRoanuzToken()
  const res = await axios.get(
    `${ROANUZ_BASE_URL}/cricket/${ROANUZ_PROJECT_KEY}/featured-matches-2/`,
    { headers: { 'rs-token': token }, timeout: 8000 }
  )
  if (res.data?.error?.http_status_code === 403) {
    throw new Error(`Roanuz 403: ${res.data.error.msg}`)
  }
  return res.data?.data?.matches || []
}

async function fetchRoanuzMatchDetail(matchKey: string): Promise<any> {
  const token = await getRoanuzToken()
  const res = await axios.get(
    `${ROANUZ_BASE_URL}/cricket/${ROANUZ_PROJECT_KEY}/match/${matchKey}/`,
    { headers: { 'rs-token': token }, timeout: 8000 }
  )
  return res.data?.data
}

// ─── CricAPI Fetch (fallback) ─────────────────────────────────────────────────

async function fetchCricapiMatches(): Promise<any[]> {
  const res = await fetch(
    `${CRICAPI_URL}/currentMatches?apikey=${CRICAPI_KEY}&offset=0`,
    { cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`CricAPI currentMatches returned ${res.status}`)
  const json = await res.json()
  if (!json.data) throw new Error(`CricAPI: ${json.reason || 'no data'}`)
  return json.data as any[]
}

// ─── Score Extraction ─────────────────────────────────────────────────────────

function extractRoanuzScores(match: any): { scoreA: string; scoreB: string } {
  const innings = match.play?.innings || {}
  const aScores = Object.entries(innings)
    .filter(([k]) => k.startsWith('a_'))
    .map(([, v]: any) => v.score_str)
    .filter(Boolean)
  const bScores = Object.entries(innings)
    .filter(([k]) => k.startsWith('b_'))
    .map(([, v]: any) => v.score_str)
    .filter(Boolean)
  return {
    scoreA: aScores.join(' & ') || '',
    scoreB: bScores.join(' & ') || '',
  }
}

function extractCricapiScore(match: any): { scoreA: string; scoreB: string } {
  const scores = match.score || []
  return {
    scoreA: scores[0] ? `${scores[0].r}/${scores[0].w} (${scores[0].o} ov)` : '',
    scoreB: scores[1] ? `${scores[1].r}/${scores[1].w} (${scores[1].o} ov)` : '',
  }
}

function normalizeRoanuzLive(m: any): LiveScoreUpdate | null {
  if (!m || !m.key) return null
  const isLive = m.status === 'live' || m.status === 'started'
  if (!isLive) return null

  const { scoreA, scoreB } = extractRoanuzScores(m)
  return {
    matchKey: m.key,
    teamA: m.teams?.a?.name || 'TBD',
    teamB: m.teams?.b?.name || 'TBD',
    scoreA,
    scoreB,
    status: 'live',
    statusNote: m.play?.result?.msg || m.status || '',
    lastUpdated: Date.now(),
  } as LiveScoreUpdate
}

function normalizeCricapiLive(m: any): LiveScoreUpdate | null {
  if (!m || !m.id) return null
  const isLive = m.matchStarted === true && m.matchEnded !== true
  if (!isLive) return null
  const { scoreA, scoreB } = extractCricapiScore(m)
  return {
    matchKey: m.id,
    teamA: m.teams?.[0] || 'TBD',
    teamB: m.teams?.[1] || 'TBD',
    scoreA,
    scoreB,
    status: 'live',
    statusNote: m.status || '',
    lastUpdated: Date.now(),
  } as LiveScoreUpdate
}

// ─── Discovery Loop ───────────────────────────────────────────────────────────

async function discoverLiveMatches() {
  if (isDiscovering) return
  isDiscovering = true
  try {
    const matches = await fetchRoanuzFeaturedMatches()
    const live = matches.filter(m => m.status === 'live' || m.status === 'started')
    const newIds = live.map(m => m.key)
    const added = newIds.filter(id => !liveMatchIds.includes(id))
    const removed = liveMatchIds.filter(id => !newIds.includes(id))
    liveMatchIds = newIds
    if (added.length > 0) console.log(`[LivePoller] New live matches: ${added.join(', ')}`)
    if (removed.length > 0) console.log(`[LivePoller] Matches ended: ${removed.join(', ')}`)
    if (liveMatchIds.length > 0) {
      console.log(`[LivePoller] Tracking ${liveMatchIds.length} live match(es)`)
    }
  } catch (err: any) {
    console.warn('[LivePoller] Discovery (Roanuz) failed:', err.message)
    // Fallback discovery via CricAPI
    try {
      const matches = await fetchCricapiMatches()
      const live = matches.filter(m => m.matchStarted === true && m.matchEnded !== true)
      liveMatchIds = live.map(m => m.id)
    } catch { /* both failed */ }
  } finally {
    isDiscovering = false
  }
}

// ─── Score Polling Loop ───────────────────────────────────────────────────────

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

    // Primary: Roanuz featured-matches-2 (no quota)
    const allMatches = await fetchRoanuzFeaturedMatches()
    const updates: LiveScoreUpdate[] = []

    for (const m of allMatches) {
      // For live matches, fetch detail to get up-to-date scores
      if (m.status === 'live' || m.status === 'started') {
        try {
          const detail = await fetchRoanuzMatchDetail(m.key)
          const update = normalizeRoanuzLive({ ...m, play: detail?.play })
          if (update) updates.push(update)
        } catch {
          // Use basic data from featured-matches-2 if detail fails
          const update = normalizeRoanuzLive(m)
          if (update) updates.push(update)
        }
      }
    }

    liveMatchIds = updates.map(u => u.matchKey)

    if (updates.length > 0) {
      io?.emit('score:update', updates)
      if (pollCount % 12 === 1) {
        console.log(
          `[LivePoller] Poll #${pollCount} (Roanuz): ${updates.length} live — ` +
          updates.map(u => `${u.teamA} ${u.scoreA || '—'} vs ${u.teamB} ${u.scoreB || '—'}`).join(' | ') +
          ` → ${subscriberCount} client(s)`
        )
      }
    } else {
      if (cachedLiveScores.length > 0) {
        io?.emit('score:update', [])
        console.log(`[LivePoller] Poll #${pollCount}: No live matches — cleared scores`)
      }
    }

    cachedLiveScores = updates
  } catch (err: any) {
    console.warn(`[LivePoller] Poll #${pollCount} Roanuz failed:`, err.message)

    // Fallback: CricAPI
    try {
      const allMatches = await fetchCricapiMatches()
      const updates: LiveScoreUpdate[] = allMatches
        .map(normalizeCricapiLive)
        .filter(Boolean) as LiveScoreUpdate[]

      liveMatchIds = updates.map(u => u.matchKey)

      if (updates.length > 0) {
        io?.emit('score:update', updates)
        cachedLiveScores = updates
      } else if (cachedLiveScores.length > 0) {
        io?.emit('score:update', [])
        cachedLiveScores = []
      }
    } catch (err2: any) {
      console.warn(`[LivePoller] CricAPI fallback also failed:`, err2.message)
    }
  } finally {
    isPolling = false
  }
}
