import { NextRequest, NextResponse } from 'next/server'
import { hasAdminSession } from '@/lib/admin-session'
import { searchPlayers } from '@/lib/sportmonks'

export const dynamic = 'force-dynamic'

// Real SportMonks player lookup for the squad-builder type-ahead — deliberately
// NOT /api/players/search, which returns AI-hallucinated stats with no numeric
// SportMonks ID (useless for enrichPlayersWithRealStats downstream).
export async function GET(req: NextRequest) {
  if (!hasAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) return NextResponse.json({ players: [] })

  try {
    const data = await searchPlayers(query)
    const players = (data?.data || []).slice(0, 15).map((p: any) => ({
      id: typeof p.id === 'number' ? p.id : null,
      name: p.fullname || `${p.firstname || ''} ${p.lastname || ''}`.trim(),
      role: p.position?.name || 'Player',
    })).filter((p: any) => p.id && p.name)
    return NextResponse.json({ players })
  } catch (e: any) {
    return NextResponse.json({ players: [], error: e.message }, { status: 502 })
  }
}
