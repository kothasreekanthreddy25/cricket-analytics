import { NextResponse } from 'next/server'
import { roanuzGet } from '@/lib/roanuz'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'tbd', 'test', 'unknown'])
const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())

function buildTeamMap(rawMatches: any[]) {
  const teamMap = new Map<string, any>()

  for (const m of rawMatches) {
    const tA = m.teams?.a
    const tB = m.teams?.b
    if (!tA?.name || !tB?.name) continue
    if (isDummy(tA.name) || isDummy(tB.name)) continue

    const status: string =
      m.status === 'started' ? 'live'
      : m.status === 'completed' ? 'completed'
      : 'upcoming'

    const matchBase = {
      matchKey: m.key,
      matchName: m.name || `${tA.name} vs ${tB.name}`,
      tournament: m.tournament?.name || m.sub_title || 'Cricket',
      tournamentKey: m.tournament?.key || '',
      format: m.format?.toUpperCase() || 'T20',
      status,
      startAt: m.start_at ? new Date(m.start_at * 1000).toISOString() : null,
      venue: [m.venue?.name, m.venue?.city].filter(Boolean).join(', ') || null,
    }

    for (const [side, tInfo] of [['a', tA], ['b', tB]] as const) {
      if (isDummy(tInfo.name)) continue
      const key = tInfo.key || tInfo.name.toLowerCase().replace(/\s+/g, '-')
      if (!teamMap.has(key)) {
        teamMap.set(key, {
          key,
          name: tInfo.name,
          code: tInfo.code || tInfo.name.slice(0, 3).toUpperCase(),
          flag: tInfo.flag_url || null,
          matches: [],
        })
      }
      teamMap.get(key).matches.push({ ...matchBase, side })
    }
  }

  return teamMap
}

// Build fake Roanuz-shaped match objects from DB records
function dbRecordsToFakeMatches(records: any[]) {
  const seen = new Set<string>()
  return records
    .filter(r => {
      if (isDummy(r.teamA) || isDummy(r.teamB)) return false
      if (seen.has(r.matchKey)) return false
      seen.add(r.matchKey)
      return true
    })
    .map(r => ({
      key: r.matchKey,
      name: `${r.teamA} vs ${r.teamB}`,
      teams: {
        a: { name: r.teamA, code: r.teamA.slice(0, 3).toUpperCase(), key: r.teamA.toLowerCase().replace(/\s+/g, '-') },
        b: { name: r.teamB, code: r.teamB.slice(0, 3).toUpperCase(), key: r.teamB.toLowerCase().replace(/\s+/g, '-') },
      },
      tournament: { name: (r.conditions as any)?.tournament || `${(r.conditions as any)?.format || 'T20'} Cricket`, key: '' },
      format: 't20',
      status: 'upcoming',
      start_at: null,
      venue: { name: (r.conditions as any)?.venue || null, city: null },
    }))
}

export async function GET() {
  let rawMatches: any[] = []
  let source = 'roanuz'

  try {
    const data = await roanuzGet('featured-matches-2/')
    rawMatches = data?.data?.matches || []
    if (rawMatches.length === 0) throw new Error('empty')
  } catch {
    // Fallback: pull teams from DB predictions
    source = 'db'
    const records = await prisma.matchAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { matchKey: true, teamA: true, teamB: true, conditions: true },
    })
    rawMatches = dbRecordsToFakeMatches(records)
  }

  const teamMap = buildTeamMap(rawMatches)
  const teams = Array.from(teamMap.values()).sort((a, b) => {
    const aLive = a.matches.some((m: any) => m.status === 'live') ? 0 : 1
    const bLive = b.matches.some((m: any) => m.status === 'live') ? 0 : 1
    return aLive - bLive || a.name.localeCompare(b.name)
  })

  return NextResponse.json({ success: true, teams, total: teams.length, source })
}
