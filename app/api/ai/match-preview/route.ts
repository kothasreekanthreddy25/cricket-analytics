import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'tbd', 'test', 'unknown'])
const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())
const norm = (p: number) => p > 1 ? p / 100 : p

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
    // Get upcoming matches from DB (not live, not completed)
    const records = await prisma.matchAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        matchKey: true, teamA: true, teamB: true,
        winProbabilityA: true, winProbabilityB: true,
        confidence: true, conditions: true, tips: true, recentForm: true,
      },
    })

    const seen = new Set<string>()
    const matches = records.filter(r => {
      if (isDummy(r.teamA) || isDummy(r.teamB)) return false
      if (seen.has(r.matchKey)) return false
      seen.add(r.matchKey)
      return true
    }).slice(0, 3) // Preview top 3 upcoming matches

    if (matches.length === 0) {
      return NextResponse.json({ success: true, previews: [] })
    }

    // Generate previews for all matches in parallel
    const previews = await Promise.all(matches.map(async m => {
      const pARaw = norm(m.winProbabilityA), pBRaw = norm(m.winProbabilityB)
      const t = pARaw + pBRaw
      const probA = Math.round((pARaw / t) * 100)
      const probB = 100 - probA
      const favourite = probA > probB ? m.teamA : m.teamB
      const cond = m.conditions as any
      const tips = Array.isArray(m.tips) ? m.tips.slice(0, 2).join('. ') : ''

      const context = `${favourite} are favourites at ${Math.max(probA, probB)}% win probability. Pitch: ${cond?.pitchType || 'balanced'}. Confidence: ${m.confidence}. ${tips}`

      // Run OpenAI structured + Gemini intro in parallel
      const [structured, geminiIntro] = await Promise.all([
        openaiPreview(m.teamA, m.teamB, context),
        geminiCommentatorIntro(m.teamA, m.teamB, context),
      ])

      // Fallback commentator intro via OpenAI if Gemini unavailable
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
        probA,
        probB,
        confidence: m.confidence,
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
