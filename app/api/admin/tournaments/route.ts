import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasAdminSession } from '@/lib/admin-session'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!hasAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: 'desc' },
    include: { series: { select: { id: true } } },
  })
  return NextResponse.json({ tournaments })
}

export async function POST(req: NextRequest) {
  if (!hasAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, country } = await req.json()
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: 'Tournament name is required' }, { status: 400 })
  }

  const tournament = await prisma.tournament.create({
    data: { name: String(name).trim(), country: country ? String(country).trim() : null },
  })
  return NextResponse.json({ tournament })
}
