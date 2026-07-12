/**
 * Admin-curated squads — takes priority over the SportMonks "most recent
 * match" heuristic in getPredictedXIs (lib/ai-match-preview.ts), since
 * SportMonks lineup data only reflects matches already played and can lag
 * real squad announcements (see app/dashboard/admin/squads for the entry
 * form). Matching key is (team + format + match date falling within a
 * series' date range) — deliberately not a fuzzy match against SportMonks'
 * own tournament naming, which would be fragile.
 */
import { prisma } from './prisma'
import { formatsMatch, type KnownPlayer } from './ai-match-preview'

function normalizeForMatch(name: string): string {
  return (name || '').toLowerCase().replace(/[^a-z]/g, '')
}

export async function getManualSquad(
  teamName: string,
  format: string,
  matchDate: string | Date | null
): Promise<KnownPlayer[] | null> {
  if (!teamName || !matchDate) return null
  const date = typeof matchDate === 'string' ? new Date(matchDate) : matchDate
  if (isNaN(date.getTime())) return null

  try {
    const series = await prisma.series.findMany({
      where: { startDate: { lte: date }, endDate: { gte: date } },
      include: { squads: true },
    })

    const key = normalizeForMatch(teamName)
    for (const s of series) {
      if (!formatsMatch(s.format, format)) continue
      const squad = s.squads.find(sq => normalizeForMatch(sq.teamName) === key)
      if (squad && Array.isArray(squad.players) && squad.players.length > 0) {
        return squad.players as unknown as KnownPlayer[]
      }
    }
    return null
  } catch (err) {
    console.warn('[manual-squads] Lookup failed:', err)
    return null
  }
}
