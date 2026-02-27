/**
 * Background Scheduler
 *
 * Runs inside the Next.js server process (via instrumentation.ts).
 * No external cron service needed.
 *
 * Jobs:
 *   1. updatePredictionResults — every 6 hours
 *      Checks Roanuz for completed matches and persists results to DB.
 *
 *   2. generateNewPredictions — every 6 hours
 *      Auto-generates predictions for upcoming matches that don't have recent analysis.
 *
 *   3. generateBlogPosts — once daily at ~6:00 AM IST
 *      Scrapes RSS feeds → AI rewrites → publishes to Sanity.
 */

import { prisma } from './prisma'
import { roanuzGet } from './roanuz'

// ──────────────────────────────────────────────
// Job 1: Update prediction results
// ──────────────────────────────────────────────

async function resolveMatchResult(matchKey: string) {
  try {
    const data = await roanuzGet(`match/${matchKey}/`)
    // Roanuz v5: match data is at data.data (no .match nesting)
    const match = data?.data?.match || data?.data
    if (!match) return null

    const matchStatus: string = match.status || ''
    if (matchStatus !== 'completed' && matchStatus !== 'finished') {
      return { winner: null, status: matchStatus }
    }

    // Roanuz v5: winner is "a" or "b", teams is { a: {...}, b: {...} }
    const winnerSide: string | null = match.winner || null
    const teams = match.teams || {}

    if (winnerSide && teams[winnerSide]) {
      return {
        winner: teams[winnerSide].name || winnerSide,
        status: matchStatus,
      }
    }

    // Fallback: legacy result object
    const result = match.result || match.match_result || {}
    const winnerKey =
      result.winner_team_key ||
      result.winner_key ||
      result.winning_team_key ||
      null

    if (winnerKey) {
      if (Array.isArray(teams)) {
        const found = teams.find((t: any) => t.key === winnerKey || t.team_key === winnerKey)
        return { winner: found?.name || winnerKey, status: matchStatus }
      } else {
        for (const side of Object.values(teams) as any[]) {
          if (side?.key === winnerKey) {
            return { winner: side.name || winnerKey, status: matchStatus }
          }
        }
        return { winner: winnerKey, status: matchStatus }
      }
    }

    const playStatus = match.play_status || ''
    if (result.result_type === 'no_result' || result.result_type === 'tie' || playStatus === 'no_result') {
      return { winner: null, status: 'no_result' }
    }

    return { winner: null, status: matchStatus }
  } catch {
    return null
  }
}

async function updatePredictionResults() {
  console.log('[Scheduler] Running prediction results update...')
  try {
    const allAnalysis = await prisma.matchAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Deduplicate
    const seen = new Set<string>()
    const unique = allAnalysis.filter((a) => {
      if (seen.has(a.matchKey)) return false
      seen.add(a.matchKey)
      return true
    })

    // Filter to pending only
    const pending = unique.filter((a) => {
      const raw = a.rawData as any
      return (
        !raw?.actualWinner &&
        raw?.matchResultStatus !== 'no_result' &&
        raw?.matchResultStatus !== 'tie'
      )
    })

    let updated = 0
    for (const analysis of pending) {
      try {
        const result = await resolveMatchResult(analysis.matchKey)
        if (!result) continue

        const { winner, status } = result
        if (
          winner ||
          status === 'completed' ||
          status === 'finished' ||
          status === 'no_result' ||
          status === 'tie'
        ) {
          const rawData = (analysis.rawData as any) || {}
          await prisma.matchAnalysis.update({
            where: { id: analysis.id },
            data: {
              rawData: {
                ...rawData,
                actualWinner: winner,
                matchResultStatus: status,
                resultUpdatedAt: new Date().toISOString(),
              },
            },
          })
          updated++
        }

        // Rate limit — 300ms between API calls
        await new Promise((r) => setTimeout(r, 300))
      } catch (err: any) {
        console.warn(
          `[Scheduler] Error updating ${analysis.matchKey}:`,
          err.message
        )
      }
    }

    console.log(
      `[Scheduler] Prediction update done — ${updated} updated, ${pending.length - updated} unchanged`
    )
  } catch (err: any) {
    console.error('[Scheduler] Prediction update failed:', err.message)
  }
}

// ──────────────────────────────────────────────
// Job 2: Auto-generate predictions for upcoming matches
// ──────────────────────────────────────────────

async function generateNewPredictions() {
  console.log('[Scheduler] Running auto-prediction generation...')
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
      process.env.BETTER_AUTH_URL ||
      'http://localhost:3000'

    const res = await fetch(`${baseUrl}/api/predictions/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    console.log(
      `[Scheduler] Prediction generation done: ${data.generated || 0} new, ${data.skipped || 0} skipped`
    )
  } catch (err: any) {
    console.error('[Scheduler] Prediction generation failed:', err.message)
  }
}

// ──────────────────────────────────────────────
// Job 3: Auto-generate blog posts
// ──────────────────────────────────────────────

async function generateBlogPosts() {
  // Only run if Sanity + OpenAI are configured
  if (
    !process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    !process.env.OPENAI_API_KEY ||
    !process.env.SANITY_API_WRITE_TOKEN
  ) {
    console.log('[Scheduler] Blog generation skipped — Sanity/OpenAI not configured')
    return
  }

  console.log('[Scheduler] Running blog auto-generation...')
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
      process.env.BETTER_AUTH_URL ||
      'http://localhost:3000'

    const res = await fetch(`${baseUrl}/api/blog/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 5 }),
    })
    const data = await res.json()
    console.log(`[Scheduler] Blog generation done:`, data.message || data.error)
  } catch (err: any) {
    console.error('[Scheduler] Blog generation failed:', err.message)
  }
}

// ──────────────────────────────────────────────
// Scheduler Engine
// ──────────────────────────────────────────────

const SIX_HOURS = 6 * 60 * 60 * 1000
const ONE_HOUR = 60 * 60 * 1000

let started = false

export function startScheduler() {
  if (started) return
  started = true

  console.log('[Scheduler] Starting background jobs...')

  // ── Job 1: Prediction results — run immediately + every 6 hours ──
  setTimeout(() => {
    updatePredictionResults()
  }, 10_000) // 10 seconds after server start

  setInterval(() => {
    updatePredictionResults()
  }, SIX_HOURS)

  // ── Job 2: Auto-generate predictions — 30s after start + every 6 hours ──
  setTimeout(() => {
    generateNewPredictions()
  }, 30_000) // 30 seconds after server start (after results update)

  setInterval(() => {
    generateNewPredictions()
  }, SIX_HOURS)

  // ── Job 3: Blog generation — check every hour, run once per day at ~6 AM IST ──
  let lastBlogRunDate = ''

  setInterval(() => {
    const now = new Date()
    // IST = UTC + 5:30
    const istHour = (now.getUTCHours() + 5) % 24 + (now.getUTCMinutes() >= 30 ? 1 : 0)
    const todayStr = now.toISOString().slice(0, 10)

    // Run once per day between 6-7 AM IST
    if (istHour >= 6 && istHour < 7 && lastBlogRunDate !== todayStr) {
      lastBlogRunDate = todayStr
      generateBlogPosts()
    }
  }, ONE_HOUR)

  console.log('[Scheduler] Jobs registered:')
  console.log('  - Prediction results: every 6 hours (+ on startup)')
  console.log('  - New predictions: every 6 hours (+ on startup)')
  console.log('  - Blog generation: daily at ~6 AM IST')
}
