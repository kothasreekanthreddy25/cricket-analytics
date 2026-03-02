/**
 * Live Score Poller — Roanuz powered
 *
 * Architecture:
 *   Roanuz featured-matches-2/ every 5 seconds — no quota issues
 *   For each live match: fetches match/ detail for real-time scores
 *   Results pushed to all connected clients via Socket.IO
 */

import { Server as SocketIOServer } from 'socket.io'
import axios from 'axios'
import type {
  LiveScoreUpdate,
  ServerToClientEvents,
  ClientToServerEvents,
} from './socket-types'

const POLL_INTERVAL_MS = 5_000
const DISCOVERY_INTERVAL_MS = 60_000

const ROANUZ_PROJECT_KEY = process.env.ROANUZ_PROJECT_KEY || ''
const ROANUZ_API_KEY = process.env.ROANUZ_API_KEY || ''
const ROANUZ_BASE_URL = process.env.ROANUZ_BASE_URL || 'https://api.sports.roanuz.com/v5'

let pollingTimer: NodeJS.Timeout | null = null
let discoveryTimer: NodeJS.Timeout | null = null
let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null
let subscriberCount = 0
let cachedLiveScores: LiveScoreUpdate[] = []
let liveMatchIds: string[] = []
let pollCount = 0
let isPolling = false
let isDiscovering = false

// Roanuz token cache
let roanuzToken: string | null = null
let roanuzTokenExpiry = 0

// ─── Public API ──────────────────────────────────────────────────────────────

export function setIO(server: SocketIOServer) { io = server }
export function incrementSubscribers() { subscriberCount++; maybeStartPolling() }
export function decrementSubscribers() { subscriberCount = Math.max(0, subscriberCount - 1); maybeStopPolling() }
export function getCachedScores(): LiveScoreUpdate[] { return cachedLiveScores }

// ─── Polling Control ─────────────────────────────────────────────────────────

function maybeStartPolling() {
  if (subscriberCount <= 0) return
  if (!pollingTimer) {
    console.log('[LivePoller] Starting — Roanuz 5s polls, subscribers:', subscriberCount)
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

async function roanuzGet(endpoint: string): Promise<any> {
  const token = await getRoanuzToken()
  const res = await axios.get(
    `${ROANUZ_BASE_URL}/cricket/${ROANUZ_PROJECT_KEY}/${endpoint}`,
    { headers: { 'rs-token': token }, timeout: 8000 }
  )
  if (res.data?.error?.http_status_code === 403) {
    throw new Error(`Roanuz 403: ${res.data.error.msg}`)
  }
  return res.data?.data
}

// ─── Score Extraction ─────────────────────────────────────────────────────────

function extractScores(play: any): { scoreA: string; scoreB: string } {
  const innings = play?.innings || {}
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

// ─── Discovery Loop ───────────────────────────────────────────────────────────

async function discoverLiveMatches() {
  if (isDiscovering) return
  isDiscovering = true
  try {
    const data = await roanuzGet('featured-matches-2/')
    const matches = data?.matches || []
    const live = matches.filter((m: any) => m.status === 'live' || m.status === 'started')
    const newIds = live.map((m: any) => m.key)
    const added = newIds.filter((id: string) => !liveMatchIds.includes(id))
    const removed = liveMatchIds.filter(id => !newIds.includes(id))
    liveMatchIds = newIds
    if (added.length > 0) console.log(`[LivePoller] New live matches: ${added.join(', ')}`)
    if (removed.length > 0) console.log(`[LivePoller] Matches ended: ${removed.join(', ')}`)
    if (liveMatchIds.length > 0) {
      console.log(`[LivePoller] Tracking ${liveMatchIds.length} live match(es)`)
    }
  } catch (err: any) {
    console.warn('[LivePoller] Discovery failed:', err.message)
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

    const data = await roanuzGet('featured-matches-2/')
    const allMatches = data?.matches || []
    const updates: LiveScoreUpdate[] = []

    for (const m of allMatches) {
      if (m.status !== 'live' && m.status !== 'started') continue

      // Fetch match detail for real-time scores
      let play = m.play
      try {
        const detail = await roanuzGet(`match/${m.key}/`)
        play = detail?.play || play
      } catch { /* use basic data */ }

      const { scoreA, scoreB } = extractScores(play)

      updates.push({
        matchKey: m.key,
        teamA: m.teams?.a?.name || 'TBD',
        teamB: m.teams?.b?.name || 'TBD',
        scoreA,
        scoreB,
        status: 'live',
        statusNote: play?.result?.msg || m.status || '',
        lastUpdated: Date.now(),
      } as LiveScoreUpdate)
    }

    liveMatchIds = updates.map(u => u.matchKey)

    if (updates.length > 0) {
      io?.emit('score:update', updates)
      if (pollCount % 12 === 1) {
        console.log(
          `[LivePoller] Poll #${pollCount}: ${updates.length} live — ` +
          updates.map(u => `${u.teamA} ${u.scoreA || '—'} vs ${u.teamB} ${u.scoreB || '—'}`).join(' | ') +
          ` → ${subscriberCount} client(s)`
        )
      }
    } else {
      if (cachedLiveScores.length > 0) {
        io?.emit('score:update', [])
        console.log(`[LivePoller] Poll #${pollCount}: No live matches`)
      }
    }

    cachedLiveScores = updates
  } catch (err: any) {
    console.warn(`[LivePoller] Poll #${pollCount} failed:`, err.message)
  } finally {
    isPolling = false
  }
}
