import { NextRequest, NextResponse } from 'next/server'
import { roanuzGet } from '@/lib/roanuz'

export const dynamic = 'force-dynamic'

function extractPlayers(playersObj: any): any[] {
  if (!playersObj) return []
  if (Array.isArray(playersObj)) return playersObj
  return Object.values(playersObj)
}

function roleLabel(role: string | undefined): string {
  if (!role) return 'Player'
  const r = role.toLowerCase()
  if (r.includes('wicket')) return 'WK'
  if (r.includes('all')) return 'AR'
  if (r.includes('bowl')) return 'BOWL'
  if (r.includes('bat')) return 'BAT'
  return 'Player'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const matchKey = searchParams.get('matchKey')
  const side = searchParams.get('side') || 'a' // 'a' or 'b'

  if (!matchKey) {
    return NextResponse.json({ success: false, error: 'matchKey required' }, { status: 400 })
  }

  try {
    let data: any
    try {
      data = await roanuzGet(`match/${matchKey}/`)
    } catch (authErr: any) {
      // Return a graceful unavailable response instead of a hard error
      return NextResponse.json({
        success: true,
        matchKey,
        team: { name: side === 'a' ? 'Team A' : 'Team B', code: '', flag: null },
        opponent: { name: 'TBD', code: '' },
        match: { tournament: '', format: 'T20', venue: null, startAt: null, status: 'upcoming', statusNote: null },
        players: [],
        playerCount: 0,
        source: 'unavailable',
        reason: 'Live squad data requires an active Roanuz API plan. Please check your API credentials.',
      })
    }

    const match = data?.data?.match || data?.data

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 })
    }

    const teamInfo = match.teams?.[side]
    const teamName = teamInfo?.name || (side === 'a' ? 'Team A' : 'Team B')
    const teamCode = teamInfo?.code || ''

    // Try playing 11 first, fall back to squad
    const play = match.play || {}
    const playing11Raw =
      play.playing11?.[side] ||
      play.playing_11?.[side] ||
      play[`team_${side}_playing11`] ||
      null

    const squadRaw =
      match.squad?.[side] ||
      match.squads?.[side] ||
      match.players?.[side] ||
      null

    let players: any[] = []
    let source: 'playing11' | 'squad' | 'none' = 'none'

    if (playing11Raw && Object.keys(playing11Raw).length > 0) {
      players = extractPlayers(playing11Raw)
      source = 'playing11'
    } else if (squadRaw && Object.keys(squadRaw).length > 0) {
      players = extractPlayers(squadRaw)
      source = 'squad'
    }

    const formatted = players.map((p: any) => ({
      key: p.key || p.player_key || p.name?.toLowerCase().replace(/\s+/g, '-'),
      name: p.name || p.player_name || 'Unknown',
      role: roleLabel(p.playing_role || p.role),
      roleRaw: p.playing_role || p.role || '',
      isCaptain: !!(p.is_captain || p.captain),
      isKeeper: !!(p.is_keeper || p.wicket_keeper),
      battingStyle: p.batting_style || null,
      bowlingStyle: p.bowling_style || null,
      nationality: p.nationality || p.country || null,
    }))

    // Sort: captain first, then keeper, then batters, all-rounders, bowlers
    const roleOrder: Record<string, number> = { WK: 1, BAT: 2, AR: 3, BOWL: 4, Player: 5 }
    formatted.sort((a, b) => {
      if (a.isCaptain) return -1
      if (b.isCaptain) return 1
      return (roleOrder[a.role] ?? 5) - (roleOrder[b.role] ?? 5)
    })

    // Match meta
    const opponent = match.teams?.[side === 'a' ? 'b' : 'a']
    const matchStatus: string =
      match.status === 'started' ? 'live'
      : match.status === 'completed' ? 'completed'
      : 'upcoming'

    return NextResponse.json({
      success: true,
      matchKey,
      team: {
        name: teamName,
        code: teamCode,
        flag: teamInfo?.flag_url || null,
      },
      opponent: {
        name: opponent?.name || 'TBD',
        code: opponent?.code || '',
      },
      match: {
        tournament: match.tournament?.name || '',
        format: match.format?.toUpperCase() || 'T20',
        venue: [match.venue?.name, match.venue?.city].filter(Boolean).join(', ') || null,
        startAt: match.start_at ? new Date(match.start_at * 1000).toISOString() : null,
        status: matchStatus,
        statusNote: match.play?.result?.msg || null,
      },
      players: formatted,
      playerCount: formatted.length,
      source, // 'playing11' | 'squad' | 'none'
    })
  } catch (e: any) {
    console.error('[teams/playing11]', e.message)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
