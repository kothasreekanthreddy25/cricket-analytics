import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'tbd', 'test', 'unknown'])
const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())

function norm(p: number) { return p > 1 ? p / 100 : p }
function normalise(pA: number, pB: number) {
  const a = norm(Math.max(0.01, pA)), b = norm(Math.max(0.01, pB)), t = a + b
  return { probA: t > 0 ? a / t : 0.5, probB: t > 0 ? b / t : 0.5 }
}

export async function GET() {
  try {
    // Fetch last 6 unique matches from DB
    const records = await prisma.matchAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        matchKey: true, teamA: true, teamB: true,
        winProbabilityA: true, winProbabilityB: true,
        confidence: true, conditions: true, recentForm: true, tips: true,
      },
    })

    const seen = new Set<string>()
    const matches = records.filter(r => {
      if (isDummy(r.teamA) || isDummy(r.teamB)) return false
      if (seen.has(r.matchKey)) return false
      seen.add(r.matchKey)
      return true
    }).slice(0, 8)

    if (matches.length === 0) {
      return NextResponse.json({ success: true, matches: [] })
    }

    // Build prompt for all matches at once (saves API calls)
    const matchList = matches.map((m, i) => {
      const { probA, probB } = normalise(m.winProbabilityA, m.winProbabilityB)
      const cond = m.conditions as any
      const form = m.recentForm as any
      const tips = Array.isArray(m.tips) ? m.tips[0] : ''
      const gap = Math.abs(probA - probB)
      const balance = gap < 0.1 ? 'evenly matched' : gap < 0.2 ? 'slight favourite' : 'clear favourite'
      return `Match ${i + 1}: ${m.teamA} vs ${m.teamB}
- Probability: ${m.teamA} ${Math.round(probA * 100)}% | ${m.teamB} ${Math.round(probB * 100)}% (${balance})
- Confidence: ${m.confidence}
- Pitch: ${cond?.pitchType || 'standard'}
- Venue: ${cond?.venue || 'unknown'}
- Tip: ${tips || 'N/A'}
- Format: ${cond?.format || 'T20'}`
    }).join('\n\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: 'You are a cricket expert generating match mood cards. Return only valid JSON. Be creative, fun, and accurate.',
        },
        {
          role: 'user',
          content: `Generate match mood cards for these matches. For each match return a JSON entry with:
- emoji: single most fitting emoji
- mood: short catchy title (max 4 words, e.g. "Last-Over Thriller", "Batting Paradise", "Bowlers Will Rule")
- tagline: one punchy sentence prediction (max 15 words)
- watchScore: watchability 1-10
- watchReasons: array of 3 short reasons why to watch (each max 8 words)
- prediction: brief 2-sentence match prediction
- tossImpact: "HIGH" | "MEDIUM" | "LOW"
- expectedRuns: realistic expected score (e.g. "145-160") for T20
- vibe: one of: THRILLER | FEAST | DOMINANT | BALANCED | UPSET_LIKELY
- bookmarkLabel: short CTA text for bookmark button (e.g. "Watch for the chase!")

Return JSON: { "matches": [ { "index": 1, ...fields }, ... ] }

${matchList}`,
        },
      ],
    })

    const raw = JSON.parse(response.choices[0].message.content || '{"matches":[]}')
    const aiMatches: any[] = raw.matches || []

    // Merge AI data with match DB data
    const result = matches.map((m, i) => {
      const ai = aiMatches.find((a: any) => a.index === i + 1) || aiMatches[i] || {}
      const { probA, probB } = normalise(m.winProbabilityA, m.winProbabilityB)
      return {
        matchKey: m.matchKey,
        teamA: m.teamA,
        teamB: m.teamB,
        probA: Math.round(probA * 100),
        probB: Math.round(probB * 100),
        confidence: m.confidence,
        emoji: ai.emoji || '🏏',
        mood: ai.mood || 'Match Preview',
        tagline: ai.tagline || `${m.teamA} vs ${m.teamB}`,
        watchScore: ai.watchScore || 7,
        watchReasons: ai.watchReasons || [],
        prediction: ai.prediction || '',
        tossImpact: ai.tossImpact || 'MEDIUM',
        expectedRuns: ai.expectedRuns || '150-165',
        vibe: ai.vibe || 'BALANCED',
        bookmarkLabel: ai.bookmarkLabel || 'Set reminder',
      }
    })

    return NextResponse.json({ success: true, matches: result })
  } catch (e: any) {
    console.error('[match-mood]', e.message)
    return NextResponse.json({ success: false, matches: [], error: e.message }, { status: 500 })
  }
}
