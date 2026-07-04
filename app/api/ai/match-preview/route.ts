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

// ── Step 1: get upcoming matches (real API first, DB fallback) ─────────────────
async function getUpcomingMatches(): Promise<{ teamA: string; teamB: string; matchKey: string; tournament: string; venue: string; format: string }[]> {
  // Try SportMonks for real upcoming matches
  try {
    const data = await getFeaturedMatches()
    const raw = (data?.data || []).map(normalizeSportMonksMatch).filter(Boolean) as any[]
    const upcoming = raw
      .filter((m: any) => m.status === 'upcoming' && !isDummy(m.teamA) && !isDummy(m.teamB))
      .slice(0, 6)
      .map((m: any) => ({
        teamA: m.teamA,
        teamB: m.teamB,
        matchKey: m.key,
        tournament: m.tournament || 'Cricket',
        venue: m.venue || '',
        format: m.matchType || 'T20',
      }))
    if (upcoming.length > 0) return upcoming
  } catch {}

  // Fallback: DB — prefer recently seeded international matches
  // Exclude matches with tournament = Maharaja Trophy (these are stale)
  const records = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: { matchKey: true, teamA: true, teamB: true, conditions: true },
  })

  const seen = new Set<string>()
  const results: { teamA: string; teamB: string; matchKey: string; tournament: string; venue: string; format: string }[] = []

  for (const r of records) {
    if (isDummy(r.teamA) || isDummy(r.teamB)) continue
    if (seen.has(r.matchKey)) continue
    seen.add(r.matchKey)

    const cond = (r.conditions as any) || {}
    const tournament: string = cond.tournament || ''

    // Skip old Maharaja Trophy / domestic records unless nothing else available
    if (tournament.toLowerCase().includes('maharaja') || tournament.toLowerCase().includes('domestic')) continue

    results.push({
      teamA: r.teamA,
      teamB: r.teamB,
      matchKey: r.matchKey,
      tournament,
      venue: cond.venue || '',
      format: cond.format || 'T20',
    })

    if (results.length >= 6) break
  }

  // If still empty, include any non-dummy records
  if (results.length === 0) {
    for (const r of records) {
      if (isDummy(r.teamA) || isDummy(r.teamB)) continue
      if (seen.has(r.matchKey)) continue
      seen.add(r.matchKey)
      const cond = (r.conditions as any) || {}
      results.push({
        teamA: r.teamA,
        teamB: r.teamB,
        matchKey: r.matchKey,
        tournament: cond.tournament || 'Cricket',
        venue: cond.venue || '',
        format: cond.format || 'T20',
      })
      if (results.length >= 3) break
    }
  }

  return results.slice(0, 3)
}

// ── Gemini commentator voice ──────────────────────────────────────────────────
async function geminiCommentatorIntro(teamA: string, teamB: string, context: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  try {
    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(
      `You are a legendary cricket commentator like Richie Benaud or Tony Greig.
Write a dramatic, vivid 3-sentence pre-match introduction for ${teamA} vs ${teamB}.
Context: ${context}
Style: warm, authoritative, builds anticipation. No clichés like "it promises to be".
Be specific about what makes this match interesting. Family-friendly, broadcast quality.`
    )
    return result.response.text().trim()
  } catch {
    return null
  }
}

// ── OpenAI structured preview ─────────────────────────────────────────────────
async function openaiPreview(teamA: string, teamB: string, context: string) {
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.5,
    max_tokens: 1400,
    messages: [
      {
        role: 'system',
        content: 'You are a cricket analyst. Return accurate, realistic JSON. Base info on known cricket knowledge.',
      },
      {
        role: 'user',
        content: `Generate a detailed pre-match preview for ${teamA} vs ${teamB}. Context: ${context}

Return this exact JSON:
{
  "pitchReport": {
    "venue": "stadium name (city)",
    "surface": "Dry and dusty | Flat and true | Green-tinged | Hard and bouncy",
    "type": "Spin-friendly | Batting paradise | Pace-friendly | Balanced",
    "avgFirstInnings": 155,
    "chaseSuccessRate": 45,
    "dew": "Yes — affects second innings | No significant dew expected",
    "expectedBehavior": "2-sentence pitch description",
    "tossAdvantage": "BAT | BOWL",
    "tossReason": "one sentence why"
  },
  "playersToWatch": [
    {
      "name": "Full Name",
      "team": "${teamA} or ${teamB}",
      "role": "BAT | BOWL | AR | WK",
      "reason": "one sentence why to watch",
      "keyStats": "e.g. 450 runs at 56 avg this season",
      "threat": "HIGH | MEDIUM"
    }
  ],
  "teamHistory": {
    "totalMeetings": 12,
    "teamAWins": 7,
    "teamBWins": 5,
    "lastResult": "one sentence about last meeting outcome",
    "currentStreak": "${teamA} have won 2 in a row | ${teamB} won last 3",
    "keyRivalryFact": "interesting historical stat about this rivalry"
  },
  "recentForm": {
    "teamA": { "last5": "W W L W W", "trend": "Strong | Inconsistent | Poor", "avgScore": 162 },
    "teamB": { "last5": "L W W L W", "trend": "Strong | Inconsistent | Poor", "avgScore": 155 }
  },
  "prediction": {
    "winner": "${teamA} or ${teamB}",
    "confidence": "HIGH | MEDIUM | LOW",
    "margin": "by 20 runs | by 6 wickets",
    "winnerProbPct": 62,
    "keyFactor": "one sentence decisive factor",
    "xFactor": "one wildcard that could change the game"
  }
}

Use 4 playersToWatch (2 from each team). Return realistic data based on cricket knowledge.`,
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

    // Take top 3 for preview (avoid excessive API calls)
    const toPreview = upcomingMatches.slice(0, 3)

    // Get stored win probabilities from DB for these matches
    const matchKeys = toPreview.map(m => m.matchKey)
    const dbPredictions = await prisma.matchAnalysis.findMany({
      where: { matchKey: { in: matchKeys } },
      orderBy: { createdAt: 'desc' },
      select: { matchKey: true, winProbabilityA: true, winProbabilityB: true, confidence: true, tips: true },
    })
    const predMap = new Map(dbPredictions.map(p => [p.matchKey, p]))

    // Generate previews for all matches in parallel
    const previews = await Promise.all(toPreview.map(async m => {
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
      const tips = stored && Array.isArray(stored.tips) ? (stored.tips as string[]).slice(0, 2).join('. ') : ''
      const context = `${m.tournament} match. ${favourite} are favourites at ${Math.max(probA, probB)}% win probability. Format: ${m.format}. Venue: ${m.venue || 'TBD'}. Confidence: ${confidence}. ${tips}`

      const [structured, geminiIntro] = await Promise.all([
        openaiPreview(m.teamA, m.teamB, context),
        geminiCommentatorIntro(m.teamA, m.teamB, context),
      ])

      let commentatorIntro = geminiIntro
      if (!commentatorIntro) {
        const fallback = await openai.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 120,
          messages: [
            { role: 'system', content: 'You are a legendary cricket commentator. Write dramatic, vivid pre-match introductions.' },
            { role: 'user', content: `Write a 3-sentence pre-match intro for ${m.teamA} vs ${m.teamB}. ${context}. Broadcast-quality, family-friendly, builds anticipation.` },
          ],
        })
        commentatorIntro = fallback.choices[0].message.content || ''
      }

      return {
        matchKey: m.matchKey,
        teamA: m.teamA,
        teamB: m.teamB,
        tournament: m.tournament,
        format: m.format,
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
      }
    }))

    return NextResponse.json({ success: true, previews })
  } catch (e: any) {
    console.error('[match-preview]', e.message)
    return NextResponse.json({ success: false, previews: [], error: e.message }, { status: 500 })
  }
}
