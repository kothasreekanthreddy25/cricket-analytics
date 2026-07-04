import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/prisma'
import { getFeaturedMatches, normalizeSportMonksMatch } from '@/lib/sportmonks'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'tbd', 'test', 'unknown'])
const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())
const norm = (p: number) => p > 1 ? p / 100 : p

interface MatchSlot {
  teamA: string; teamB: string; matchKey: string
  tournament: string; venue: string; format: string
  startAt?: string | null
}

// ── Step 1: get upcoming matches (real API first, DB fallback) ─────────────────
async function getUpcomingMatches(): Promise<MatchSlot[]> {
  // Try SportMonks for real upcoming matches
  try {
    const data = await getFeaturedMatches()
    const raw = (data?.data || []).map(normalizeSportMonksMatch).filter(Boolean) as any[]
    const upcoming = raw
      .filter((m: any) => m.status === 'upcoming' && !isDummy(m.teamA) && !isDummy(m.teamB))
      .map((m: any) => ({
        teamA: m.teamA,
        teamB: m.teamB,
        matchKey: m.key,
        tournament: m.tournament || 'Cricket',
        venue: m.venue || '',
        format: m.matchType || 'T20',
        startAt: m.dateTimeGMT || null,
      }))
    if (upcoming.length > 0) return upcoming.slice(0, 5)
  } catch {}

  // Fallback: pick 5 distinct-tournament international matches from DB
  const records = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 80,
    select: { matchKey: true, teamA: true, teamB: true, conditions: true },
  })

  const seenKeys = new Set<string>()
  const seenTournaments = new Set<string>()
  const results: MatchSlot[] = []

  // First pass: one match per tournament, skip domestic/maharaja
  for (const r of records) {
    if (isDummy(r.teamA) || isDummy(r.teamB)) continue
    if (seenKeys.has(r.matchKey)) continue
    seenKeys.add(r.matchKey)

    const cond = (r.conditions as any) || {}
    const tournament: string = cond.tournament || ''
    const tLower = tournament.toLowerCase()
    if (tLower.includes('maharaja') || tLower.includes('domestic')) continue
    if (seenTournaments.has(tournament)) continue
    seenTournaments.add(tournament)

    results.push({ teamA: r.teamA, teamB: r.teamB, matchKey: r.matchKey, tournament, venue: cond.venue || '', format: cond.format || 'T20' })
    if (results.length >= 5) break
  }

  // Second pass: fill remaining slots with any non-dummy non-seen records
  if (results.length < 3) {
    for (const r of records) {
      if (isDummy(r.teamA) || isDummy(r.teamB)) continue
      if (seenKeys.has(r.matchKey)) continue
      seenKeys.add(r.matchKey)
      const cond = (r.conditions as any) || {}
      results.push({ teamA: r.teamA, teamB: r.teamB, matchKey: r.matchKey, tournament: cond.tournament || 'Cricket', venue: cond.venue || '', format: cond.format || 'T20' })
      if (results.length >= 3) break
    }
  }

  return results
}

// ── Gemini commentator voice ──────────────────────────────────────────────────
async function geminiCommentatorIntro(teamA: string, teamB: string, tournament: string, venue: string, format: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  try {
    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(
      `You are a legendary cricket commentator like Richie Benaud or Tony Greig.
Write a dramatic, vivid 2-sentence pre-match introduction specifically for ${teamA} vs ${teamB} in the ${tournament} (${format}) at ${venue || 'the venue'}.
Be specific: mention actual players, team strengths, recent rivalry moments. No generic phrases.
Family-friendly, broadcast quality.`
    )
    return result.response.text().trim()
  } catch {
    return null
  }
}

// ── OpenAI structured preview — specific to THIS match ───────────────────────
async function openaiPreview(teamA: string, teamB: string, tournament: string, venue: string, format: string, winContext: string) {
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.6,
    max_tokens: 1500,
    messages: [
      {
        role: 'system',
        content: `You are a cricket analyst specialising in ${format} cricket.
Generate preview data SPECIFIC to ${teamA} vs ${teamB} in the ${tournament}.
Use real cricket knowledge: actual player names, real historical results between these teams, actual venues.
Do NOT use generic placeholders like "Player A" or "Stadium X".`,
      },
      {
        role: 'user',
        content: `Generate a detailed pre-match preview for ${teamA} vs ${teamB}.
Tournament: ${tournament}
Format: ${format}
Venue: ${venue || 'TBD'}
Win context: ${winContext}

Return ONLY this JSON (no extra text):
{
  "pitchReport": {
    "venue": "actual stadium name, city",
    "surface": "Dry and dusty | Flat and true | Green-tinged | Hard and bouncy",
    "type": "Spin-friendly | Batting paradise | Pace-friendly | Balanced",
    "avgFirstInnings": 155,
    "chaseSuccessRate": 45,
    "dew": "Yes — dew expected in second innings | No significant dew",
    "expectedBehavior": "2 specific sentences about how this pitch plays for ${format}",
    "tossAdvantage": "BAT | BOWL",
    "tossReason": "specific reason for this venue"
  },
  "playersToWatch": [
    {
      "name": "Real player full name",
      "team": "${teamA}",
      "role": "BAT | BOWL | AR | WK",
      "reason": "specific reason why this player is key in this match",
      "keyStats": "real career/recent stats",
      "threat": "HIGH | MEDIUM"
    },
    {
      "name": "Real player full name",
      "team": "${teamA}",
      "role": "BAT | BOWL | AR | WK",
      "reason": "specific reason why this player is key in this match",
      "keyStats": "real career/recent stats",
      "threat": "HIGH | MEDIUM"
    },
    {
      "name": "Real player full name",
      "team": "${teamB}",
      "role": "BAT | BOWL | AR | WK",
      "reason": "specific reason why this player is key in this match",
      "keyStats": "real career/recent stats",
      "threat": "HIGH | MEDIUM"
    },
    {
      "name": "Real player full name",
      "team": "${teamB}",
      "role": "BAT | BOWL | AR | WK",
      "reason": "specific reason why this player is key in this match",
      "keyStats": "real career/recent stats",
      "threat": "HIGH | MEDIUM"
    }
  ],
  "teamHistory": {
    "totalMeetings": 0,
    "teamAWins": 0,
    "teamBWins": 0,
    "lastResult": "specific last meeting result",
    "currentStreak": "which team is in better form currently",
    "keyRivalryFact": "interesting real historical fact about ${teamA} vs ${teamB}"
  },
  "recentForm": {
    "teamA": { "last5": "W W L W W", "trend": "Strong | Inconsistent | Poor", "avgScore": 0 },
    "teamB": { "last5": "L W W L W", "trend": "Strong | Inconsistent | Poor", "avgScore": 0 }
  },
  "prediction": {
    "winner": "${teamA} or ${teamB} (choose one)",
    "confidence": "HIGH | MEDIUM | LOW",
    "margin": "by X runs | by X wickets",
    "winnerProbPct": 60,
    "keyFactor": "the single most important factor deciding this match",
    "xFactor": "one wildcard player/event that could swing it"
  }
}`,
      },
    ],
  })
  return JSON.parse(resp.choices[0].message.content || '{}')
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const upcomingMatches = await getUpcomingMatches()

    if (upcomingMatches.length === 0) {
      return NextResponse.json({ success: true, previews: [] })
    }

    // Preview top 3 matches — sequential to avoid rate limits
    const toPreview = upcomingMatches.slice(0, 3)

    // Get stored win probabilities from DB for these matches
    const matchKeys = toPreview.map(m => m.matchKey)
    const dbPredictions = await prisma.matchAnalysis.findMany({
      where: { matchKey: { in: matchKeys } },
      orderBy: { createdAt: 'desc' },
      select: { matchKey: true, winProbabilityA: true, winProbabilityB: true, confidence: true, tips: true },
    })
    // Keep most recent per matchKey
    const predMap = new Map<string, typeof dbPredictions[0]>()
    for (const p of dbPredictions) {
      if (!predMap.has(p.matchKey)) predMap.set(p.matchKey, p)
    }

    // Generate previews sequentially (avoids GPT rate limit + ensures distinct responses)
    const previews: any[] = []
    for (const m of toPreview) {
      const stored = predMap.get(m.matchKey)
      let probA = 55, probB = 45
      let confidence = 'MEDIUM'

      if (stored) {
        const pA = norm(stored.winProbabilityA), pB = norm(stored.winProbabilityB)
        const t = pA + pB
        probA = Math.round((pA / t) * 100)
        probB = 100 - probA
        confidence = stored.confidence
      }

      const favourite = probA > probB ? m.teamA : m.teamB
      const winContext = `${favourite} are favourites at ${Math.max(probA, probB)}% probability. Confidence: ${confidence}.`

      const [structured, geminiIntro] = await Promise.all([
        openaiPreview(m.teamA, m.teamB, m.tournament, m.venue, m.format, winContext),
        geminiCommentatorIntro(m.teamA, m.teamB, m.tournament, m.venue, m.format),
      ])

      let commentatorIntro = geminiIntro
      if (!commentatorIntro) {
        const fallback = await openai.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 100,
          messages: [
            { role: 'system', content: 'Cricket commentator. 2 sentences. Specific to these teams. No generic phrases.' },
            { role: 'user', content: `Pre-match intro for ${m.teamA} vs ${m.teamB}, ${m.tournament}, ${m.format} at ${m.venue || 'the venue'}. Mention specific players and team strengths.` },
          ],
        })
        commentatorIntro = fallback.choices[0].message.content || ''
      }

      previews.push({
        matchKey: m.matchKey,
        teamA: m.teamA,
        teamB: m.teamB,
        tournament: m.tournament,
        format: m.format,
        venue: m.venue,
        startAt: m.startAt || null,
        probA,
        probB,
        confidence,
        commentatorIntro,
        commentatorSource: geminiIntro ? 'Gemini 2.0 Flash' : 'OpenAI GPT-4o',
        pitchReport: structured.pitchReport || {},
        playersToWatch: structured.playersToWatch || [],
        teamHistory: structured.teamHistory || {},
        recentForm: structured.recentForm || {},
        prediction: {
          ...structured.prediction,
          winnerProbPct: structured.prediction?.winner === m.teamA ? probA : probB,
        },
      })
    }

    return NextResponse.json({ success: true, previews })
  } catch (e: any) {
    console.error('[match-preview]', e.message)
    return NextResponse.json({ success: false, previews: [], error: e.message }, { status: 500 })
  }
}
