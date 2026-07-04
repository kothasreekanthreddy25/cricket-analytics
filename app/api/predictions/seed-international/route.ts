import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Step 1: ask GPT-4o for real current global matches ────────────────────────
async function getCurrentMatches(): Promise<any[]> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1200,
    messages: [
      {
        role: 'system',
        content: 'You are a cricket data expert. Return only valid JSON with real cricket team names.',
      },
      {
        role: 'user',
        content: `List 15 real cricket matches happening globally in July 2026 across different tournaments.
Include a variety: international T20I/ODI/Test series, IPL 2026, Caribbean Premier League, The Hundred, county cricket, Sri Lanka Premier League, Pakistan Super League, Bangladesh Premier League, etc.
Use REAL team names only (country names for international, franchise names for T20 leagues).

Return JSON:
{
  "matches": [
    {
      "teamA": "India",
      "teamB": "England",
      "tournament": "T20I Series — India vs England",
      "format": "T20I",
      "venue": "Wankhede Stadium, Mumbai",
      "matchKey": "intl_ind_eng_t20_jul2026_1"
    }
  ]
}
Make matchKeys unique slugs. Cover at least 6 different tournaments.`,
      },
    ],
  })
  const raw = JSON.parse(res.choices[0].message.content || '{"matches":[]}')
  return raw.matches || []
}

// ── Step 2: generate full prediction for each match ───────────────────────────
async function generatePrediction(match: any) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.4,
    max_tokens: 900,
    messages: [
      {
        role: 'system',
        content: 'You are a cricket prediction expert. Return accurate JSON with realistic cricket data.',
      },
      {
        role: 'user',
        content: `Generate a complete match prediction for: ${match.teamA} vs ${match.teamB}
Tournament: ${match.tournament}
Format: ${match.format}
Venue: ${match.venue}

Return JSON:
{
  "winProbabilityA": 55.5,
  "winProbabilityB": 44.5,
  "confidence": "HIGH",
  "tips": ["tip1", "tip2", "tip3"],
  "playersToWatch": {
    "teamA": [{"name": "Player Name", "role": "BAT/BOWL/AR", "reason": "why to watch"}],
    "teamB": [{"name": "Player Name", "role": "BAT/BOWL/AR", "reason": "why to watch"}]
  },
  "conditions": {
    "tournament": "${match.tournament}",
    "format": "${match.format}",
    "venue": "${match.venue}",
    "pitchType": "Batting paradise|Spin-friendly|Pace-friendly|Balanced",
    "weather": "Clear|Overcast|Rain risk",
    "tossAdvice": "Win toss and bat/bowl because...",
    "dewFactor": "Yes|No"
  },
  "recentForm": {
    "teamA": {"wins": 3, "losses": 2, "trend": "Strong|Mixed|Poor"},
    "teamB": {"wins": 2, "losses": 3, "trend": "Strong|Mixed|Poor"}
  },
  "reasoning": "2-3 sentence match analysis"
}
Use realistic win probabilities based on current team strengths. confidence: VERY_HIGH|HIGH|MEDIUM|LOW`,
      },
    ],
  })
  return JSON.parse(res.choices[0].message.content || '{}')
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ success: false, error: 'OpenAI key not set' }, { status: 500 })
  }

  try {
    // Get current global matches
    const matches = await getCurrentMatches()
    if (matches.length === 0) {
      return NextResponse.json({ success: false, error: 'No matches generated' })
    }

    const results: any[] = []
    const errors: any[] = []

    // Generate predictions in batches of 3 (avoid rate limits)
    for (let i = 0; i < matches.length; i += 3) {
      const batch = matches.slice(i, i + 3)
      const predictions = await Promise.all(batch.map(async (m: any) => {
        try {
          const pred = await generatePrediction(m)
          return { match: m, pred, ok: true }
        } catch (e: any) {
          return { match: m, error: e.message, ok: false }
        }
      }))

      for (const r of predictions) {
        if (!r.ok) { errors.push(r); continue }
        const { match, pred } = r

        try {
          const payload = {
            teamA: match.teamA,
            teamB: match.teamB,
            winProbabilityA: pred.winProbabilityA ?? 50,
            winProbabilityB: pred.winProbabilityB ?? 50,
            confidence: pred.confidence ?? 'MEDIUM',
            tips: pred.tips ?? [],
            playersToWatch: pred.playersToWatch ?? { teamA: [], teamB: [] },
            conditions: {
              ...(pred.conditions ?? {}),
              tournament: match.tournament,
              format: match.format,
              venue: match.venue,
            },
            recentForm: pred.recentForm ?? {},
            reasoning: pred.reasoning ?? '',
            rawData: { seededAt: new Date().toISOString(), source: 'openai-seed' },
          }

          const existing = await prisma.matchAnalysis.findFirst({ where: { matchKey: match.matchKey } })
          if (existing) {
            await prisma.matchAnalysis.update({ where: { id: existing.id }, data: payload })
          } else {
            await prisma.matchAnalysis.create({ data: { matchKey: match.matchKey, ...payload } })
          }
          results.push({ matchKey: match.matchKey, teamA: match.teamA, teamB: match.teamB, tournament: match.tournament })
        } catch (dbErr: any) {
          console.error('[seed db]', match.matchKey, dbErr.message)
          errors.push({ matchKey: match.matchKey, error: dbErr.message })
        }
      }

      // Small delay between batches
      if (i + 3 < matches.length) await new Promise(r => setTimeout(r, 500))
    }

    return NextResponse.json({
      success: true,
      seeded: results.length,
      failed: errors.length,
      matches: results,
    })
  } catch (e: any) {
    console.error('[seed-international]', e.message)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// Allow GET to trigger seeding from browser
export async function GET() { return POST() }
