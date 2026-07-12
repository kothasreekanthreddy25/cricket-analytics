import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasAdminSession } from '@/lib/admin-session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!hasAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tournamentId = req.nextUrl.searchParams.get('tournamentId') || undefined
  const series = await prisma.series.findMany({
    where: tournamentId ? { tournamentId } : undefined,
    orderBy: { startDate: 'desc' },
    include: { squads: { select: { id: true, teamName: true } }, tournament: { select: { name: true } } },
  })
  return NextResponse.json({ series })
}

export async function POST(req: NextRequest) {
  if (!hasAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId, name, format, startDate, endDate } = await req.json()
  if (!tournamentId || !name || !format || !startDate || !endDate) {
    return NextResponse.json({ error: 'tournamentId, name, format, startDate, endDate are all required' }, { status: 400 })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid startDate/endDate' }, { status: 400 })
  }
  if (end < start) {
    return NextResponse.json({ error: 'endDate must be on or after startDate' }, { status: 400 })
  }

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  const series = await prisma.series.create({
    data: {
      tournamentId,
      name: String(name).trim(),
      format: String(format).trim().toUpperCase(),
      startDate: start,
      endDate: end,
    },
  })
  return NextResponse.json({ series })
}
