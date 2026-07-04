import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── OpenAI: fetch structured player profile + career stats ───────────────────

async function fetchPlayerProfile(name: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You are a cricket statistics expert. Return ONLY valid JSON. Use realistic, accurate cricket stats for well-known players. For unknown players return null for the player field.`,
      },
      {
        role: 'user',
        content: `Return comprehensive cricket stats for "${name}" in this exact JSON structure:
{
  "player": {
    "name": "Full Name",
    "country": "Country",
    "born": "DD Mon YYYY",
    "age": 30,
    "role": "Batsman|Bowler|All-Rounder|Wicket-Keeper",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "Right-arm fast|Left-arm spin|etc or null",
    "teams": ["Team1", "Team2"],
    "caps": { "test": 0, "odi": 0, "t20i": 0 },
    "debut": { "test": "Year or null", "odi": "Year or null", "t20i": "Year or null" }
  },
  "batting": {
    "test":  { "matches": 0, "innings": 0, "runs": 0, "avg": 0.0, "sr": 0.0, "hs": 0, "hundreds": 0, "fifties": 0, "fours": 0, "sixes": 0, "notOuts": 0 },
    "odi":   { "matches": 0, "innings": 0, "runs": 0, "avg": 0.0, "sr": 0.0, "hs": 0, "hundreds": 0, "fifties": 0, "fours": 0, "sixes": 0, "notOuts": 0 },
    "t20i":  { "matches": 0, "innings": 0, "runs": 0, "avg": 0.0, "sr": 0.0, "hs": 0, "hundreds": 0, "fifties": 0, "fours": 0, "sixes": 0, "notOuts": 0 },
    "ipl":   { "matches": 0, "innings": 0, "runs": 0, "avg": 0.0, "sr": 0.0, "hs": 0, "hundreds": 0, "fifties": 0, "fours": 0, "sixes": 0, "notOuts": 0 }
  },
  "bowling": {
    "test":  { "matches": 0, "innings": 0, "wickets": 0, "avg": 0.0, "econ": 0.0, "sr": 0.0, "bestFigures": "0/0", "fiveWickets": 0 },
    "odi":   { "matches": 0, "innings": 0, "wickets": 0, "avg": 0.0, "econ": 0.0, "sr": 0.0, "bestFigures": "0/0", "fiveWickets": 0 },
    "t20i":  { "matches": 0, "innings": 0, "wickets": 0, "avg": 0.0, "econ": 0.0, "sr": 0.0, "bestFigures": "0/0", "fiveWickets": 0 },
    "ipl":   { "matches": 0, "innings": 0, "wickets": 0, "avg": 0.0, "econ": 0.0, "sr": 0.0, "bestFigures": "0/0", "fiveWickets": 0 }
  },
  "recentForm": [
    { "match": "short match label", "format": "T20|ODI|Test", "runs": 0, "wickets": 0, "sr": 0.0, "result": "W|L|D" }
  ],
  "careerHighlights": ["string1", "string2", "string3", "string4", "string5"],
  "dismissalTypes": {
    "caught": 30, "bowled": 20, "lbw": 15, "runOut": 10, "stumped": 5, "hitwicket": 2
  },
  "runsPerYear": [
    { "year": 2019, "runs": 0 }, { "year": 2020, "runs": 0 },
    { "year": 2021, "runs": 0 }, { "year": 2022, "runs": 0 },
    { "year": 2023, "runs": 0 }, { "year": 2024, "runs": 0 }
  ]
}
Return null for bowling stats if the player is a pure batsman (set wickets to 0).
Return accurate real-world data based on your training knowledge.`,
      },
    ],
  })

  const raw = response.choices[0].message.content || '{}'
  return JSON.parse(raw)
}

// ── Gemini: AI analysis commentary ──────────────────────────────────────────

async function fetchGeminiAnalysis(name: string, stats: any): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return `${name} is one of cricket's most accomplished players. Based on career statistics, this player has demonstrated exceptional skill and consistency across all formats of the game. Their performances reflect years of dedication and technical excellence.`
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const battingRuns = stats?.batting?.test?.runs || 0
    const odiRuns = stats?.batting?.odi?.runs || 0

    const prompt = `You are a cricket analyst. Write a 3-paragraph expert analysis (150 words max total) of ${name}'s cricket career. Cover: (1) batting strengths and technique, (2) match impact and big performances, (3) current form and future outlook. Use specific stats where relevant. Test runs: ${battingRuns}, ODI runs: ${odiRuns}. Be concise and insightful.`

    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (e: any) {
    // Quota exceeded or unavailable — return null so caller falls back to OpenAI
    console.warn('[Gemini] falling back to OpenAI:', e?.message?.slice(0, 120))
    return null
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')?.trim()

  if (!name || name.length < 2) {
    return NextResponse.json({ success: false, error: 'Player name required' }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ success: false, error: 'OpenAI API key not configured' }, { status: 500 })
  }

  try {
    // Fetch profile first (OpenAI), then get Gemini analysis with real stats
    const profileData = await fetchPlayerProfile(name)

    if (!profileData.player) {
      return NextResponse.json({ success: false, error: `Player "${name}" not found. Try a well-known international cricketer.` }, { status: 404 })
    }

    // Try Gemini with actual stats; fall back to OpenAI if quota exceeded
    let analysis: string | null = null
    let analysisSource = 'OpenAI GPT-4o'

    if (process.env.GEMINI_API_KEY) {
      analysis = await fetchGeminiAnalysis(name, profileData.batting)
      if (analysis) analysisSource = 'Google Gemini 2.0 Flash'
    }

    // Fallback: generate analysis via OpenAI
    if (!analysis) {
      const fallback = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 200,
        messages: [
          { role: 'system', content: 'You are a cricket expert analyst. Write concise, insightful analysis.' },
          { role: 'user', content: `Write a 3-paragraph expert analysis (150 words) of ${name}'s cricket career: batting strengths, match impact, and current form outlook. Be specific and insightful.` },
        ],
      })
      analysis = fallback.choices[0].message.content || ''
      analysisSource = 'OpenAI GPT-4o'
    }

    return NextResponse.json({
      success: true,
      player: profileData.player,
      batting: profileData.batting,
      bowling: profileData.bowling,
      recentForm: profileData.recentForm || [],
      careerHighlights: profileData.careerHighlights || [],
      dismissalTypes: profileData.dismissalTypes || {},
      runsPerYear: profileData.runsPerYear || [],
      analysis,
      sources: {
        profile: 'OpenAI GPT-4o',
        analysis: analysisSource,
      },
    })
  } catch (e: any) {
    console.error('[players/search]', e.message)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
