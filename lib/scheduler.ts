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
 *
 *   4. pollTelegramStarts — every 1 minute (only if TELEGRAM_BOT_TOKEN set)
 *      Picks up /start <leadId> updates and links the lead to a real
 *      chat_id, so match reminders can actually reach them.
 *
 *   5. sendMatchReminders — every 30 minutes (only if TELEGRAM_BOT_TOKEN set)
 *      Messages opted-in leads about recognizable international matches
 *      starting soon.
 *
 *   6. runWeeklyDigest — once weekly, Mondays ~8 AM IST (only if RESEND_API_KEY set)
 *      Emails opted-in leads the top predictions of the week + accuracy stats.
 *
 *   7. runVideoGeneration — once daily ~7 AM IST (only if OPENAI_API_KEY set)
 *      Generates compliant match-preview video scripts for today's top
 *      international matches and hands them to the render service if
 *      STREAMING_SERVICE_URL is set (see lib/match-video.ts).
 */

import { prisma } from './prisma'
import { roanuzGet } from './roanuz'
import { getMatchDetails as getSportMonksMatch, getFeaturedMatches, normalizeSportMonksMatch } from './sportmonks'
import { runPredictionGeneration } from './prediction-generator'
import { isTelegramConfigured, getTelegramUpdates, sendTelegramMessage } from './telegram'
import { isResendConfigured } from './resend'
import { sendWeeklyDigest } from './weekly-digest'
import { isVideoPipelineConfigured, runDailyVideoGeneration } from './match-video'
import { isIndexNowConfigured, submitUrls } from './indexnow'
import { runEntityCrawl } from './entity-crawler'

// ──────────────────────────────────────────────
// Job 1: Update prediction results
// ──────────────────────────────────────────────

// Numeric keys are SportMonks fixture IDs (the site's primary data source),
// "a-rz--..." keys are Roanuz. Anything else is a seeded slug (e.g.
// "intl_ind_eng_t20_jul2026_1") that matches neither API and can never
// settle, so those are skipped up front.
function keySource(matchKey: string): 'sportmonks' | 'roanuz' | 'unresolvable' {
  if (/^\d+$/.test(matchKey)) return 'sportmonks'
  if (matchKey.startsWith('a-rz--')) return 'roanuz'
  return 'unresolvable'
}

async function resolveSportMonksResult(matchKey: string) {
  try {
    const data = await getSportMonksMatch(matchKey)
    const match = data?.data
    if (!match) return null

    const matchStatus: string = match.status || ''
    const isFinished = matchStatus === 'Finished' || matchStatus === 'Completed'
    if (!isFinished) return { winner: null, status: matchStatus }

    if (match.draw_noresult) return { winner: null, status: 'no_result' }

    const winnerId: number | null = match.winner_team_id || null
    const localteam = match.localteam?.data || match.localteam || {}
    const visitorteam = match.visitorteam?.data || match.visitorteam || {}
    if (winnerId) {
      if (winnerId === localteam.id) return { winner: localteam.name || null, status: 'completed' }
      if (winnerId === visitorteam.id) return { winner: visitorteam.name || null, status: 'completed' }
    }
    return { winner: null, status: matchStatus }
  } catch {
    return null
  }
}

async function resolveRoanuzResult(matchKey: string) {
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
        const source = keySource(analysis.matchKey)
        if (source === 'unresolvable') continue

        const result = source === 'sportmonks'
          ? await resolveSportMonksResult(analysis.matchKey)
          : await resolveRoanuzResult(analysis.matchKey)
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
    // Direct call — an HTTP self-call breaks whenever the configured base URL
    // doesn't match the server's actual host/port (e.g. behind Railway's proxy)
    const data = await runPredictionGeneration()
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
// Job 4: Pick up Telegram /start updates
// ──────────────────────────────────────────────
// Telegram bots can only message users who've messaged them first — this
// job is what turns "typed a Telegram username into the popup" into
// "can actually receive reminders": it watches for /start <leadId> (sent
// via the deep-link button shown after signup) and records the resulting
// chat_id against that lead.

let telegramUpdateOffset: number | undefined

async function pollTelegramStarts() {
  if (!isTelegramConfigured()) return
  try {
    const { updates, nextOffset } = await getTelegramUpdates(telegramUpdateOffset)
    telegramUpdateOffset = nextOffset

    for (const u of updates) {
      const text = u.message?.text || ''
      const chatId = u.message?.chat?.id
      if (!chatId || !text.startsWith('/start')) continue

      const leadId = text.split(' ')[1]
      if (!leadId) continue

      try {
        await prisma.predictionLead.update({
          where: { id: leadId },
          data: { telegramChatId: String(chatId) },
        })
        await sendTelegramMessage(
          String(chatId),
          "✅ You're in! We'll message you before big matches with the AI prediction."
        )
      } catch {
        // Bad/stale leadId in the deep link — nothing to link, skip silently
      }
    }
  } catch (err: any) {
    console.error('[Scheduler] Telegram poll failed:', err.message)
  }
}

// ──────────────────────────────────────────────
// Job 5: Send match reminders
// ──────────────────────────────────────────────

const REMINDER_TEAMS = new Set([
  'india', 'england', 'australia', 'south africa', 'new zealand', 'pakistan',
  'sri lanka', 'bangladesh', 'west indies', 'afghanistan', 'ireland', 'zimbabwe',
])
function isReminderWorthy(team: string): boolean {
  const t = team.toLowerCase().replace(/\s+(w|women)$/i, '').trim()
  return REMINDER_TEAMS.has(t)
}

async function sendMatchReminders() {
  if (!isTelegramConfigured()) return
  try {
    const leads = await prisma.predictionLead.findMany({
      where: { telegramChatId: { not: null } },
      select: { id: true, telegramChatId: true },
    })
    if (leads.length === 0) return

    const data = await getFeaturedMatches()
    const matches = (data?.data || [])
      .map(normalizeSportMonksMatch)
      .filter((m): m is NonNullable<typeof m> => !!m)
      .filter(m => m.status === 'upcoming' && isReminderWorthy(m.teamA) && isReminderWorthy(m.teamB))

    const now = Date.now()
    const dueSoon = matches.filter(m => {
      if (!m.dateTimeGMT) return false
      const startsAt = new Date(m.dateTimeGMT).getTime()
      const minutesUntil = (startsAt - now) / 60000
      // Remind 30-90 minutes before start — wide enough that a 30-min job
      // cadence can't skip a match entirely between runs
      return minutesUntil > 30 && minutesUntil <= 90
    })

    if (dueSoon.length === 0) return

    for (const match of dueSoon) {
      const prediction = await prisma.matchAnalysis.findFirst({
        where: { matchKey: match.key },
        orderBy: { createdAt: 'desc' },
        select: { winProbabilityA: true, winProbabilityB: true },
      })
      const predictionLine = prediction
        ? `\n\n🤖 AI: ${match.teamA} ${prediction.winProbabilityA}% — ${match.teamB} ${prediction.winProbabilityB}%`
        : ''
      const text =
        `🏏 <b>${match.teamA} vs ${match.teamB}</b> starts soon (${match.tournament || 'Cricket'})` +
        predictionLine +
        `\n\nFull analysis: https://crickettips.ai/analysis?match=${match.key}`

      for (const lead of leads) {
        if (!lead.telegramChatId) continue
        try {
          // @@unique([leadId, matchKey]) — this throws if already sent,
          // which is exactly the dedupe check: only message on success.
          await prisma.matchReminder.create({ data: { leadId: lead.id, matchKey: match.key } })
          await sendTelegramMessage(lead.telegramChatId, text)
        } catch {
          // Unique constraint hit (already reminded) or send failed — skip
        }
      }
    }

    console.log(`[Scheduler] Match reminders: ${dueSoon.length} match(es) due, ${leads.length} opted-in lead(s)`)
  } catch (err: any) {
    console.error('[Scheduler] Match reminders failed:', err.message)
  }
}

// ──────────────────────────────────────────────
// Job 6: Weekly digest email (only if RESEND_API_KEY set)
// ──────────────────────────────────────────────

async function runWeeklyDigest() {
  if (!isResendConfigured()) return
  try {
    const { sent, failed } = await sendWeeklyDigest()
    console.log(`[Scheduler] Weekly digest: ${sent} sent, ${failed} failed`)
  } catch (err: any) {
    console.error('[Scheduler] Weekly digest failed:', err.message)
  }
}

// ──────────────────────────────────────────────
// Job 7: Daily match-preview video scripts (only if OPENAI_API_KEY set)
// ──────────────────────────────────────────────

async function runVideoGeneration() {
  if (!isVideoPipelineConfigured()) return
  try {
    const { created, skipped, failed } = await runDailyVideoGeneration()
    console.log(`[Scheduler] Video generation: ${created} created, ${skipped} skipped, ${failed} failed`)
  } catch (err: any) {
    console.error('[Scheduler] Video generation failed:', err.message)
  }
}

// ──────────────────────────────────────────────
// Job 8: Daily IndexNow submission (Bing/Yandex/Seznam)
// ──────────────────────────────────────────────
// No Google Indexing API here — it's contractually restricted to
// JobPosting/BroadcastEvent content, and prediction/blog pages don't
// qualify. Google finds new pages via the sitemap (app/sitemap.ts) on its
// own crawl schedule instead. IndexNow is the one push-based mechanism that
// doesn't require special content types or account verification.

const BASE_URL = 'https://crickettips.ai'
const STATIC_DAILY_PAGES = ['/', '/predictions', '/analysis', '/matches', '/blog', '/odds']

async function submitDailyIndexNowUrls() {
  if (!isIndexNowConfigured()) return
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const recentMatches = await prisma.matchAnalysis.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      distinct: ['matchKey'],
      select: { matchKey: true },
    })
    const matchUrls = recentMatches.map(
      (m) => `${BASE_URL}/analysis?match=${encodeURIComponent(m.matchKey)}`
    )

    let blogUrls: string[] = []
    if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
      try {
        const { client } = await import('../sanity/lib/client')
        const { POSTS_QUERY } = await import('../sanity/lib/queries')
        const posts = await client.fetch<{ slug: { current: string }; publishedAt: string }[]>(
          POSTS_QUERY,
          { limit: 20 }
        )
        blogUrls = (posts || [])
          .filter((p) => p.publishedAt && new Date(p.publishedAt) >= oneDayAgo)
          .map((p) => `${BASE_URL}/blog/${p.slug.current}`)
      } catch {
        // Sanity unreachable — skip blog URLs, still submit matches + static pages
      }
    }

    const staticUrls = STATIC_DAILY_PAGES.map((p) => `${BASE_URL}${p}`)
    const urls = [...staticUrls, ...matchUrls, ...blogUrls]

    const { submitted, ok } = await submitUrls(urls)
    console.log(`[Scheduler] IndexNow submission: ${submitted} URL(s), ${ok ? 'accepted' : 'failed'}`)
  } catch (err: any) {
    console.error('[Scheduler] IndexNow submission failed:', err.message)
  }
}

// ──────────────────────────────────────────────
// Job 9: Daily entity crawl (Team/Player/Venue tables)
// ──────────────────────────────────────────────
// Populates the indexable /teams/[slug], /players/[slug], /venues/[slug]
// pages with real SportMonks data — see lib/entity-crawler.ts for why this
// replaced the old Roanuz-based /teams and AI-hallucinated /players pages.

async function runDailyEntityCrawl() {
  try {
    await runEntityCrawl()
  } catch (err: any) {
    console.error('[Scheduler] Entity crawl failed:', err.message)
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

  // ── Job 4 & 5: Telegram reminders — only if a bot token is configured ──
  if (isTelegramConfigured()) {
    const ONE_MINUTE = 60 * 1000
    const THIRTY_MINUTES = 30 * 60 * 1000

    setTimeout(() => pollTelegramStarts(), 5_000)
    setInterval(() => pollTelegramStarts(), ONE_MINUTE)

    setTimeout(() => sendMatchReminders(), 60_000)
    setInterval(() => sendMatchReminders(), THIRTY_MINUTES)
  }

  // ── Job 6: Weekly digest — check every hour, run once per week (Monday ~8 AM IST) ──
  if (isResendConfigured()) {
    let lastDigestRunDate = ''

    setInterval(() => {
      const now = new Date()
      const istDate = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000)
      const istHour = istDate.getUTCHours()
      const istDay = istDate.getUTCDay() // 0=Sun..6=Sat, in IST
      const todayStr = now.toISOString().slice(0, 10)

      // Monday only, 8-9 AM IST, at most once per calendar day (mirrors the
      // blog job's lastBlogRunDate dedupe — a run can't repeat until the
      // date string changes, which only happens again the following Monday)
      if (istDay === 1 && istHour >= 8 && istHour < 9 && lastDigestRunDate !== todayStr) {
        lastDigestRunDate = todayStr
        runWeeklyDigest()
      }
    }, ONE_HOUR)
  }

  // ── Job 7: Match-preview video scripts — check hourly, run once per day ~7-8 AM IST ──
  // After blog gen (6-7 AM) and prediction gen, so the day's predictions
  // exist before scripts are written from them.
  if (isVideoPipelineConfigured()) {
    let lastVideoRunDate = ''

    setInterval(() => {
      const now = new Date()
      const istDate = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000)
      const istHour = istDate.getUTCHours()
      const todayStr = now.toISOString().slice(0, 10)

      if (istHour >= 7 && istHour < 8 && lastVideoRunDate !== todayStr) {
        lastVideoRunDate = todayStr
        runVideoGeneration()
      }
    }, ONE_HOUR)
  }

  // ── Job 8: IndexNow submission — check hourly, run once per day ~8-9 AM IST ──
  // After blog gen (6-7 AM), predictions, and video scripts (7-8 AM), so
  // the day's fresh content already exists before submission.
  if (isIndexNowConfigured()) {
    let lastIndexNowRunDate = ''

    setInterval(() => {
      const now = new Date()
      const istDate = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000)
      const istHour = istDate.getUTCHours()
      const todayStr = now.toISOString().slice(0, 10)

      if (istHour >= 8 && istHour < 9 && lastIndexNowRunDate !== todayStr) {
        lastIndexNowRunDate = todayStr
        submitDailyIndexNowUrls()
      }
    }, ONE_HOUR)
  }

  // ── Job 9: Entity crawl — check hourly, run once per day ~9-10 AM IST ──
  // After blog gen, predictions, video scripts, and IndexNow, so this
  // week's matches/teams already exist before the crawl runs.
  let lastEntityCrawlRunDate = ''

  setInterval(() => {
    const now = new Date()
    const istDate = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000)
    const istHour = istDate.getUTCHours()
    const todayStr = now.toISOString().slice(0, 10)

    if (istHour >= 9 && istHour < 10 && lastEntityCrawlRunDate !== todayStr) {
      lastEntityCrawlRunDate = todayStr
      runDailyEntityCrawl()
    }
  }, ONE_HOUR)

  console.log('[Scheduler] Jobs registered:')
  console.log('  - Prediction results: every 6 hours (+ on startup)')
  console.log('  - New predictions: every 6 hours (+ on startup)')
  console.log('  - Blog generation: daily at ~6 AM IST')
  console.log(
    isTelegramConfigured()
      ? '  - Telegram reminders: polling every 1 min, sending every 30 min'
      : '  - Telegram reminders: skipped (TELEGRAM_BOT_TOKEN not set)'
  )
  console.log(
    isResendConfigured()
      ? '  - Weekly digest: Mondays ~8 AM IST'
      : '  - Weekly digest: skipped (RESEND_API_KEY not set)'
  )
  console.log(
    isVideoPipelineConfigured()
      ? '  - Match-preview videos: daily ~7 AM IST'
      : '  - Match-preview videos: skipped (OPENAI_API_KEY not set)'
  )
  console.log(
    isIndexNowConfigured()
      ? '  - IndexNow submission: daily ~8 AM IST'
      : '  - IndexNow submission: skipped (INDEXNOW_KEY not set)'
  )
  console.log('  - Entity crawl (teams/players/venues): daily ~9 AM IST')
}
