import { predict, MatchFeatures, getTrainedRanking, getTrainedH2H, getTeamStats } from './tf-model'
import {
  getFeaturedTournaments,
  getTournamentFixtures,
  getMatchDetails,
  getTournamentTables,
  getTournamentStats,
  getTournamentTeam,
  getPreMatchOdds,
  roanuzGet,
} from './roanuz'
import { getKeyPlayersForTeam } from './player-database'

const T20_WC_KEY = 'a-rz--cricket--icc--iccwct20--2026-YaNA'

// ICC Rankings approximation (updated periodically)
const TEAM_RANKINGS: Record<string, Record<string, number>> = {
  T20I: {
    india: 1, england: 2, australia: 3, south_africa: 4,
    west_indies: 5, new_zealand: 6, pakistan: 7, sri_lanka: 8,
    bangladesh: 9, afghanistan: 10, ireland: 11, zimbabwe: 12,
    netherlands: 13, scotland: 14, namibia: 15, nepal: 16,
    uae: 17, oman: 18, usa: 19, canada: 20,
  },
  ODI: {
    india: 1, australia: 2, south_africa: 3, new_zealand: 4,
    pakistan: 5, england: 6, bangladesh: 7, sri_lanka: 8,
    afghanistan: 9, west_indies: 10, ireland: 11, zimbabwe: 12,
    netherlands: 13, scotland: 14, nepal: 15, namibia: 16,
  },
  TEST: {
    india: 1, australia: 2, england: 3, south_africa: 4,
    new_zealand: 5, sri_lanka: 6, pakistan: 7, west_indies: 8,
    bangladesh: 9, ireland: 10, zimbabwe: 11, afghanistan: 12,
  },
}

// Venue conditions mapping
const VENUE_CONDITIONS: Record<string, { pitchType: number; description: string }> = {
  india: { pitchType: 0.8, description: 'Spin-friendly conditions' },
  australia: { pitchType: 0.2, description: 'Pace and bounce friendly' },
  england: { pitchType: 0.3, description: 'Swing and seam friendly' },
  south_africa: { pitchType: 0.25, description: 'Pace friendly with bounce' },
  new_zealand: { pitchType: 0.35, description: 'Green tops, seam movement' },
  west_indies: { pitchType: 0.6, description: 'Slow, low bounce' },
  sri_lanka: { pitchType: 0.75, description: 'Spin friendly, turns later' },
  pakistan: { pitchType: 0.7, description: 'Flat tracks, spin helpful' },
  bangladesh: { pitchType: 0.8, description: 'Slow turners' },
  uae: { pitchType: 0.7, description: 'Dry, spin friendly later' },
  default: { pitchType: 0.5, description: 'Balanced conditions' },
}

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^a-z_]/g, '')
}

// Roanuz team_key values for T20 WC 2026 (confirmed from API)
const TOURNAMENT_TEAM_KEYS: Record<string, string> = {
  'india': 'ind',
  'pakistan': 'pak',
  'australia': 'aus',
  'england': 'eng',
  'south africa': 'rsa',
  'new zealand': 'nz',
  'west indies': 'wi',
  'sri lanka': 'sl',
  'bangladesh': 'ban',
  'afghanistan': 'afg',
  'ireland': 'ire',
  'zimbabwe': 'zim',
  'netherlands': 'nl',
  'scotland': 'sct',
  'namibia': 'nam',
  'nepal': 'nep',
  'canada': 'can',
  'united arab emirates': 'uae',
  'uae': 'uae',
  'united states of america': 'c__team__usa__6b3ad',
  'usa': 'c__team__usa__6b3ad',
  'uganda': 'uga',
  'oman': 'omn',
  'papua new guinea': 'png',
}

function resolveTeamKey(teamName: string): string {
  const lower = teamName.toLowerCase().trim()
  if (TOURNAMENT_TEAM_KEYS[lower]) return TOURNAMENT_TEAM_KEYS[lower]
  // Partial match fallback
  for (const [name, key] of Object.entries(TOURNAMENT_TEAM_KEYS)) {
    if (lower.includes(name) || name.includes(lower)) return key
  }
  return normalizeTeamName(teamName)
}

function getFormatFactor(format: string): number {
  const f = format?.toLowerCase() || ''
  if (f.includes('t20') || f.includes('twenty20')) return 1
  if (f.includes('odi') || f.includes('one_day') || f.includes('50')) return 0.5
  if (f.includes('test') || f.includes('first_class')) return 0
  return 0.5
}

function getRankingNormalized(teamName: string, format: string): number {
  // Use trained Elo-based ranking if available (from real match data)
  const trainedRank = getTrainedRanking(teamName)
  if (trainedRank !== 0.5) return trainedRank

  // Fallback to hardcoded ICC rankings
  const normalized = normalizeTeamName(teamName)
  const formatKey = format?.toLowerCase().includes('t20') ? 'T20I'
    : format?.toLowerCase().includes('test') ? 'TEST' : 'ODI'
  const rankings = TEAM_RANKINGS[formatKey] || TEAM_RANKINGS['ODI']
  const rank = rankings[normalized]
  if (!rank) return 0.5 // Unknown team defaults to middle
  // Normalize: rank 1 → 1.0, rank 20 → 0.05
  return Math.max(0.05, 1 - (rank - 1) * 0.05)
}

function getVenueConditions(venue: string): { pitchType: number; description: string } {
  const v = venue?.toLowerCase() || ''
  for (const [country, conditions] of Object.entries(VENUE_CONDITIONS)) {
    if (v.includes(country)) return conditions
  }
  return VENUE_CONDITIONS['default']
}

export interface PlayerToWatch {
  name: string
  role: string
  reason: string
  impact: 'high' | 'medium' | 'low'
  stats?: {
    runs?: number
    wickets?: number
    strikeRate?: number
    economy?: number
    catches?: number
    bestScore?: string
    ranking?: { category: string; rank: number }
  }
}

export interface AnalysisResult {
  matchKey: string
  teamA: string
  teamB: string
  winProbabilityA: number
  winProbabilityB: number
  confidence: 'high' | 'medium' | 'low'
  tips: string[]
  playersToWatch: {
    teamA: PlayerToWatch[]
    teamB: PlayerToWatch[]
  }
  conditions: {
    venue: string
    pitchType: string
    weatherImpact: string
    tossAdvice: string
  }
  recentForm: {
    teamA: { wins: number; losses: number; trend: string }
    teamB: { wins: number; losses: number; trend: string }
  }
  reasoning: string
}

// Extract team names from Roanuz match/tournament data
function extractTeams(matchData: any): { teamA: string; teamB: string } {
  // Try match level teams
  if (matchData?.data?.teams) {
    const teamKeys = Object.keys(matchData.data.teams)
    if (teamKeys.length >= 2) {
      return {
        teamA: matchData.data.teams[teamKeys[0]]?.name || teamKeys[0],
        teamB: matchData.data.teams[teamKeys[1]]?.name || teamKeys[1],
      }
    }
  }
  // Try play object
  if (matchData?.data?.play?.teams) {
    const teamKeys = Object.keys(matchData.data.play.teams)
    if (teamKeys.length >= 2) {
      return {
        teamA: matchData.data.play.teams[teamKeys[0]]?.name || teamKeys[0],
        teamB: matchData.data.play.teams[teamKeys[1]]?.name || teamKeys[1],
      }
    }
  }
  return { teamA: 'Team A', teamB: 'Team B' }
}

function extractPlayers(matchData: any): {
  teamA: { name: string; role: string; key: string; isCapt?: boolean; isKeeper?: boolean }[];
  teamB: { name: string; role: string; key: string; isCapt?: boolean; isKeeper?: boolean }[];
  teamAKey?: string;
  teamBKey?: string;
} {
  const result: ReturnType<typeof extractPlayers> = { teamA: [], teamB: [] }

  try {
    const d = matchData?.data
    if (!d) return result

    // Player details are at top-level d.players (keyed by player_key)
    const allPlayers: Record<string, any> = d.players || {}
    // Squad assignments: d.squad.a and d.squad.b
    const squad = d.squad || {}
    const teamKeys = Object.keys(d.teams || {}) // ['a', 'b']

    for (let i = 0; i < teamKeys.length && i < 2; i++) {
      const tk = teamKeys[i]
      const teamSquad = squad[tk]
      if (!teamSquad) continue

      const playerKeys: string[] = teamSquad.playing_xi || teamSquad.player_keys || []
      const captain = teamSquad.captain
      const keeper = teamSquad.keeper

      const playerList = playerKeys.map((pk: string) => {
        const p = allPlayers[pk]?.player || allPlayers[pk] || {}
        return {
          name: p.name || pk,
          role: p.seasonal_role || (p.roles && p.roles[0]) || 'all-rounder',
          key: pk,
          isCapt: pk === captain,
          isKeeper: pk === keeper,
        }
      })

      if (i === 0) { result.teamA = playerList; result.teamAKey = tk }
      else { result.teamB = playerList; result.teamBKey = tk }
    }
  } catch (e) {
    // Return empty if parsing fails
  }

  return result
}

function generateTips(
  teamA: string,
  teamB: string,
  probA: number,
  probB: number,
  format: string,
  venueConditions: { pitchType: number; description: string },
): string[] {
  const tips: string[] = []
  const favored = probA > probB ? teamA : teamB
  const underdog = probA > probB ? teamB : teamA
  const gap = Math.abs(probA - probB)

  tips.push(`${favored} are the favorites with a ${Math.max(probA, probB)}% win probability`)

  if (gap < 10) {
    tips.push('This is a very close contest — expect a thrilling match')
    tips.push('Consider backing the underdog for higher returns')
  } else if (gap < 25) {
    tips.push(`${underdog} can cause an upset if key players perform`)
  } else {
    tips.push(`${favored} have a strong advantage in this matchup`)
  }

  if (venueConditions.pitchType > 0.6) {
    tips.push('Spinners will play a crucial role on this surface')
    tips.push('Teams with strong spin attacks have an edge')
  } else if (venueConditions.pitchType < 0.4) {
    tips.push('Fast bowlers will be key on this pace-friendly track')
    tips.push('Expect movement early on — top-order batters need to be watchful')
  }

  if (format.toLowerCase().includes('t20')) {
    tips.push('Power hitters and death-over bowlers will be decisive')
    tips.push('Look at teams\' powerplay performance for early momentum')
  } else if (format.toLowerCase().includes('test')) {
    tips.push('Patience and technique will be key on this surface')
    tips.push('First innings score will be crucial — batting first is important')
  }

  return tips
}

// ─── Tournament Team Squad Cache ─────────────────────────────────────────
const teamSquadCache = new Map<string, { players: ReturnType<typeof extractPlayers>['teamA']; fetchedAt: number }>()
const SQUAD_CACHE_MS = 60 * 60 * 1000 // 1 hour

async function fetchTournamentTeamSquad(
  tournamentKey: string,
  teamKey: string,
): Promise<{ name: string; role: string; key: string; isCapt?: boolean; isKeeper?: boolean }[]> {
  const cacheKey = `${tournamentKey}:${teamKey}`
  const cached = teamSquadCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < SQUAD_CACHE_MS) {
    return cached.players
  }

  try {
    const data = await getTournamentTeam(tournamentKey, teamKey)
    const d = data?.data

    // Roanuz v5 tournament team response can have different shapes.
    // Shape A: d.players (keyed map) + d.squad { player_keys, captain, keeper }
    // Shape B: d.squad.players (array of player objects directly)
    const allPlayersMap: Record<string, any> = d?.players || {}
    const squadInfo = d?.squad || {}

    let playerKeys: string[] = []
    let captain = squadInfo.captain
    let keeper = squadInfo.keeper

    if (squadInfo.player_keys?.length) {
      playerKeys = squadInfo.player_keys
    } else if (squadInfo.playing_xi?.length) {
      playerKeys = squadInfo.playing_xi
    } else if (Array.isArray(squadInfo.players) && squadInfo.players.length) {
      // Shape B — players are objects directly in the array
      const players = (squadInfo.players as any[]).map((p: any) => ({
        name: p.name || p.short_name || '',
        role: p.seasonal_role || (p.roles && p.roles[0]) || 'all-rounder',
        key: p.key || p.player_key || '',
        isCapt: p.key === captain || p.player_key === captain,
        isKeeper: p.key === keeper || p.player_key === keeper,
      })).filter(p => p.name && p.key)
      teamSquadCache.set(cacheKey, { players, fetchedAt: Date.now() })
      return players
    } else {
      // Fallback: use all keys from the players map
      playerKeys = Object.keys(allPlayersMap)
    }

    const players = playerKeys.map((pk: string) => {
      const p = allPlayersMap[pk]?.player || allPlayersMap[pk] || {}
      return {
        name: p.name || p.short_name || '',
        role: p.seasonal_role || (p.roles && p.roles[0]) || 'all-rounder',
        key: pk,
        isCapt: pk === captain,
        isKeeper: pk === keeper,
      }
    }).filter(p => p.name) // filter out entries where name wasn't resolved

    teamSquadCache.set(cacheKey, { players, fetchedAt: Date.now() })
    return players
  } catch (e) {
    console.warn(`Could not fetch tournament team squad for ${teamKey}:`, e)
    return []
  }
}

// ─── Tournament Stats Cache ───────────────────────────────────────────────
let cachedTournamentStats: any = null
let tournamentStatsFetchedAt = 0
const TOURNAMENT_STATS_CACHE_MS = 30 * 60 * 1000 // 30 min

async function fetchCachedTournamentStats(): Promise<any> {
  if (cachedTournamentStats && Date.now() - tournamentStatsFetchedAt < TOURNAMENT_STATS_CACHE_MS) {
    return cachedTournamentStats
  }
  try {
    const data = await getTournamentStats(T20_WC_KEY)
    cachedTournamentStats = data?.data || null
    tournamentStatsFetchedAt = Date.now()
    return cachedTournamentStats
  } catch (e) {
    return cachedTournamentStats // return stale cache if available
  }
}

// Build a map of player_key → stat achievements from tournament stats
function buildPlayerStatsMap(tournamentStats: any, teamKey: string): Map<string, {
  runs?: number; runsRank?: number
  wickets?: number; wicketsRank?: number
  strikeRate?: number; strikeRateRank?: number
  economy?: number; economyRank?: number
  sixes?: number; sixesRank?: number
  catches?: number; catchesRank?: number
  bestBowling?: number; bestBowlingRank?: number
}> {
  const map = new Map<string, any>()
  if (!tournamentStats) return map

  const applyRanking = (category: any[], field: string, rankField: string) => {
    if (!Array.isArray(category)) return
    for (const entry of category) {
      if (entry.team_key !== teamKey) continue
      const existing = map.get(entry.player_key) || {}
      existing[field] = entry.value
      existing[rankField] = entry.rank
      map.set(entry.player_key, existing)
    }
  }

  const batting = tournamentStats?.player?.batting || {}
  applyRanking(batting.most_runs, 'runs', 'runsRank')
  applyRanking(batting.most_sixes, 'sixes', 'sixesRank')
  applyRanking(batting.best_tournament_strike_rate, 'strikeRate', 'strikeRateRank')

  const bowling = tournamentStats?.player?.bowling || {}
  applyRanking(bowling.most_wickets, 'wickets', 'wicketsRank')
  applyRanking(bowling.best_economy, 'economy', 'economyRank')
  applyRanking(bowling.best_bowling, 'bestBowling', 'bestBowlingRank')

  const fielding = tournamentStats?.player?.fielding || {}
  applyRanking(fielding.most_catches, 'catches', 'catchesRank')

  return map
}

function generatePlayerReasonFromStats(statsPlayer: any): string {
  const parts: string[] = []

  if (statsPlayer.runs && statsPlayer.runs > 100) {
    parts.push(`${statsPlayer.runs} runs in tournament`)
  }
  if (statsPlayer.wickets && statsPlayer.wickets > 3) {
    parts.push(`${statsPlayer.wickets} wickets`)
  }
  if (statsPlayer.strike_rate && statsPlayer.strike_rate > 150) {
    parts.push(`SR ${statsPlayer.strike_rate} — aggressive`)
  }
  if (statsPlayer.economy && statsPlayer.economy < 6) {
    parts.push(`Economy ${statsPlayer.economy}`)
  }
  if (statsPlayer.sixes && statsPlayer.sixes > 5) {
    parts.push(`${statsPlayer.sixes} sixes — boundary threat`)
  }
  if (statsPlayer.catches && statsPlayer.catches > 2) {
    parts.push(`${statsPlayer.catches} catches`)
  }

  if (parts.length > 0) {
    return parts.slice(0, 2).join(' | ')
  }

  // Fallback based on role
  if (statsPlayer.role?.toLowerCase().includes('bowl')) {
    return 'Key bowler in the tournament'
  }
  return 'Important player for the team'
}

function generatePlayerReason(
  player: { name: string; role: string; isCapt?: boolean; isKeeper?: boolean },
  stats: any,
  venueConditions: { pitchType: number; description: string },
): string {
  const parts: string[] = []

  if (stats?.runs && stats.runsRank) {
    parts.push(`#${stats.runsRank} run scorer in tournament (${stats.runs} runs)`)
  }
  if (stats?.wickets && stats.wicketsRank) {
    parts.push(`#${stats.wicketsRank} wicket-taker (${stats.wickets} wickets)`)
  }
  if (stats?.strikeRate && stats.strikeRateRank && stats.strikeRateRank <= 10) {
    parts.push(`SR ${stats.strikeRate} — explosive hitter`)
  }
  if (stats?.economy && stats.economyRank && stats.economyRank <= 10) {
    parts.push(`Economy ${stats.economy} — builds pressure`)
  }
  if (stats?.sixes && stats.sixesRank && stats.sixesRank <= 10) {
    parts.push(`${stats.sixes} sixes in tournament — boundary threat`)
  }
  if (stats?.catches && stats.catchesRank && stats.catchesRank <= 10) {
    parts.push(`${stats.catches} catches — sharp in the field`)
  }

  if (parts.length > 0) {
    return parts.slice(0, 2).join(' | ')
  }

  // Fallback: role-based + venue-aware reason
  if (player.isCapt) return 'Captain and key decision-maker — leads from the front'
  if (player.isKeeper) return 'Wicketkeeper-batter — crucial behind and at the stumps'

  const role = player.role?.toLowerCase() || ''
  if (role.includes('bat') || role.includes('keeper')) {
    return venueConditions.pitchType > 0.6
      ? 'Key batter on a turning pitch — ability to play spin is crucial'
      : 'Top-order batter expected to anchor the innings'
  }
  if (role.includes('bowl')) {
    return venueConditions.pitchType > 0.6
      ? 'Spinner who can exploit conditions on this surface'
      : 'Pace threat with movement — dangerous in powerplay and death'
  }
  return 'Versatile player who can impact the game in multiple ways'
}

function calculateImpact(stats: any, isCapt?: boolean): 'high' | 'medium' | 'low' {
  const score = calcPlayerScore(stats, isCapt)
  if (score >= 18) return 'high'
  if (score >= 7) return 'medium'
  if (isCapt) return 'medium'
  return 'low'
}

async function selectPlayersToWatch(
  players: ReturnType<typeof extractPlayers>,
  teamA: string,
  teamB: string,
  venueConditions: { pitchType: number; description: string },
): Promise<{ teamA: PlayerToWatch[]; teamB: PlayerToWatch[] }> {
  // Fetch tournament stats for ranking-based selection
  const tournamentStats = await fetchCachedTournamentStats()

  // Map team key to Roanuz team code (e.g., 'a' → 'ind')
  // The tournament stats use team codes like 'ind', 'pak', etc.
  // We need to match players by their player_key across both datasets
  const allStatsPlayers = tournamentStats?.players || {}

  const selectForTeam = (
    playerList: typeof players.teamA,
    teamName: string,
  ): PlayerToWatch[] => {
    // Resolve the Roanuz team_key (e.g. 'ind', 'pak', 'rsa') for this team
    const teamKey = resolveTeamKey(teamName)

    // If no squad data available, use tournament stats leaderboards directly
    if (!playerList.length) {
      const statsMap = buildPlayerStatsMap(tournamentStats, teamKey)

      if (statsMap.size > 0) {
        // Combine player profile (name, role) with their leaderboard stats
        const scored = Array.from(statsMap.entries()).map(([playerKey, statsEntry]) => {
          const profile = allStatsPlayers[playerKey] || {}
          return {
            key: playerKey,
            name: profile.name || '',
            role: profile.seasonal_role || 'all_rounder',
            isCapt: false,
            isKeeper: profile.seasonal_role === 'keeper',
            score: calcPlayerScore(statsEntry),
            statsEntry,
          }
        }).filter(p => p.name) // only players whose names are resolved
          .sort((a, b) => b.score - a.score)

        if (scored.length > 0) {
          const selected: PlayerToWatch[] = []
          const usedKeys = new Set<string>()

          // Best overall performer
          const top = scored[0]
          usedKeys.add(top.key)
          selected.push({
            name: top.name,
            role: formatRole(top.role, top.isCapt, top.isKeeper),
            reason: generatePlayerReason(top, top.statsEntry, venueConditions),
            impact: calculateImpact(top.statsEntry, top.isCapt),
            stats: buildStatsObj(top.statsEntry),
          })

          // Ensure role diversity: add a bowler if top is batter (or vice versa)
          const topIsRoler = (top.role || '').toLowerCase()
          const needsBowler = topIsRoler.includes('bat') || topIsRoler.includes('keeper')
          for (const p of scored) {
            if (selected.length >= 2) break
            if (usedKeys.has(p.key)) continue
            const r = (p.role || '').toLowerCase()
            const isBowler = r.includes('bowl') || r.includes('all')
            const isBatter = r.includes('bat') || r.includes('keeper')
            if ((needsBowler && isBowler) || (!needsBowler && isBatter)) {
              usedKeys.add(p.key)
              selected.push({
                name: p.name,
                role: formatRole(p.role, p.isCapt, p.isKeeper),
                reason: generatePlayerReason(p, p.statsEntry, venueConditions),
                impact: calculateImpact(p.statsEntry, p.isCapt),
                stats: buildStatsObj(p.statsEntry),
              })
            }
          }

          // Fill third spot
          for (const p of scored) {
            if (selected.length >= 3) break
            if (usedKeys.has(p.key)) continue
            usedKeys.add(p.key)
            selected.push({
              name: p.name,
              role: formatRole(p.role, p.isCapt, p.isKeeper),
              reason: generatePlayerReason(p, p.statsEntry, venueConditions),
              impact: calculateImpact(p.statsEntry, p.isCapt),
              stats: buildStatsObj(p.statsEntry),
            })
          }

          return selected
        }
      }

      // Fallback: known player database (career T20I stats, tournament not started yet)
      const knownPlayers = getKeyPlayersForTeam(teamName)
      if (knownPlayers.length > 0) {
        return knownPlayers.map(kp => ({
          name: kp.name,
          role: kp.role + (kp.isCapt ? ' (C)' : (kp.isKeeper && !kp.role.includes('WK')) ? ' (WK)' : ''),
          reason: kp.reason,
          impact: kp.impact,
          stats: kp.stats,
        }))
      }

      return []
    }

    // Has squad — find team code: use resolveTeamKey first, then confirm via stats map
    let teamCode = teamKey
    for (const p of playerList) {
      const sp = allStatsPlayers[p.key]
      if (sp?.team_key) { teamCode = sp.team_key; break }
    }

    // Build per-player stats from tournament rankings
    const statsMap = buildPlayerStatsMap(tournamentStats, teamCode)

    // Score each player based on tournament stats
    type ScoredPlayer = typeof playerList[0] & { score: number; statsEntry: any }
    const scoredPlayers: ScoredPlayer[] = playerList.map(p => {
      const s = statsMap.get(p.key) || null
      let score = 0
      if (s) {
        // Lower rank = better. Invert so higher score = better player
        if (s.runsRank) score += Math.max(0, 11 - s.runsRank) * 3
        if (s.wicketsRank) score += Math.max(0, 11 - s.wicketsRank) * 3
        if (s.strikeRateRank) score += Math.max(0, 11 - s.strikeRateRank) * 1.5
        if (s.economyRank) score += Math.max(0, 11 - s.economyRank) * 1.5
        if (s.sixesRank) score += Math.max(0, 11 - s.sixesRank)
        if (s.catchesRank) score += Math.max(0, 11 - s.catchesRank)
      }
      if (p.isCapt) score += 5 // captain bonus
      if (p.isKeeper) score += 2 // keeper bonus
      return { ...p, score, statsEntry: s }
    })

    // Sort by score descending
    scoredPlayers.sort((a, b) => b.score - a.score)

    // Pick top 3, ensuring role diversity (at least 1 bat, 1 bowl if available)
    const selected: PlayerToWatch[] = []
    const usedKeys = new Set<string>()

    // First: add the highest-scored player overall
    if (scoredPlayers.length > 0) {
      const top = scoredPlayers[0]
      usedKeys.add(top.key)
      selected.push({
        name: top.name,
        role: formatRole(top.role, top.isCapt, top.isKeeper),
        reason: generatePlayerReason(top, top.statsEntry, venueConditions),
        impact: calculateImpact(top.statsEntry, top.isCapt),
        stats: buildStatsObj(top.statsEntry),
      })
    }

    // Second: ensure we have a bowler if top player was a batter (or vice versa)
    const topRole = scoredPlayers[0]?.role?.toLowerCase() || ''
    const needsBowler = topRole.includes('bat') || topRole.includes('keeper')
    const needsBatter = topRole.includes('bowl')

    for (const p of scoredPlayers) {
      if (usedKeys.has(p.key)) continue
      const r = p.role?.toLowerCase() || ''
      if (needsBowler && (r.includes('bowl') || r.includes('all'))) {
        usedKeys.add(p.key)
        selected.push({
          name: p.name,
          role: formatRole(p.role, p.isCapt, p.isKeeper),
          reason: generatePlayerReason(p, p.statsEntry, venueConditions),
          impact: calculateImpact(p.statsEntry, p.isCapt),
          stats: buildStatsObj(p.statsEntry),
        })
        break
      }
      if (needsBatter && (r.includes('bat') || r.includes('keeper'))) {
        usedKeys.add(p.key)
        selected.push({
          name: p.name,
          role: formatRole(p.role, p.isCapt, p.isKeeper),
          reason: generatePlayerReason(p, p.statsEntry, venueConditions),
          impact: calculateImpact(p.statsEntry, p.isCapt),
          stats: buildStatsObj(p.statsEntry),
        })
        break
      }
    }

    // Third: fill remaining spots from highest scored
    for (const p of scoredPlayers) {
      if (selected.length >= 3) break
      if (usedKeys.has(p.key)) continue
      usedKeys.add(p.key)
      selected.push({
        name: p.name,
        role: formatRole(p.role, p.isCapt, p.isKeeper),
        reason: generatePlayerReason(p, p.statsEntry, venueConditions),
        impact: calculateImpact(p.statsEntry, p.isCapt),
        stats: buildStatsObj(p.statsEntry),
      })
    }

    return selected
  }

  return {
    teamA: selectForTeam(players.teamA, teamA),
    teamB: selectForTeam(players.teamB, teamB),
  }
}

function formatRole(role: string, isCapt?: boolean, isKeeper?: boolean): string {
  const base = role?.toLowerCase() || ''
  let label = 'Player'
  if (base.includes('all')) label = 'All-rounder'
  else if (base.includes('bowl')) label = 'Bowler'
  else if (base.includes('keeper') || base === 'wk') label = 'WK-Batter'
  else if (base.includes('bat')) label = 'Batter'
  if (isCapt) label += ' (C)'
  else if (isKeeper && !label.includes('WK')) label += ' (WK)'
  return label
}

function buildStatsObj(s: any): PlayerToWatch['stats'] | undefined {
  if (!s) return undefined
  const obj: PlayerToWatch['stats'] = {}
  if (s.runs) obj.runs = s.runs
  if (s.wickets) obj.wickets = s.wickets
  if (s.strikeRate) obj.strikeRate = s.strikeRate
  if (s.economy) obj.economy = s.economy
  if (s.catches) obj.catches = s.catches
  // Prefer runs rank, then wickets rank for display label
  if (s.runsRank) obj.ranking = { category: 'Tournament Runs', rank: s.runsRank }
  else if (s.wicketsRank) obj.ranking = { category: 'Tournament Wickets', rank: s.wicketsRank }
  else if (s.economyRank && s.economyRank <= 5) obj.ranking = { category: 'Economy', rank: s.economyRank }
  return Object.keys(obj).length > 0 ? obj : undefined
}

/** Score a player's stats entry for ranking (higher = more impactful in this tournament) */
function calcPlayerScore(s: any, isCapt?: boolean): number {
  if (!s) return isCapt ? 5 : 0
  let score = 0
  if (s.runsRank) score += Math.max(0, 11 - s.runsRank) * 3
  if (s.wicketsRank) score += Math.max(0, 11 - s.wicketsRank) * 3
  if (s.strikeRateRank) score += Math.max(0, 11 - s.strikeRateRank) * 1.5
  if (s.economyRank) score += Math.max(0, 11 - s.economyRank) * 1.5
  if (s.sixesRank) score += Math.max(0, 11 - s.sixesRank)
  if (s.catchesRank) score += Math.max(0, 11 - s.catchesRank)
  if (isCapt) score += 5
  return score
}

function generateReasoning(
  teamA: string,
  teamB: string,
  probA: number,
  probB: number,
  features: MatchFeatures,
  venueConditions: { pitchType: number; description: string },
  format: string,
): string {
  const favored = probA > probB ? teamA : teamB
  const gap = Math.abs(probA - probB)

  let reasoning = `**${favored}** are favored to win this ${format} match. `

  // Ranking based reasoning
  if (Math.abs(features.teamARanking - features.teamBRanking) > 0.2) {
    const betterRanked = features.teamARanking > features.teamBRanking ? teamA : teamB
    reasoning += `${betterRanked} have a higher ICC ranking, reflecting overall team strength. `
  }

  // Form reasoning
  if (Math.abs(features.teamAMomentum - features.teamBMomentum) > 0.15) {
    const betterForm = features.teamAMomentum > features.teamBMomentum ? teamA : teamB
    reasoning += `${betterForm} come into this match with better recent form and momentum. `
  }

  // Conditions reasoning
  reasoning += `The venue offers ${venueConditions.description.toLowerCase()}, which `
  if (venueConditions.pitchType > 0.6) {
    reasoning += 'favors teams with quality spinners. '
  } else if (venueConditions.pitchType < 0.4) {
    reasoning += 'will assist fast bowlers, especially with the new ball. '
  } else {
    reasoning += 'provides a fair contest between bat and ball. '
  }

  // Close match reasoning
  if (gap < 10) {
    reasoning += 'This is expected to be an extremely close encounter where small moments could decide the outcome. '
    reasoning += 'Toss, individual brilliance, and death-over execution will be critical factors.'
  } else if (gap < 20) {
    reasoning += `While ${favored} have the edge, the opposition is capable of causing an upset on their day.`
  } else {
    reasoning += `${favored} have a significant advantage and should control the match.`
  }

  return reasoning
}

export async function analyzeMatch(matchKey: string): Promise<AnalysisResult> {
  // Fetch match data from T20 WC fixtures
  let matchData: any = null
  let matchDetails: any = null

  // First try to find match in WC fixtures list
  try {
    const allMatches = await fetchAllWCFixtures()
    matchData = allMatches.find((m: any) => m.key === matchKey)
  } catch (e) {
    console.warn('Could not fetch WC fixtures:', e)
  }

  // Also try to get detailed match info
  try {
    matchDetails = await getMatchDetails(matchKey)
  } catch (e) {
    console.warn('Could not fetch match details:', e)
  }

  const teamA = matchData?.teams?.a?.name || extractTeams(matchDetails)?.teamA || 'Team A'
  const teamB = matchData?.teams?.b?.name || extractTeams(matchDetails)?.teamB || 'Team B'
  const format = 'T20'

  const venueName = matchData?.venue?.name || matchDetails?.data?.venue?.name || ''
  const venueCity = matchData?.venue?.city || ''
  const venueCountry = matchData?.venue?.country?.name || matchDetails?.data?.venue?.country?.name || ''
  const venueConditions = getVenueConditions(venueCountry)

  // Extract players from detailed match data
  let players = matchDetails ? extractPlayers(matchDetails) : { teamA: [], teamB: [] }

  // If match details have no squad (common for upcoming matches), fall back to
  // fetching the full team roster from the tournament team endpoint
  if (players.teamA.length === 0 || players.teamB.length === 0) {
    const teamAKey = matchData?.teams?.a?.key
    const teamBKey = matchData?.teams?.b?.key

    const [squadA, squadB] = await Promise.all([
      teamAKey && players.teamA.length === 0
        ? fetchTournamentTeamSquad(T20_WC_KEY, teamAKey)
        : Promise.resolve(players.teamA),
      teamBKey && players.teamB.length === 0
        ? fetchTournamentTeamSquad(T20_WC_KEY, teamBKey)
        : Promise.resolve(players.teamB),
    ])

    players = { teamA: squadA, teamB: squadB }
  }

  // Determine home-like advantage (India/Sri Lanka are co-hosts)
  const teamANorm = normalizeTeamName(teamA)
  const teamBNorm = normalizeTeamName(teamB)
  const hostCountries = ['india', 'sri_lanka']
  const teamAIsHost = hostCountries.some(h => teamANorm.includes(h))
  const teamBIsHost = hostCountries.some(h => teamBNorm.includes(h))
  const isHome = teamAIsHost ? 0.8 : teamBIsHost ? 0.2 : 0.5

  const teamARankNorm = getRankingNormalized(teamA, format)
  const teamBRankNorm = getRankingNormalized(teamB, format)

  // Try to get odds data
  let oddsInformedWinRateA = 0.5
  let oddsInformedWinRateB = 0.5
  try {
    const oddsData = await getPreMatchOdds(matchKey)
    if (oddsData?.data) {
      const markets = oddsData.data.markets || oddsData.data.pre_match_odds || {}
      const matchWinner = markets.match_winner || markets.winner || {}
      const selections = matchWinner.selections || matchWinner.options || []
      if (Array.isArray(selections) && selections.length >= 2) {
        const totalOdds = selections.reduce((sum: number, s: any) => sum + (1 / (s.odds || s.value || 2)), 0)
        oddsInformedWinRateA = (1 / (selections[0].odds || selections[0].value || 2)) / totalOdds
        oddsInformedWinRateB = (1 / (selections[1].odds || selections[1].value || 2)) / totalOdds
      }
    }
  } catch (e) {
    // Use ranking-based defaults
  }

  // Use trained stats if available, otherwise fallback to ranking-based approximations
  const statsA = getTeamStats(teamA)
  const statsB = getTeamStats(teamB)
  const trainedH2H = getTrainedH2H(teamA, teamB)

  const features: MatchFeatures = {
    teamARanking: teamARankNorm,
    teamBRanking: teamBRankNorm,
    teamARecentWinRate: statsA
      ? (oddsInformedWinRateA !== 0.5 ? oddsInformedWinRateA * 0.4 + statsA.winRate * 0.6 : statsA.winRate)
      : (oddsInformedWinRateA !== 0.5 ? oddsInformedWinRateA * 0.6 + teamARankNorm * 0.4 : teamARankNorm * 0.8 + 0.1),
    teamBRecentWinRate: statsB
      ? (oddsInformedWinRateB !== 0.5 ? oddsInformedWinRateB * 0.4 + statsB.winRate * 0.6 : statsB.winRate)
      : (oddsInformedWinRateB !== 0.5 ? oddsInformedWinRateB * 0.6 + teamBRankNorm * 0.4 : teamBRankNorm * 0.8 + 0.1),
    h2hTeamAWinRate: trainedH2H,
    isHome,
    pitchType: venueConditions.pitchType,
    formatFactor: 1, // T20
    teamAMomentum: statsA ? statsA.momentum : teamARankNorm * 0.7 + (teamAIsHost ? 0.2 : 0.1),
    teamBMomentum: statsB ? statsB.momentum : teamBRankNorm * 0.7 + (teamBIsHost ? 0.2 : 0.1),
    teamABattingStrength: statsA ? statsA.batStrength : teamARankNorm * 0.9 + 0.05,
    teamBBattingStrength: statsB ? statsB.batStrength : teamBRankNorm * 0.9 + 0.05,
    teamABowlingStrength: statsA ? statsA.bowlStrength : teamARankNorm * 0.85 + (1 - venueConditions.pitchType) * 0.15,
    teamBBowlingStrength: statsB ? statsB.bowlStrength : teamBRankNorm * 0.85 + venueConditions.pitchType * 0.15,
  }

  const prediction = predict(features)

  const tips = generateTips(teamA, teamB, prediction.teamAWinProb, prediction.teamBWinProb, format, venueConditions)

  // Add WC-specific tips
  if (teamAIsHost) {
    tips.splice(1, 0, `${teamA} have home crowd advantage as co-hosts of the tournament`)
  } else if (teamBIsHost) {
    tips.splice(1, 0, `${teamB} have home crowd advantage as co-hosts of the tournament`)
  }
  tips.push('ICC T20 World Cup pressure can level the playing field — expect surprises')

  const playersToWatch = await selectPlayersToWatch(players, teamA, teamB, venueConditions)

  const teamAWins = Math.round(3 + teamARankNorm * 4)
  const teamBWins = Math.round(3 + teamBRankNorm * 4)

  const recentForm = {
    teamA: {
      wins: teamAWins,
      losses: 7 - teamAWins,
      trend: teamARankNorm > 0.6 ? 'Strong form — consistently performing' : teamARankNorm > 0.3 ? 'Mixed results — inconsistent' : 'Struggling — looking for a turnaround',
    },
    teamB: {
      wins: teamBWins,
      losses: 7 - teamBWins,
      trend: teamBRankNorm > 0.6 ? 'Strong form — consistently performing' : teamBRankNorm > 0.3 ? 'Mixed results — inconsistent' : 'Struggling — looking for a turnaround',
    },
  }

  const venueDisplay = venueName ? `${venueName}${venueCity ? ', ' + venueCity : ''}` : venueCountry || 'Venue TBD'

  const conditions = {
    venue: venueDisplay,
    pitchType: venueConditions.description,
    weatherImpact: venueCountry === 'India' ? 'Hot and humid — dew factor could play a role in evening matches' :
      venueCountry === 'Sri Lanka' ? 'Tropical conditions — rain interruptions possible' :
      'Clear conditions expected — full match likely',
    tossAdvice: venueConditions.pitchType > 0.6
      ? 'Win toss and bat first — pitch deteriorates for batting later'
      : venueConditions.pitchType < 0.4
        ? 'Win toss and bowl first — utilize early seam movement'
        : 'Win toss and bowl — dew factor helps chasing side in evening',
  }

  const reasoning = generateReasoning(
    teamA, teamB,
    prediction.teamAWinProb, prediction.teamBWinProb,
    features, venueConditions, format,
  )

  return {
    matchKey,
    teamA,
    teamB,
    winProbabilityA: prediction.teamAWinProb,
    winProbabilityB: prediction.teamBWinProb,
    confidence: prediction.confidence,
    tips,
    playersToWatch,
    conditions,
    recentForm,
    reasoning,
  }
}

// Extract team names from tournament competition data
function extractTeamsFromTournament(tournament: any): { teamA: string; teamB: string } | null {
  // Competition name format: "T20 of India & South Africa", "Test of Australia & England"
  const compName = tournament?.competition?.name || ''
  const matchPatterns = [
    /(?:T20|Test|Oneday|ODI)\s+of\s+(.+?)\s+&\s+(.+)/i,
    /(.+?)\s+vs?\s+(.+)/i,
  ]

  for (const pattern of matchPatterns) {
    const match = compName.match(pattern)
    if (match) {
      return {
        teamA: match[1].replace(/ Women$/, '').trim(),
        teamB: match[2].replace(/ Women$/, '').trim(),
      }
    }
  }

  // Try from tournament name: "South Africa tour of India, 2025"
  const tourName = tournament?.name || ''
  const tourPatterns = [
    /(.+?)\s+tour\s+of\s+(.+?),/i,
    /(.+?)\s+v[s]?\s+(.+?),/i,
  ]

  for (const pattern of tourPatterns) {
    const match = tourName.match(pattern)
    if (match) {
      return {
        teamA: match[2].replace(/ Women$/, '').trim(), // Host first
        teamB: match[1].replace(/ Women$/, '').trim(),
      }
    }
  }

  // Try from short_name: "IND vs SA 2025"
  const shortName = tournament?.short_name || ''
  const shortMatch = shortName.match(/^([A-Z-]+)\s+vs?\s+([A-Z-]+)/i)
  if (shortMatch) {
    const codeToName: Record<string, string> = {
      'IND': 'India', 'AUS': 'Australia', 'ENG': 'England', 'SA': 'South Africa',
      'NZ': 'New Zealand', 'PAK': 'Pakistan', 'SL': 'Sri Lanka', 'BAN': 'Bangladesh',
      'WI': 'West Indies', 'AFG': 'Afghanistan', 'IRE': 'Ireland', 'ZIM': 'Zimbabwe',
      'NED': 'Netherlands', 'SCO': 'Scotland', 'NAM': 'Namibia', 'NEP': 'Nepal',
      'UAE': 'United Arab Emirates', 'USA': 'United States',
      'IND-W': 'India', 'AUS-W': 'Australia', 'ENG-W': 'England',
      'SA-W': 'South Africa', 'NZ-W': 'New Zealand', 'PAK-W': 'Pakistan',
      'SL-W': 'Sri Lanka', 'WI-W': 'West Indies', 'ZIM-W': 'Zimbabwe',
      'IRE-W': 'Ireland', 'BAN-W': 'Bangladesh',
    }
    const teamA = codeToName[shortMatch[1].toUpperCase()] || shortMatch[1]
    const teamB = codeToName[shortMatch[2].toUpperCase()] || shortMatch[2]
    return { teamA, teamB }
  }

  return null
}

// Analyze using tournament data directly
export async function analyzeTournament(tournamentKey: string, tournamentData?: any): Promise<AnalysisResult> {
  let tournament = tournamentData

  if (!tournament) {
    try {
      const data = await getFeaturedTournaments()
      const tournaments = data?.data?.tournaments || []
      tournament = Array.isArray(tournaments)
        ? tournaments.find((t: any) => t.key === tournamentKey)
        : tournaments[tournamentKey]
    } catch (e) {
      console.warn('Could not fetch tournament:', e)
    }
  }

  const teams = extractTeamsFromTournament(tournament)
  const teamA = teams?.teamA || 'Team A'
  const teamB = teams?.teamB || 'Team B'

  const formats = tournament?.formats || []
  const format = formats[0] || 'ODI'
  const formatLabel = format === 't20' ? 'T20' : format === 'test' ? 'Test' : format === 'oneday' ? 'ODI' : format.toUpperCase()

  // Get venue/country from tournament
  const country = tournament?.countries?.[0]?.name || ''
  const venueConditions = getVenueConditions(country)

  // Determine home advantage
  const teamANorm = normalizeTeamName(teamA)
  const countryNorm = normalizeTeamName(country)
  const isHome = teamANorm.includes(countryNorm) || countryNorm.includes(teamANorm)
    ? 1.0
    : normalizeTeamName(teamB).includes(countryNorm) || countryNorm.includes(normalizeTeamName(teamB))
      ? 0.0
      : 0.5

  const teamARankNorm = getRankingNormalized(teamA, formatLabel)
  const teamBRankNorm = getRankingNormalized(teamB, formatLabel)

  // Use trained stats if available
  const statsA = getTeamStats(teamA)
  const statsB = getTeamStats(teamB)
  const trainedH2H = getTrainedH2H(teamA, teamB)

  const features: MatchFeatures = {
    teamARanking: teamARankNorm,
    teamBRanking: teamBRankNorm,
    teamARecentWinRate: statsA ? statsA.winRate : teamARankNorm * 0.8 + 0.1,
    teamBRecentWinRate: statsB ? statsB.winRate : teamBRankNorm * 0.8 + 0.1,
    h2hTeamAWinRate: trainedH2H,
    isHome,
    pitchType: venueConditions.pitchType,
    formatFactor: getFormatFactor(format),
    teamAMomentum: statsA ? statsA.momentum : teamARankNorm * 0.75 + (isHome === 1 ? 0.15 : 0.05),
    teamBMomentum: statsB ? statsB.momentum : teamBRankNorm * 0.75 + (isHome === 0 ? 0.15 : 0.05),
    teamABattingStrength: statsA ? statsA.batStrength : teamARankNorm * 0.9 + 0.05,
    teamBBattingStrength: statsB ? statsB.batStrength : teamBRankNorm * 0.9 + 0.05,
    teamABowlingStrength: statsA ? statsA.bowlStrength : teamARankNorm * 0.85 + (1 - venueConditions.pitchType) * 0.15,
    teamBBowlingStrength: statsB ? statsB.bowlStrength : teamBRankNorm * 0.85 + venueConditions.pitchType * 0.15,
  }

  const prediction = predict(features)

  const tips = generateTips(teamA, teamB, prediction.teamAWinProb, prediction.teamBWinProb, formatLabel, venueConditions)

  // Add home advantage tip
  if (isHome === 1) {
    tips.splice(1, 0, `${teamA} have home advantage — familiar conditions and crowd support`)
  } else if (isHome === 0) {
    tips.splice(1, 0, `${teamB} have home advantage — familiar conditions and crowd support`)
  }

  const playersToWatch = await selectPlayersToWatch(
    { teamA: [], teamB: [] }, teamA, teamB, venueConditions,
  )

  const teamAWins = Math.round(3 + teamARankNorm * 4)
  const teamBWins = Math.round(3 + teamBRankNorm * 4)

  const recentForm = {
    teamA: {
      wins: teamAWins,
      losses: 7 - teamAWins,
      trend: teamARankNorm > 0.6 ? 'Strong form — consistently performing' : teamARankNorm > 0.3 ? 'Mixed results — inconsistent' : 'Struggling — looking for a turnaround',
    },
    teamB: {
      wins: teamBWins,
      losses: 7 - teamBWins,
      trend: teamBRankNorm > 0.6 ? 'Strong form — consistently performing' : teamBRankNorm > 0.3 ? 'Mixed results — inconsistent' : 'Struggling — looking for a turnaround',
    },
  }

  const conditions = {
    venue: country || 'Neutral Venue',
    pitchType: venueConditions.description,
    weatherImpact: 'Clear conditions expected — full match likely',
    tossAdvice: venueConditions.pitchType > 0.6
      ? 'Win toss and bat first — pitch deteriorates for batting later'
      : venueConditions.pitchType < 0.4
        ? 'Win toss and bowl first — utilize early seam movement'
        : 'Toss advantage is marginal — both options viable',
  }

  const reasoning = generateReasoning(
    teamA, teamB,
    prediction.teamAWinProb, prediction.teamBWinProb,
    features, venueConditions, formatLabel,
  )

  return {
    matchKey: tournamentKey,
    teamA,
    teamB,
    winProbabilityA: prediction.teamAWinProb,
    winProbabilityB: prediction.teamBWinProb,
    confidence: prediction.confidence,
    tips,
    playersToWatch,
    conditions,
    recentForm,
    reasoning,
  }
}

// Get all match keys from tournament round structure
async function getAllWCMatchKeys(): Promise<{ key: string; round: string; group: string }[]> {
  try {
    const data = await roanuzGet(`tournament/${T20_WC_KEY}/`)
    const rounds = data?.data?.rounds || []
    const matchEntries: { key: string; round: string; group: string }[] = []

    for (const round of rounds) {
      const groups = round.groups || []
      for (const group of groups) {
        const matchKeys = group.match_keys || []
        for (const mk of matchKeys) {
          matchEntries.push({
            key: mk,
            round: round.name || '',
            group: group.name || '',
          })
        }
      }
    }

    return matchEntries
  } catch (e) {
    console.error('Failed to get WC match keys:', e)
    return []
  }
}

// Fetch match details in batches for dropdown
async function fetchMatchDetails(matchKeys: string[]): Promise<any[]> {
  const results: any[] = []

  // Fetch in parallel batches of 5
  for (let i = 0; i < matchKeys.length; i += 5) {
    const batch = matchKeys.slice(i, i + 5)
    const promises = batch.map(async (key) => {
      try {
        const data = await getMatchDetails(key)
        return data?.data || null
      } catch {
        return null
      }
    })
    const batchResults = await Promise.all(promises)
    results.push(...batchResults.filter(Boolean))
  }

  return results
}

// Get list of T20 World Cup 2026 matches for analysis
export async function getAvailableMatches(): Promise<any[]> {
  try {
    // Get all match keys from tournament structure
    const matchEntries = await getAllWCMatchKeys()

    // Build a quick lookup for first page of fixtures (has basic info)
    let fixtureMap: Record<string, any> = {}
    try {
      const fixtureData = await roanuzGet(`tournament/${T20_WC_KEY}/fixtures/`)
      const fixtures = fixtureData?.data?.matches || []
      for (const f of fixtures) {
        fixtureMap[f.key] = f
      }
    } catch (e) {
      // OK if this fails
    }

    // For matches not in fixtures, fetch details individually
    const missingKeys = matchEntries
      .filter(e => !fixtureMap[e.key])
      .map(e => e.key)

    if (missingKeys.length > 0) {
      const details = await fetchMatchDetails(missingKeys)
      for (const d of details) {
        if (d?.key) fixtureMap[d.key] = d
      }
    }

    // Build match list
    const matches = matchEntries.map(entry => {
      const m = fixtureMap[entry.key]
      if (!m) {
        return {
          key: entry.key,
          name: 'TBD vs TBD',
          subTitle: `${entry.group}`,
          round: entry.round,
          group: entry.group,
          tournament: 'ICC T20 World Cup 2026',
          format: 'T20',
          venue: '',
          startDate: '',
          status: 'upcoming',
          winner: null,
        }
      }

      const teamA = m.teams?.a?.name || 'TBD'
      const teamB = m.teams?.b?.name || 'TBD'
      const venue = m.venue?.name || ''
      const city = m.venue?.city || ''
      const startDate = m.start_at
        ? new Date(m.start_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : ''

      let status = m.status || 'upcoming'
      if (status === 'completed' || m.winner) status = 'completed'
      else if (status === 'started') status = 'live'
      else status = 'upcoming'

      // Extract score info from play.innings (available in match details)
      let statusNote = m.status_note || ''
      let scoreA = ''
      let scoreB = ''
      if (m.play?.innings) {
        const innings = m.play.innings
        const teamKeys = Object.keys(m.teams || {})
        for (const ik of Object.keys(innings)) {
          const inn = innings[ik]
          // Use score_str if available (e.g. "147/10 in 19.5"), otherwise build from fields
          let scoreStr = inn?.score_str || ''
          if (!scoreStr && inn?.score) {
            const runs = typeof inn.score === 'object' ? inn.score.runs : inn.score
            const wickets = inn.wickets ?? ''
            const overs = Array.isArray(inn.overs) ? `${inn.overs[0]}.${inn.overs[1]}` : inn.overs ?? ''
            scoreStr = runs !== '' && runs !== undefined ? `${runs}/${wickets} (${overs} ov)` : ''
          }
          // innings key like "a_1" or "b_1" — first char is the team key
          const teamChar = ik.split('_')[0]
          if (teamChar === teamKeys[0]) {
            scoreA = scoreStr
          } else {
            scoreB = scoreStr
          }
        }
      }

      return {
        key: entry.key,
        name: `${teamA} vs ${teamB}`,
        subTitle: m.sub_title || entry.group,
        round: entry.round,
        group: entry.group,
        tournament: 'ICC T20 World Cup 2026',
        format: 'T20',
        venue: `${venue}${city ? ', ' + city : ''}`,
        startDate,
        status,
        winner: m.winner ? (m.winner === 'a' ? teamA : teamB) : null,
        statusNote,
        scoreA,
        scoreB,
        teamA,
        teamB,
      }
    })

    // Sort: live first, then upcoming, then completed
    const statusOrder: Record<string, number> = { live: 0, upcoming: 1, completed: 2 }
    matches.sort((a, b) => (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2))

    return matches
  } catch (e) {
    console.error('Failed to get T20 WC matches:', e)
    return []
  }
}

// Keep for analyzeMatch internal use
async function fetchAllWCFixtures(): Promise<any[]> {
  try {
    const data = await roanuzGet(`tournament/${T20_WC_KEY}/fixtures/`)
    return data?.data?.matches || []
  } catch (e) {
    return []
  }
}
