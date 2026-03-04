/**
 * GET  /api/admin/stream          — proxy GET /stream/status + /stream/auto-mode
 * POST /api/admin/stream          — proxy stream actions
 *
 * Actions:
 *   { action: 'start', matchKey, teamA, teamB, title? }  — manual start
 *   { action: 'stop' }                                    — stop stream
 *   { action: 'auto-on' }                                — enable auto-mode
 *   { action: 'auto-off' }                               — disable auto-mode
 *
 * Admin-only — protected by session role check.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const STREAM_SERVICE_URL =
  process.env.STREAMING_SERVICE_URL ||
  process.env.STREAM_SERVICE_URL ||
  'http://localhost:3001'

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function GET(request: NextRequest) {
  const deny = await requireAdmin(request)
  if (deny) return deny

  try {
    // Fetch stream status + auto-mode status in parallel
    const [statusRes, autoRes] = await Promise.allSettled([
      fetch(`${STREAM_SERVICE_URL}/stream/status`, { cache: 'no-store', signal: AbortSignal.timeout(5000) }),
      fetch(`${STREAM_SERVICE_URL}/stream/auto-mode`, { cache: 'no-store', signal: AbortSignal.timeout(5000) }),
    ])

    const status = statusRes.status === 'fulfilled' ? await statusRes.value.json() : {}
    const auto   = autoRes.status   === 'fulfilled' ? await autoRes.value.json()   : {}

    return NextResponse.json({ ...status, autoMode: auto })
  } catch {
    return NextResponse.json(
      { streaming: false, error: 'Streaming service unreachable' },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const deny = await requireAdmin(request)
  if (deny) return deny

  const body = await request.json()
  const { action, matchKey, teamA, teamB, title, description } = body

  if (action === 'stop') {
    try {
      const res = await fetch(`${STREAM_SERVICE_URL}/stream/stop`, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
      })
      const data = await res.json()
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: 'Streaming service unreachable' }, { status: 503 })
    }
  }

  if (action === 'start') {
    if (!matchKey) {
      return NextResponse.json({ error: 'matchKey is required' }, { status: 400 })
    }

    try {
      const res = await fetch(`${STREAM_SERVICE_URL}/stream/start-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchKey, teamA, teamB, title, description }),
        signal: AbortSignal.timeout(30000), // YouTube API can take a few seconds
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    } catch {
      return NextResponse.json({ error: 'Streaming service unreachable' }, { status: 503 })
    }
  }

  if (action === 'auto-on' || action === 'auto-off') {
    try {
      const res = await fetch(`${STREAM_SERVICE_URL}/stream/auto-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: action === 'auto-on' }),
        signal: AbortSignal.timeout(10000),
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    } catch {
      return NextResponse.json({ error: 'Streaming service unreachable' }, { status: 503 })
    }
  }

  if (action === 'announce') {
    const { text } = body
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 })
    try {
      const res = await fetch(`${STREAM_SERVICE_URL}/stream/announce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(30000), // may wait for TTS
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    } catch {
      return NextResponse.json({ error: 'Streaming service unreachable' }, { status: 503 })
    }
  }

  if (action === 'announce-clear') {
    try {
      const res = await fetch(`${STREAM_SERVICE_URL}/stream/announce`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(5000),
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    } catch {
      return NextResponse.json({ error: 'Streaming service unreachable' }, { status: 503 })
    }
  }

  if (action === 'pitch-report') {
    const { text } = body
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 })
    try {
      const res = await fetch(`${STREAM_SERVICE_URL}/stream/pitch-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(30000),
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    } catch {
      return NextResponse.json({ error: 'Streaming service unreachable' }, { status: 503 })
    }
  }

  if (action === 'pitch-report-clear') {
    try {
      const res = await fetch(`${STREAM_SERVICE_URL}/stream/pitch-report`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(5000),
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    } catch {
      return NextResponse.json({ error: 'Streaming service unreachable' }, { status: 503 })
    }
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}

export const dynamic = 'force-dynamic'
