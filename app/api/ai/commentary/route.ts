import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'tbd', 'test', 'unknown'])
const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())

const MODE_INSTRUCTIONS: Record<string, string> = {
  excited: `You are a HYPER-EXCITED cricket commentator like a passionate sports fan. Use ALL CAPS for dramatic moments, exclamation marks, and phrases like "OH MY!" "WHAT A MOMENT!" "INCREDIBLE!" Keep it fun, energetic, and over-the-top enthusiastic.`,
  expert: `You are a calm, analytical BBC-style expert cricket commentator. Use technical terms (line and length, corridor of uncertainty, reverse swing, gate). Reference statistics, player technique, and tactical nuances. Sound authoritative and knowledgeable.`,
  funny: `You are a witty, family-friendly cricket commentator who uses clean humour — like a beloved uncle at a cricket match. Make clever cricket puns, funny field-placement observations, and playful commentary about the game situation. STRICT RULES: NO body-part jokes, NO innuendo, NO references to grandma/family in punchlines, NO adult double-meanings, NO offensive stereotypes. Keep everything 100% clean, wholesome, and safe for all ages including children.`,
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const matchKey = searchParams.get('matchKey')
  const mode = (searchParams.get('mode') || 'excited') as 'excited' | 'expert' | 'funny'

  try {
    // Get any match if no matchKey specified
    const whereClause = matchKey && matchKey !== 'any'
      ? { matchKey }
      : {}

    const match = await prisma.matchAnalysis.findFirst({
      where: {
        ...whereClause,
        NOT: [
          { teamA: { in: ['Team A', 'Team B', 'TBD', 'Test', 'Unknown'] } },
          { teamB: { in: ['Team A', 'Team B', 'TBD', 'Test', 'Unknown'] } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        matchKey: true, teamA: true, teamB: true,
        winProbabilityA: true, winProbabilityB: true,
        confidence: true, conditions: true, tips: true, recentForm: true,
      },
    })

    if (!match || isDummy(match.teamA) || isDummy(match.teamB)) {
      return NextResponse.json({ success: false, error: 'No match found' }, { status: 404 })
    }

    const norm = (p: number) => p > 1 ? p / 100 : p
    const pA = norm(match.winProbabilityA), pB = norm(match.winProbabilityB)
    const t = pA + pB
    const probA = Math.round((pA / t) * 100), probB = Math.round((pB / t) * 100)
    const favourite = probA > probB ? match.teamA : match.teamB
    const favPct = Math.max(probA, probB)
    const cond = match.conditions as any
    const tips = Array.isArray(match.tips) ? match.tips.slice(0, 2).join('. ') : ''

    const systemPrompt = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.excited

    // Generate 4 commentary snippets simulating ball-by-ball moments
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.9,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate live cricket commentary for: ${match.teamA} vs ${match.teamB}
Context:
- ${favourite} are favourites at ${favPct}% win probability
- Pitch: ${cond?.pitchType || 'balanced'}
- Tip: ${tips || 'close contest expected'}
- Format: T20

Generate exactly 4 commentary snippets as if happening right now during the match. Make them feel real and varied (a boundary, a wicket, a dot ball, a review situation, etc.). Each snippet should be 2-3 sentences.

IMPORTANT: All content must be completely family-friendly, PG-rated, and appropriate for all ages. No body-part references, no double meanings, no offensive comparisons.

Return JSON: { "snippets": ["snippet1", "snippet2", "snippet3", "snippet4"], "matchSummary": "one-line current match situation" }`,
        },
      ],
    })

    const raw = JSON.parse(response.choices[0].message.content || '{}')

    return NextResponse.json({
      success: true,
      matchKey: match.matchKey,
      teamA: match.teamA,
      teamB: match.teamB,
      mode,
      snippets: raw.snippets || [],
      matchSummary: raw.matchSummary || `${match.teamA} vs ${match.teamB} — in progress`,
      probA,
      probB,
      generatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('[commentary]', e.message)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
