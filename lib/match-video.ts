/**
 * Daily match-preview video pipeline — phase 1 (data + script only).
 *
 * Flow: pick today's top matches → assemble ONLY real data (prediction from
 * DB, predicted/confirmed XIs and Fantasy XI from SportMonks lineups) →
 * GPT-4o-mini writes a 60-90s narration script → compliance filter → store
 * as a VideoJob → optionally hand off to the Hetzner render service.
 *
 * Rendering/upload is a later phase: without STREAMING_SERVICE_URL support
 * for /video/match-preview, jobs simply stop at status "script_ready" and
 * are visible via GET /api/videos/generate.
 *
 * Compliance notes (YouTube gambling + spam policy):
 *   - Hard cap of MAX_VIDEOS_PER_RUN per day, one video per match ever
 *     (VideoJob @@unique([matchKey, kind])).
 *   - Script is validated against BANNED_PATTERNS (no "guaranteed win" /
 *     betting-CTA language). One retry, then the job fails rather than
 *     publishing something non-compliant.
 *   - Fixed disclaimer is appended in code, never left to the model.
 *   - Description links only to crickettips.ai pages — no bookmaker links.
 */

import OpenAI from 'openai'
import { prisma } from './prisma'
import { getFeaturedMatches, normalizeSportMonksMatch } from './sportmonks'
import {
  resolveMatchInfo,
  getPredictedXIs,
  buildFantasyXI,
  isDummy,
  type MatchInfo,
  type KnownXIs,
  type FantasyRecommendation,
} from './ai-match-preview'

const BASE_URL = 'https://crickettips.ai'
const MAX_VIDEOS_PER_RUN = 2
const KIND = 'match_preview'

export function isVideoPipelineConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

/** Lazy OpenAI client, same pattern as lib/blog-generator.ts */
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

// ── Compliance filter ─────────────────────────────────────────────────────────

// Language that turns "analysis content" into "gambling promotion" in
// YouTube's eyes. Checked case-insensitively across every narration string.
const BANNED_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /guarantee[ds]?/i, label: 'guaranteed outcome claim' },
  { pattern: /sure\s*(win|shot|bet|thing)/i, label: 'sure-win claim' },
  { pattern: /100%\s*(win|accurate|certain|sure)/i, label: '100% certainty claim' },
  { pattern: /can'?t\s+lose/i, label: "can't-lose claim" },
  { pattern: /fixed\s+(match|odds|game)/i, label: 'match-fixing language' },
  { pattern: /place\s+(your\s+)?bets?/i, label: 'betting call-to-action' },
  { pattern: /bet\s+(now|today|on)/i, label: 'betting call-to-action' },
  { pattern: /\b(bookmaker|bookie|1xbet|betway|stake\.com|parimatch|dafabet)\b/i, label: 'bookmaker mention' },
  { pattern: /free\s+money|easy\s+money|double\s+your/i, label: 'financial-return claim' },
]

export function findComplianceViolations(texts: string[]): string[] {
  const violations: string[] = []
  for (const text of texts) {
    for (const { pattern, label } of BANNED_PATTERNS) {
      if (pattern.test(text)) violations.push(`${label}: "${text.slice(0, 80)}"`)
    }
  }
  return violations
}

// Appended in code so the model can neither reword nor drop it.
const FIXED_DISCLAIMER =
  'This is AI-generated analysis for informational and entertainment purposes only. ' +
  'Predictions are probabilities, not guarantees. 18+. If you gamble, gamble responsibly.'

// ── Match selection ───────────────────────────────────────────────────────────

// Same full-member priority list the Telegram reminder job uses — a video
// about a domestic fixture nobody searches for is wasted render time.
const VIDEO_TEAMS = new Set([
  'india', 'england', 'australia', 'south africa', 'new zealand', 'pakistan',
  'sri lanka', 'bangladesh', 'west indies', 'afghanistan', 'ireland', 'zimbabwe',
])
function isVideoWorthy(team: string): boolean {
  const t = (team || '').toLowerCase().replace(/\s+(w|women)$/i, '').trim()
  return VIDEO_TEAMS.has(t)
}

export interface VideoCandidate {
  matchKey: string
  teamA: string
  teamB: string
  tournament: string
  startAt: string
}

/**
 * Upcoming international matches starting 3-30 hours from now — close enough
 * to be "today's match", far enough out that a preview published now still
 * has time to be seen before the toss.
 */
export async function selectMatchesForVideo(max = MAX_VIDEOS_PER_RUN): Promise<VideoCandidate[]> {
  const data = await getFeaturedMatches()
  const now = Date.now()

  return (data?.data || [])
    .map(normalizeSportMonksMatch)
    .filter((m): m is NonNullable<typeof m> => !!m)
    .filter(m =>
      m.status === 'upcoming' &&
      !isDummy(m.teamA) && !isDummy(m.teamB) &&
      isVideoWorthy(m.teamA) && isVideoWorthy(m.teamB) &&
      !!m.dateTimeGMT
    )
    .map(m => ({
      matchKey: m.key,
      teamA: m.teamA,
      teamB: m.teamB,
      tournament: m.tournament || 'Cricket',
      startAt: m.dateTimeGMT as string,
      hoursUntil: (new Date(m.dateTimeGMT as string).getTime() - now) / 3_600_000,
    }))
    .filter(m => m.hoursUntil >= 3 && m.hoursUntil <= 30)
    .sort((a, b) => a.hoursUntil - b.hoursUntil)
    .slice(0, max)
    .map(({ hoursUntil: _hoursUntil, ...rest }) => rest)
}

// ── Script generation ─────────────────────────────────────────────────────────

export interface VideoScene {
  id: string
  heading: string
  narration: string
  onScreen: string[]
}

export interface VideoScript {
  title: string
  hook: string
  scenes: VideoScene[]
  description: string
  hashtags: string[]
  disclaimer: string
}

interface PredictionData {
  probA: number
  probB: number
  predictedWinner: string
  confidence: string
}

async function getStoredPrediction(matchKey: string, teamA: string, teamB: string): Promise<PredictionData | null> {
  const rec = await prisma.matchAnalysis.findFirst({
    where: { matchKey },
    orderBy: { createdAt: 'desc' },
    select: { winProbabilityA: true, winProbabilityB: true, confidence: true },
  })
  if (!rec) return null
  const norm = (p: number) => (p > 1 ? p / 100 : p)
  const rawA = norm(Math.max(0.01, rec.winProbabilityA))
  const rawB = norm(Math.max(0.01, rec.winProbabilityB))
  const total = rawA + rawB
  const pA = total > 0 ? rawA / total : 0.5
  return {
    probA: Math.round(pA * 100),
    probB: Math.round((1 - pA) * 100),
    predictedWinner: pA >= 0.5 ? teamA : teamB,
    confidence: rec.confidence,
  }
}

function buildDataBrief(
  info: MatchInfo,
  prediction: PredictionData | null,
  xis: KnownXIs,
  fantasy: FantasyRecommendation | null
): string {
  const lines: string[] = [
    `MATCH: ${info.teamA} vs ${info.teamB}`,
    `TOURNAMENT: ${info.tournament}`,
    `FORMAT: ${info.format}`,
    info.venue ? `VENUE: ${info.venue}` : '',
    info.startAt ? `START (UTC): ${info.startAt}` : '',
  ]
  if (prediction) {
    lines.push(
      `AI PREDICTION: ${info.teamA} ${prediction.probA}% — ${info.teamB} ${prediction.probB}% (favours ${prediction.predictedWinner}, ${prediction.confidence} confidence)`
    )
  }
  if (xis.teamA.length > 0) {
    lines.push(`${info.teamA} XI (${xis.teamAConfirmed ? 'CONFIRMED' : 'predicted from last match'}): ${xis.teamA.map(p => p.name).join(', ')}`)
  }
  if (xis.teamB.length > 0) {
    lines.push(`${info.teamB} XI (${xis.teamBConfirmed ? 'CONFIRMED' : 'predicted from last match'}): ${xis.teamB.map(p => p.name).join(', ')}`)
  }
  if (fantasy) {
    lines.push(`FANTASY CAPTAIN: ${fantasy.captain.name} (${fantasy.captain.team})${fantasy.captain.statLine ? ` — ${fantasy.captain.statLine}` : ''}`)
    lines.push(`FANTASY VICE-CAPTAIN: ${fantasy.viceCaptain.name} (${fantasy.viceCaptain.team})${fantasy.viceCaptain.statLine ? ` — ${fantasy.viceCaptain.statLine}` : ''}`)
    const others = fantasy.xi.filter(p => !p.isCaptain && !p.isViceCaptain).slice(0, 3)
    for (const p of others) {
      lines.push(`FANTASY PICK: ${p.name} (${p.team}, ${p.role})${p.statLine ? ` — ${p.statLine}` : ''}`)
    }
  }
  return lines.filter(Boolean).join('\n')
}

const SCRIPT_SYSTEM_PROMPT = `You are a scriptwriter for short-form cricket videos (YouTube Shorts / Instagram Reels) for CricketTips.ai, an AI cricket analytics site.

Write a 60-90 second vertical-video script. Energetic sports-media tone, but factual.

HARD RULES — violating any of these makes the output unusable:
- Use ONLY the facts in the DATA brief. Never invent stats, player names, records, or form claims.
- Predictions are probabilities. NEVER use words like "guaranteed", "sure win", "can't lose", "100%", "lock", or any betting call-to-action ("place your bets", "bet now").
- Never mention bookmakers, odds sites, or promo codes.
- If the XI is marked "predicted from last match", say "predicted XI", not "confirmed".
- Total narration across all scenes: 140-200 words (that's ~60-90s spoken).

Output ONLY valid JSON:
{
  "title": "YouTube title, max 90 chars, includes both team names",
  "hook": "First spoken line, max 15 words, makes viewer stop scrolling",
  "scenes": [
    { "id": "intro",      "heading": "on-screen heading", "narration": "...", "onScreen": ["bullet", "bullet"] },
    { "id": "prediction", "heading": "...", "narration": "...", "onScreen": ["..."] },
    { "id": "fantasy",    "heading": "...", "narration": "...", "onScreen": ["..."] },
    { "id": "outro",      "heading": "...", "narration": "closing line directing viewers to crickettips.ai for the full analysis", "onScreen": ["crickettips.ai"] }
  ],
  "hashtags": ["#cricket", "#shorts", ...5-8 total, relevant to the teams/tournament]
}`

export async function generateVideoScript(
  info: MatchInfo,
  prediction: PredictionData | null,
  xis: KnownXIs,
  fantasy: FantasyRecommendation | null
): Promise<VideoScript> {
  const brief = buildDataBrief(info, prediction, xis, fantasy)

  const attempt = async (extraInstruction?: string): Promise<Omit<VideoScript, 'description' | 'disclaimer'>> => {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SCRIPT_SYSTEM_PROMPT },
        { role: 'user', content: `DATA:\n${brief}\n\nWrite the script JSON now.${extraInstruction ? `\n\nIMPORTANT: ${extraInstruction}` : ''}` },
      ],
      temperature: 0.7,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('Empty AI response')
    const data = JSON.parse(raw)
    if (!data.title || !Array.isArray(data.scenes) || data.scenes.length === 0) {
      throw new Error('Invalid script structure from AI')
    }
    return data
  }

  let script = await attempt()
  let violations = findComplianceViolations([
    script.title,
    script.hook,
    ...script.scenes.flatMap((s: VideoScene) => [s.narration, s.heading, ...(s.onScreen || [])]),
  ])

  if (violations.length > 0) {
    // One stricter retry, then fail — never publish a non-compliant script.
    script = await attempt(
      `Your previous draft used prohibited language (${violations.map(v => v.split(':')[0]).join('; ')}). Remove ALL such wording.`
    )
    violations = findComplianceViolations([
      script.title,
      script.hook,
      ...script.scenes.flatMap((s: VideoScene) => [s.narration, s.heading, ...(s.onScreen || [])]),
    ])
    if (violations.length > 0) {
      throw new Error(`Script failed compliance after retry: ${violations.join(' | ')}`)
    }
  }

  const description = [
    `AI-generated ${info.format} preview: ${info.teamA} vs ${info.teamB} (${info.tournament}).`,
    '',
    `📊 Full match analysis: ${BASE_URL}/analysis?match=${info.matchKey}`,
    `📈 Our complete prediction track record (wins AND losses): ${BASE_URL}/predictions/history`,
    '',
    FIXED_DISCLAIMER,
  ].join('\n')

  return {
    title: script.title.slice(0, 95),
    hook: script.hook,
    scenes: script.scenes,
    description,
    hashtags: Array.isArray(script.hashtags) ? script.hashtags.slice(0, 8) : ['#cricket', '#shorts'],
    disclaimer: FIXED_DISCLAIMER,
  }
}

// ── Orchestration ─────────────────────────────────────────────────────────────

export interface VideoRunResult {
  created: number
  skipped: number
  failed: number
  jobs: { matchKey: string; title?: string; status: string; detail?: string }[]
}

export async function runDailyVideoGeneration(): Promise<VideoRunResult> {
  const result: VideoRunResult = { created: 0, skipped: 0, failed: 0, jobs: [] }
  if (!isVideoPipelineConfigured()) return result

  const candidates = await selectMatchesForVideo()
  console.log(`[VideoGen] ${candidates.length} candidate match(es) for today's videos`)

  for (const candidate of candidates) {
    const existing = await prisma.videoJob.findUnique({
      where: { matchKey_kind: { matchKey: candidate.matchKey, kind: KIND } },
    })
    if (existing) {
      result.skipped++
      result.jobs.push({ matchKey: candidate.matchKey, status: 'skipped', detail: 'video already exists for this match' })
      continue
    }

    try {
      const info = await resolveMatchInfo(candidate.matchKey)
      if (!info) throw new Error('Could not resolve match info')

      const [prediction, xis] = await Promise.all([
        getStoredPrediction(candidate.matchKey, info.teamA, info.teamB),
        getPredictedXIs(info.teamAId, info.teamBId, info.ownLineup),
      ])
      // Fantasy is best-effort — buildFantasyXI returns null without real
      // lineups for both sides, and the script simply omits that scene.
      const fantasy = await buildFantasyXI(xis, info.teamA, info.teamB, info.format).catch(() => null)

      const script = await generateVideoScript(info, prediction, xis, fantasy)

      const job = await prisma.videoJob.create({
        data: {
          matchKey: candidate.matchKey,
          kind: KIND,
          teamA: info.teamA,
          teamB: info.teamB,
          tournament: info.tournament,
          matchDate: info.startAt ? new Date(info.startAt) : null,
          title: script.title,
          script: script as any,
          status: 'script_ready',
        },
      })

      // Hand off to the render service if it's configured — phase 2 adds the
      // actual /video/match-preview implementation on the Hetzner box.
      const renderUrl = process.env.STREAMING_SERVICE_URL
      if (renderUrl) {
        try {
          const res = await fetch(`${renderUrl}/video/match-preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: job.id, ...script }),
            signal: AbortSignal.timeout(10_000),
          })
          await prisma.videoJob.update({
            where: { id: job.id },
            data: res.ok
              ? { status: 'render_triggered' }
              : { status: 'render_failed', error: `Render service returned ${res.status}` },
          })
        } catch (err: any) {
          await prisma.videoJob.update({
            where: { id: job.id },
            data: { status: 'render_failed', error: `Render trigger failed: ${err.message}` },
          })
        }
      }

      result.created++
      result.jobs.push({ matchKey: candidate.matchKey, title: script.title, status: 'created' })
      console.log(`[VideoGen] Script ready: ${script.title}`)
    } catch (err: any) {
      result.failed++
      result.jobs.push({ matchKey: candidate.matchKey, status: 'failed', detail: err.message })
      console.error(`[VideoGen] Failed for ${candidate.matchKey}:`, err.message)
      // Record the failure so the daily job doesn't retry a match whose data
      // is fundamentally broken forever — but only if no job row exists yet.
      try {
        await prisma.videoJob.create({
          data: {
            matchKey: candidate.matchKey,
            kind: KIND,
            teamA: candidate.teamA,
            teamB: candidate.teamB,
            tournament: candidate.tournament,
            matchDate: new Date(candidate.startAt),
            title: `${candidate.teamA} vs ${candidate.teamB}`,
            script: {},
            status: 'script_failed',
            error: err.message,
          },
        })
      } catch {
        // Unique constraint hit — job row already exists, nothing to record
      }
    }
  }

  return result
}
