/**
 * Daily entity crawler — populates the Team/Player/Venue tables with real
 * SportMonks data (and the admin-curated squads built earlier), powering
 * the indexable /teams/[slug], /players/[slug], /venues/[slug] pages.
 * Never AI-hallucinated (unlike the old /players search) and never
 * dependent on Roanuz (unlike the old /teams search, and Roanuz has been
 * dead all session).
 *
 * Scoped to "this week's matches", not all cricket ever — see
 * lib/scheduler.ts Job #9 for the schedule this runs on.
 */
import { prisma } from './prisma'
import { getFeaturedMatches, normalizeSportMonksMatch, getTeamResults, getFixtureLineup } from './sportmonks'
import { getManualSquad } from './manual-squads'
import { formatsMatch, lineupToPlayers, getAggregatedCareerStats, type KnownPlayer } from './ai-match-preview'
import { slugify } from './utils'

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000
const PLAYER_STAT_FORMATS = ['ODI', 'T20I', 'TEST']
const PACE_MS = 300

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

interface DiscoveredTeam {
  teamId: number
  name: string
  format: string
  matchDate: string | null
  flag: string | null
}

// Reuses the same tier-2a fetch chain getPredictedXIs already uses (team's
// own most recent same-format result, then that fixture's lineup) — just
// generalized to not require a specific opponent, since this is building a
// standing team profile rather than a single match's predicted XI.
async function getCurrentSquad(
  teamId: number,
  teamName: string,
  format: string,
  matchDate: string | null
): Promise<{ players: KnownPlayer[]; rawLineup: any[] } | null> {
  const manual = await getManualSquad(teamName, format, matchDate)
  if (manual && manual.length > 0) return { players: manual, rawLineup: [] }

  try {
    const data = await getTeamResults(teamId)
    const results: any[] = data?.data?.results || []
    const match = results
      .filter((f: any) => (f.status === 'Finished' || f.status === 'Completed') && !f.draw_noresult)
      .filter((f: any) => formatsMatch(f.type, format))
      .sort((a: any, b: any) => new Date(b.starting_at).getTime() - new Date(a.starting_at).getTime())[0]
    if (!match) return null

    const lineupData = await getFixtureLineup(match.id)
    const lineup = lineupData?.data?.lineup
    if (!Array.isArray(lineup) || lineup.length === 0) return null

    const players = lineupToPlayers(lineup, teamId)
    return players.length > 0 ? { players, rawLineup: lineup } : null
  } catch {
    return null
  }
}

function extractVenueName(rawData: any): string | null {
  return rawData?.venue || rawData?.richPreview?.pitchReport?.venue || null
}

async function upsertVenues(venueNames: Set<string>) {
  if (venueNames.size === 0) return 0

  // Full-table aggregation, not a per-venue query — MatchAnalysis rows don't
  // consistently store venue in a queryable JSON path across every write
  // site this session touched, so grouping in JS is far more robust than a
  // fragile Postgres JSON-path filter. Bounded to the most recent 2000 rows,
  // which comfortably covers this site's current data volume.
  const recent = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2000,
    select: { rawData: true },
  })

  const byVenue = new Map<string, { count: number; avgFirstInnings: number[]; tossAdvantage: Record<string, number> }>()
  for (const row of recent) {
    const raw = row.rawData as any
    const venue = extractVenueName(raw)
    if (!venue) continue
    const key = venue.trim()
    if (!byVenue.has(key)) byVenue.set(key, { count: 0, avgFirstInnings: [], tossAdvantage: {} })
    const entry = byVenue.get(key)!
    entry.count++
    const pitch = raw?.richPreview?.pitchReport
    if (typeof pitch?.avgFirstInnings === 'number') entry.avgFirstInnings.push(pitch.avgFirstInnings)
    if (pitch?.tossAdvantage) entry.tossAdvantage[pitch.tossAdvantage] = (entry.tossAdvantage[pitch.tossAdvantage] || 0) + 1
  }

  let upserted = 0
  for (const name of venueNames) {
    const agg = byVenue.get(name)
    if (!agg) continue
    const avgFirstInnings = agg.avgFirstInnings.length > 0
      ? Math.round(agg.avgFirstInnings.reduce((s, v) => s + v, 0) / agg.avgFirstInnings.length)
      : null
    const tossAdvantage = Object.entries(agg.tossAdvantage).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    await prisma.venue.upsert({
      where: { slug: slugify(name) },
      create: {
        slug: slugify(name),
        name,
        stats: { matchesHosted: agg.count, avgFirstInnings, tossAdvantage },
      },
      update: {
        stats: { matchesHosted: agg.count, avgFirstInnings, tossAdvantage },
      },
    })
    upserted++
  }
  return upserted
}

export async function runEntityCrawl() {
  console.log('[EntityCrawler] Discovering this week\'s matches...')

  const featured = await getFeaturedMatches()
  const rawMatches: any[] = featured?.data || []

  const teams = new Map<number, DiscoveredTeam>()
  const venueNames = new Set<string>()

  for (const raw of rawMatches) {
    const normalized = normalizeSportMonksMatch(raw)
    if (!normalized) continue
    if (normalized.status !== 'upcoming' && normalized.status !== 'live') continue

    if (normalized.venue) venueNames.add(normalized.venue.trim())

    const localTeam = raw.localteam?.data || raw.localteam || {}
    const visitorTeam = raw.visitorteam?.data || raw.visitorteam || {}

    if (normalized.teamAId && !teams.has(normalized.teamAId)) {
      teams.set(normalized.teamAId, {
        teamId: normalized.teamAId,
        name: normalized.teamA,
        format: normalized.matchType,
        matchDate: normalized.dateTimeGMT || null,
        flag: localTeam.image_path || null,
      })
    }
    if (normalized.teamBId && !teams.has(normalized.teamBId)) {
      teams.set(normalized.teamBId, {
        teamId: normalized.teamBId,
        name: normalized.teamB,
        format: normalized.matchType,
        matchDate: normalized.dateTimeGMT || null,
        flag: visitorTeam.image_path || null,
      })
    }
  }

  console.log(`[EntityCrawler] ${teams.size} distinct teams, ${venueNames.size} distinct venues in scope`)

  // playerId -> { player, teamIds } — collected across all squads so each
  // real player is only looked up/upserted once even if they'd otherwise
  // appear via multiple teams' fetches in the same run.
  const playersToUpsert = new Map<number, { player: KnownPlayer; teamIds: Set<string>; battingStyle?: string; bowlingStyle?: string; country: string }>()

  let teamsUpserted = 0
  for (const team of teams.values()) {
    const squad = await getCurrentSquad(team.teamId, team.name, team.format, team.matchDate)

    await prisma.team.upsert({
      where: { teamId: String(team.teamId) },
      create: {
        teamId: String(team.teamId),
        slug: slugify(team.name),
        name: team.name,
        // SportMonks doesn't expose a clean per-team country name in the
        // match includes already fetched here — for the international
        // matches this site mostly covers, the team name IS the country
        // (e.g. "India"), so this is a reasonable default rather than a
        // separate lookup. Domestic/franchise teams inherit their own name.
        country: team.name,
        flag: team.flag,
        squad: (squad?.players || null) as any,
        lastSeenAt: new Date(),
      },
      update: {
        name: team.name,
        flag: team.flag || undefined,
        squad: (squad?.players || null) as any,
        lastSeenAt: new Date(),
      },
    })
    teamsUpserted++

    if (squad) {
      const rawById = new Map(squad.rawLineup.map((p: any) => [p.id, p]))
      for (const p of squad.players) {
        if (typeof p.id !== 'number') continue // no real SportMonks ID — nothing to index
        const raw = rawById.get(p.id)
        const existing = playersToUpsert.get(p.id)
        if (existing) {
          existing.teamIds.add(String(team.teamId))
        } else {
          playersToUpsert.set(p.id, {
            player: p,
            teamIds: new Set([String(team.teamId)]),
            battingStyle: raw?.battingstyle || undefined,
            bowlingStyle: raw?.bowlingstyle || undefined,
            country: team.name,
          })
        }
      }
    }

    await sleep(PACE_MS)
  }

  let playersUpserted = 0
  let playersSkippedCached = 0
  for (const [playerId, entry] of playersToUpsert) {
    const existing = await prisma.player.findUnique({ where: { playerId: String(playerId) } })
    if (existing && Date.now() - existing.updatedAt.getTime() < FOURTEEN_DAYS_MS) {
      // Still make sure a newly-seen team gets linked even when stats are skipped.
      const teamIds = Array.from(new Set([...(existing.teamIds || []), ...entry.teamIds]))
      if (teamIds.length !== (existing.teamIds || []).length) {
        await prisma.player.update({ where: { playerId: String(playerId) }, data: { teamIds } })
      }
      playersSkippedCached++
      continue
    }

    const statsByFormat: Record<string, any> = {}
    for (const fmt of PLAYER_STAT_FORMATS) {
      statsByFormat[fmt.toLowerCase()] = await getAggregatedCareerStats(playerId, fmt)
      await sleep(PACE_MS)
    }

    await prisma.player.upsert({
      where: { playerId: String(playerId) },
      create: {
        playerId: String(playerId),
        slug: slugify(entry.player.name),
        name: entry.player.name,
        country: entry.country,
        role: entry.player.role,
        battingStyle: entry.battingStyle,
        bowlingStyle: entry.bowlingStyle,
        stats: statsByFormat,
        teamIds: Array.from(entry.teamIds),
      },
      update: {
        role: entry.player.role,
        battingStyle: entry.battingStyle,
        bowlingStyle: entry.bowlingStyle,
        stats: statsByFormat,
        teamIds: Array.from(entry.teamIds),
      },
    })
    playersUpserted++
  }

  const venuesUpserted = await upsertVenues(venueNames)

  console.log(
    `[EntityCrawler] Done — ${teamsUpserted} teams, ${playersUpserted} players updated (${playersSkippedCached} cached/skipped), ${venuesUpserted} venues`
  )

  return { teamsUpserted, playersUpserted, playersSkippedCached, venuesUpserted }
}
