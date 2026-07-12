import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasAdminSession } from '@/lib/admin-session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!hasAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seriesId = req.nextUrl.searchParams.get('seriesId')
  if (!seriesId) return NextResponse.json({ error: 'seriesId is required' }, { status: 400 })

  const squads = await prisma.seriesSquad.findMany({
    where: { seriesId },
    orderBy: { teamName: 'asc' },
  })
  return NextResponse.json({ squads })
}

export async function POST(req: NextRequest) {
  if (!hasAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { seriesId, teamName, players } = await req.json()
  if (!seriesId || !teamName || !Array.isArray(players)) {
    return NextResponse.json({ error: 'seriesId, teamName, and players[] are required' }, { status: 400 })
  }

  const cleanPlayers = players
    .map((p: any) => ({
      id: typeof p?.id === 'number' ? p.id : null,
      name: String(p?.name || '').trim(),
      role: String(p?.role || 'Player').trim(),
      isCaptain: !!p?.isCaptain,
      isWicketkeeper: !!p?.isWicketkeeper,
    }))
    .filter((p: any) => p.name)

  if (cleanPlayers.length === 0) {
    return NextResponse.json({ error: 'At least one named player is required' }, { status: 400 })
  }

  const series = await prisma.series.findUnique({ where: { id: seriesId } })
  if (!series) return NextResponse.json({ error: 'Series not found' }, { status: 404 })

  const squad = await prisma.seriesSquad.upsert({
    where: { seriesId_teamName: { seriesId, teamName: String(teamName).trim() } },
    create: { seriesId, teamName: String(teamName).trim(), players: cleanPlayers },
    update: { players: cleanPlayers },
  })
  return NextResponse.json({ squad })
}

export async function DELETE(req: NextRequest) {
  if (!hasAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  await prisma.seriesSquad.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ success: true })
}
