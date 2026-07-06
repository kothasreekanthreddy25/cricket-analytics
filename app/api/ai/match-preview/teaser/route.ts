import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFeaturedMatches, normalizeSportMonksMatch } from '@/lib/sportmonks'

export const dynamic = 'force-dynamic'

const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'tbd', 'test', 'unknown'])
const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())
const norm = (p: number) => p > 1 ? p / 100 : p

export async function GET() {
  try {
    let slots: { teamA: string; teamB: string; matchKey: string; tournament: string; venue: string; format: string; round: string | null; dateTimeGMT: string }[] = []

    // Try SportMonks first
    try {
      const data = await getFeaturedMatches()
      const raw = (data?.data || []).map(normalizeSportMonksMatch).filter(Boolean) as any[]
      const upcoming = raw
        .filter((m: any) => m.status === 'upcoming' && !isDummy(m.teamA) && !isDummy(m.teamB))
        .slice(0, 6)
        .map((m: any) => ({ teamA: m.teamA, teamB: m.teamB, matchKey: m.key, tournament: m.tournament || 'Cricket', venue: m.venue || '', format: m.matchType || 'T20', round: m.round, dateTimeGMT: m.dateTimeGMT || '' }))
      if (upcoming.length > 0) slots = upcoming
    } catch {}

    // DB fallback — one match per tournament, skip domestic
    if (slots.length === 0) {
      const records = await prisma.matchAnalysis.findMany({
        orderBy: { createdAt: 'desc' },
        take: 80,
        select: { matchKey: true, teamA: true, teamB: true, conditions: true, rawData: true },
      })
      const seenKeys = new Set<string>()
      const seenT = new Set<string>()
      for (const r of records) {
        if (isDummy(r.teamA) || isDummy(r.teamB)) continue
        if (seenKeys.has(r.matchKey)) continue
        seenKeys.add(r.matchKey)
        const cond = (r.conditions as any) || {}
        const raw = (r.rawData as any) || {}
        const t: string = raw.group || ''
        if (t.toLowerCase().includes('maharaja') || t.toLowerCase().includes('domestic')) continue
        if (seenT.has(t)) continue
        seenT.add(t)
        slots.push({ teamA: r.teamA, teamB: r.teamB, matchKey: r.matchKey, tournament: t, venue: cond.venue || raw.venue || '', format: 'T20', round: null, dateTimeGMT: raw.date || '' })
        if (slots.length >= 6) break
      }
    }

    if (slots.length === 0) return NextResponse.json({ success: true, matches: [] })

    // Attach stored win probabilities from DB
    const matchKeys = slots.map(s => s.matchKey)
    const preds = await prisma.matchAnalysis.findMany({
      where: { matchKey: { in: matchKeys } },
      orderBy: { createdAt: 'desc' },
      select: { matchKey: true, winProbabilityA: true, winProbabilityB: true },
    })
    const predMap = new Map<string, { winProbabilityA: number; winProbabilityB: number }>()
    for (const p of preds) { if (!predMap.has(p.matchKey)) predMap.set(p.matchKey, p) }

    const matches = slots.slice(0, 3).map(s => {
      const stored = predMap.get(s.matchKey)
      let probA = 55, probB = 45
      if (stored) {
        const pA = norm(stored.winProbabilityA), pB = norm(stored.winProbabilityB)
        const t = pA + pB
        probA = Math.round((pA / t) * 100)
        probB = 100 - probA
      }
      return { ...s, probA, probB }
    })

    return NextResponse.json({ success: true, matches })
  } catch (e: any) {
    return NextResponse.json({ success: false, matches: [], error: e.message })
  }
}
