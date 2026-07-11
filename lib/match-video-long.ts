/**
 * Long-form (~5 minute, 16:9) broadcast-style match-preview video — a bigger,
 * separate production from the 60-90s vertical Shorts pipeline in
 * lib/match-video.ts, sharing its data-gathering and compliance machinery.
 *
 * Explicitly NOT included, and why: real match footage, slow-motion replays,
 * crowd/stadium video, or "realistic" synthetic video of named real players
 * (Bumrah, Kohli, etc.) — those require licensed broadcast footage this
 * pipeline has no rights to, and depicting real athletes in synthetic video
 * raises likeness-rights issues independent of copyright. "Key battles" and
 * tactical content instead use an ORIGINAL animated field-diagram graphic
 * (drawn, not filmed) plus real stats — see render-battle-diagram in the
 * video-service for the visual side.
 *
 * "Key battles" are derived from real Fantasy XI data (lib/ai-match-preview.ts),
 * never hardcoded — the specific matchup (e.g. a bowler vs a batsman) is
 * whichever real players in this match's actual pool have the strongest
 * value score in that role, so this works for any two teams, not just one
 * hardcoded rivalry.
 */

import { prisma } from './prisma'
import {
  resolveMatchInfo,
  getPredictedXIs,
  buildFantasyXI,
  type MatchInfo,
  type KnownXIs,
  type FantasyRecommendation,
  type FantasyPlayer,
} from './ai-match-preview'
import {
  getOpenAI,
  getStoredPrediction,
  buildThumbnailMeta,
  findComplianceViolations,
  selectMatchesForVideo,
  FIXED_DISCLAIMER,
  type PredictionData,
  type ThumbnailMeta,
} from './match-video'

const BASE_URL = 'https://crickettips.ai'
const KIND = 'match_preview_long'
const MAX_VIDEOS_PER_RUN = 1 // a 5-minute broadcast-style render is far more expensive than a Short — one per day is plenty to start

export function isLongFormVideoConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

// ── Key battles — derived from real data, never hardcoded ──────────────────

export interface KeyBattle {
  attackerName: string
  attackerTeam: string
  attackerRole: 'BOWL' | 'BAT'
  attackerStatLine: string | null
  defenderName: string
  defenderTeam: string
  defenderRole: 'BOWL' | 'BAT'
  defenderStatLine: string | null
}

/**
 * Finds up to 2 real bowler-vs-batsman matchups: this match's strongest real
 * bowler from one side against the strongest real batsman from the other,
 * in both directions. Skips a direction entirely if either role has no
 * real candidate in the pool — never fills the gap with a fabricated name.
 */
function deriveKeyBattles(fantasy: FantasyRecommendation | null, teamA: string, teamB: string): KeyBattle[] {
  if (!fantasy || fantasy.xi.length === 0) return []

  const byTeamAndRole = (team: string, role: FantasyPlayer['role']) =>
    fantasy.xi
      .filter(p => p.team === team && p.role === role)
      .sort((a, b) => b.value - a.value)[0] || null

  const battles: KeyBattle[] = []

  const aBowler = byTeamAndRole(teamA, 'BOWL')
  const bBatsman = byTeamAndRole(teamB, 'BAT')
  if (aBowler && bBatsman) {
    battles.push({
      attackerName: aBowler.name, attackerTeam: aBowler.team, attackerRole: 'BOWL', attackerStatLine: aBowler.statLine,
      defenderName: bBatsman.name, defenderTeam: bBatsman.team, defenderRole: 'BAT', defenderStatLine: bBatsman.statLine,
    })
  }

  const bBowler = byTeamAndRole(teamB, 'BOWL')
  const aBatsman = byTeamAndRole(teamA, 'BAT')
  if (bBowler && aBatsman) {
    battles.push({
      attackerName: bBowler.name, attackerTeam: bBowler.team, attackerRole: 'BOWL', attackerStatLine: bBowler.statLine,
      defenderName: aBatsman.name, defenderTeam: aBatsman.team, defenderRole: 'BAT', defenderStatLine: aBatsman.statLine,
    })
  }

  return battles
}

// ── Script shape ─────────────────────────────────────────────────────────

export interface LongFormSection {
  id: 'intro' | 'team_news' | 'pitch_conditions' | 'key_battles' | 'prediction_outro'
  heading: string
  narration: string
  onScreen: string[]
  // Only present for id === 'key_battles' — the diagram renderer needs the
  // structured battle data, not just narration text, to draw it accurately.
  battles?: KeyBattle[]
}

export interface LongFormScript {
  title: string
  hook: string
  sections: LongFormSection[]
  description: string
  hashtags: string[]
  tags: string[]
  disclaimer: string
}

function buildLongFormBrief(
  info: MatchInfo,
  prediction: PredictionData | null,
  xis: KnownXIs,
  fantasy: FantasyRecommendation | null,
  battles: KeyBattle[]
): string {
  const lines: string[] = [
    `MATCH: ${info.teamA} vs ${info.teamB}`,
    `TOURNAMENT: ${info.tournament}`,
    `FORMAT: ${info.format}`,
    info.venue ? `VENUE: ${info.venue}` : '',
    info.startAt ? `START (UTC): ${info.startAt}` : '',
  ]
  if (prediction) {
    lines.push(`AI PREDICTION: ${info.teamA} ${prediction.probA}% — ${info.teamB} ${prediction.probB}% (favours ${prediction.predictedWinner}, ${prediction.confidence} confidence)`)
  }
  if (xis.teamA.length > 0) {
    lines.push(`${info.teamA} XI (${xis.teamAConfirmed ? 'CONFIRMED' : 'predicted from last match'}): ${xis.teamA.map(p => `${p.name} (${p.role})`).join(', ')}`)
  }
  if (xis.teamB.length > 0) {
    lines.push(`${info.teamB} XI (${xis.teamBConfirmed ? 'CONFIRMED' : 'predicted from last match'}): ${xis.teamB.map(p => `${p.name} (${p.role})`).join(', ')}`)
  }
  if (fantasy) {
    lines.push(`FANTASY CAPTAIN: ${fantasy.captain.name} (${fantasy.captain.team})${fantasy.captain.statLine ? ` — ${fantasy.captain.statLine}` : ''}`)
    lines.push(`FANTASY VICE-CAPTAIN: ${fantasy.viceCaptain.name} (${fantasy.viceCaptain.team})${fantasy.viceCaptain.statLine ? ` — ${fantasy.viceCaptain.statLine}` : ''}`)
  }
  battles.forEach((b, i) => {
    lines.push(
      `KEY BATTLE ${i + 1}: ${b.attackerName} (${b.attackerTeam}, bowler)${b.attackerStatLine ? ` [${b.attackerStatLine}]` : ''} vs ${b.defenderName} (${b.defenderTeam}, batsman)${b.defenderStatLine ? ` [${b.defenderStatLine}]` : ''}`
    )
  })
  if (battles.length === 0) {
    lines.push('KEY BATTLES: no individual matchup data available — cover team-level bowling vs batting strength instead, do not invent a specific player matchup.')
  }
  return lines.filter(Boolean).join('\n')
}

const LONG_FORM_SYSTEM_PROMPT = `You are a scriptwriter and YouTube SEO specialist for CricketTips.ai, an AI cricket analytics site. Write a ~5 minute (650-750 word) broadcast-style match preview script for a 16:9 YouTube video.

Tone: professional cricket analyst, energetic but neutral, clear narration — like a pre-match TV segment host, not a hype-man.

HARD RULES — violating any of these makes the output unusable:
- Use ONLY the facts in the DATA brief. Never invent stats, player names, records, form claims, or weather/pitch details not present in the brief.
- If no real weather/dew data is in the brief, do not invent any — describe pitch type/venue tendencies only from what's given, or skip the topic.
- Predictions are probabilities. NEVER use "guaranteed", "sure win", "can't lose", "100%", "lock", or any betting call-to-action ("place your bets", "bet now").
- Never mention bookmakers, odds sites, or promo codes.
- If an XI is marked "predicted from last match", call it "predicted XI" in narration, never "confirmed".
- If DATA says no key-battle data is available, cover team-level bowling/batting strength instead — do not invent a specific player matchup.

STRUCTURE — exactly 5 sections, in this order, hitting roughly these narration lengths (total 650-750 words):
1. "intro" (~70 words) — hook viewers, introduce the match, tournament stakes.
2. "team_news" (~180 words) — both XIs (confirmed or predicted, said correctly), key players, recent form from the brief.
3. "pitch_conditions" (~110 words) — venue, pitch type/format tendencies from the brief only.
4. "key_battles" (~150 words) — walk through the KEY BATTLE entries from the brief with real stat context; if none given, cover team strengths/weaknesses instead.
5. "prediction_outro" (~120 words) — present the AI prediction as one of several realistic scenarios (not a certainty), name factors that could swing it, close with an inviting, curiosity-driven line — NOT a betting CTA.

SEO for title/tags: title front-loads "<Team A> vs <Team B> Preview" or "Prediction", max 90 chars. tags: 10-14 keyword phrases.

Output ONLY valid JSON:
{
  "title": "...",
  "hook": "first line of the intro section, max 20 words",
  "sections": [
    { "id": "intro", "heading": "...", "narration": "...", "onScreen": ["bullet", "bullet"] },
    { "id": "team_news", "heading": "...", "narration": "...", "onScreen": ["..."] },
    { "id": "pitch_conditions", "heading": "...", "narration": "...", "onScreen": ["..."] },
    { "id": "key_battles", "heading": "...", "narration": "...", "onScreen": ["..."] },
    { "id": "prediction_outro", "heading": "...", "narration": "...", "onScreen": ["crickettips.ai"] }
  ],
  "hashtags": ["#cricket", ...6-10 total],
  "tags": ["10-14 SEO keyword phrases"]
}`

export async function generateLongFormScript(
  info: MatchInfo,
  prediction: PredictionData | null,
  xis: KnownXIs,
  fantasy: FantasyRecommendation | null,
  battles: KeyBattle[]
): Promise<LongFormScript> {
  const brief = buildLongFormBrief(info, prediction, xis, fantasy, battles)

  const attempt = async (extraInstruction?: string): Promise<Omit<LongFormScript, 'description' | 'disclaimer'>> => {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: LONG_FORM_SYSTEM_PROMPT },
        { role: 'user', content: `DATA:\n${brief}\n\nWrite the script JSON now.${extraInstruction ? `\n\nIMPORTANT: ${extraInstruction}` : ''}` },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('Empty AI response')
    const data = JSON.parse(raw)
    if (!data.title || !Array.isArray(data.sections) || data.sections.length !== 5) {
      throw new Error('Invalid long-form script structure from AI')
    }
    return data
  }

  const allTexts = (s: Omit<LongFormScript, 'description' | 'disclaimer'>) => [
    s.title, s.hook,
    ...s.sections.flatMap(sec => [sec.narration, sec.heading, ...(sec.onScreen || [])]),
  ]
  const wordCount = (s: Omit<LongFormScript, 'description' | 'disclaimer'>) =>
    s.sections.reduce((sum, sec) => sum + sec.narration.trim().split(/\s+/).filter(Boolean).length, 0)

  let script = await attempt()

  // gpt-4o-mini reliably undershoots explicit word-count targets — one
  // length-expansion retry before accepting whatever it settles on, rather
  // than silently shipping a 3-minute video when 5 was asked for.
  const MIN_WORDS = 550
  let words = wordCount(script)
  if (words < MIN_WORDS) {
    script = await attempt(
      `Your previous draft's narration totalled only ${words} words across all 5 sections — far short of the 650-750 word target. ` +
      `Substantially expand EVERY section with more real detail from the DATA brief (more stat context, more names, more specific analysis) — do not just pad with filler. Target 650-750 words total.`
    )
    words = wordCount(script)
  }

  let violations = findComplianceViolations(allTexts(script))

  if (violations.length > 0) {
    script = await attempt(
      `Your previous draft used prohibited language (${violations.map(v => v.split(':')[0]).join('; ')}). Remove ALL such wording.`
    )
    violations = findComplianceViolations(allTexts(script))
    if (violations.length > 0) {
      throw new Error(`Long-form script failed compliance after retry: ${violations.join(' | ')}`)
    }
  }

  // Attach the real battle data to the key_battles section so the renderer
  // can draw the field diagram without re-deriving or re-parsing anything.
  const sections = script.sections.map(s =>
    s.id === 'key_battles' ? { ...s, battles } : s
  )

  const leadLine = prediction
    ? `${info.teamA} vs ${info.teamB} preview: ${prediction.predictedWinner} favoured at ${Math.max(prediction.probA, prediction.probB)}% (AI, ${prediction.confidence.toLowerCase().replace('_', ' ')} confidence).`
    : `${info.teamA} vs ${info.teamB} — full AI ${info.format} preview: team news, pitch report, key battles, and prediction.`

  const description = [
    leadLine,
    `${info.tournament} · ${info.format}${info.venue ? ` · ${info.venue}` : ''}`,
    '',
    `📊 Full match analysis: ${BASE_URL}/analysis?match=${info.matchKey}`,
    `📈 Our complete prediction track record (wins AND losses): ${BASE_URL}/predictions/history`,
    '',
    FIXED_DISCLAIMER,
  ].join('\n')

  const defaultTags = [info.teamA, info.teamB, `${info.teamA} vs ${info.teamB}`, info.tournament, 'cricket preview', 'cricket prediction', 'ai cricket analysis']

  return {
    title: script.title.slice(0, 95),
    hook: script.hook,
    sections,
    description,
    hashtags: Array.isArray(script.hashtags) ? script.hashtags.slice(0, 10) : ['#cricket', '#cricketpreview'],
    tags: (Array.isArray(script.tags) && script.tags.length > 0 ? script.tags : defaultTags).slice(0, 14),
    disclaimer: FIXED_DISCLAIMER,
  }
}

// ── Orchestration ─────────────────────────────────────────────────────────

export interface LongFormRunResult {
  created: number
  skipped: number
  failed: number
  jobs: { matchKey: string; title?: string; status: string; detail?: string }[]
}

export async function runLongFormVideoGeneration(): Promise<LongFormRunResult> {
  const result: LongFormRunResult = { created: 0, skipped: 0, failed: 0, jobs: [] }
  if (!isLongFormVideoConfigured()) return result

  const candidates = await selectMatchesForVideo(MAX_VIDEOS_PER_RUN)
  console.log(`[LongFormVideoGen] ${candidates.length} candidate match(es)`)

  for (const candidate of candidates) {
    const existing = await prisma.videoJob.findUnique({
      where: { matchKey_kind: { matchKey: candidate.matchKey, kind: KIND } },
    })
    if (existing) {
      result.skipped++
      result.jobs.push({ matchKey: candidate.matchKey, status: 'skipped', detail: 'long-form video already exists for this match' })
      continue
    }

    try {
      const info = await resolveMatchInfo(candidate.matchKey)
      if (!info) throw new Error('Could not resolve match info')

      const [prediction, xis] = await Promise.all([
        getStoredPrediction(candidate.matchKey, info.teamA, info.teamB),
        getPredictedXIs(info.teamAId, info.teamBId, info.ownLineup, info.format),
      ])
      const fantasy = await buildFantasyXI(xis, info.teamA, info.teamB, info.format).catch(() => null)
      const battles = deriveKeyBattles(fantasy, info.teamA, info.teamB)

      const script = await generateLongFormScript(info, prediction, xis, fantasy, battles)
      const thumbnail = buildThumbnailMeta(info, prediction)

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

      const renderUrl = process.env.STREAMING_SERVICE_URL
      if (renderUrl) {
        const appBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000'
        try {
          const res = await fetch(`${renderUrl}/video/match-preview-long`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: job.id,
              callbackUrl: `${appBaseUrl}/api/videos/callback`,
              secret: process.env.VIDEO_GENERATE_SECRET || undefined,
              thumbnail,
              ...script,
            }),
            signal: AbortSignal.timeout(10_000),
          })
          await prisma.videoJob.update({
            where: { id: job.id },
            data: res.ok ? { status: 'render_triggered' } : { status: 'render_failed', error: `Render service returned ${res.status}` },
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
      console.log(`[LongFormVideoGen] Script ready: ${script.title}`)
    } catch (err: any) {
      result.failed++
      result.jobs.push({ matchKey: candidate.matchKey, status: 'failed', detail: err.message })
      console.error(`[LongFormVideoGen] Failed for ${candidate.matchKey}:`, err.message)
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
        // Unique constraint hit — job row already exists
      }
    }
  }

  return result
}

export type { MatchInfo, KnownXIs, FantasyRecommendation, PredictionData, ThumbnailMeta }
