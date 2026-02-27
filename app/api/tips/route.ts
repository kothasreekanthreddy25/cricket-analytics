import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    // Verify user is tipster or admin
    const user = await requireRole(['TIPSTER', 'ADMIN'])

    const { matchId, prediction, odds, confidence, analysis } = await request.json()

    if (!matchId || !prediction) {
      return NextResponse.json(
        { error: 'Match and prediction are required' },
        { status: 400 }
      )
    }

    // Verify match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Create tip
    const tip = await prisma.tip.create({
      data: {
        tipsterId: user.id,
        matchId,
        prediction,
        odds,
        confidence: confidence || 'MEDIUM',
        analysis,
      },
    })

    return NextResponse.json(tip, { status: 201 })
  } catch (error: any) {
    console.error('Create tip error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create tip' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')

    const where = matchId ? { matchId } : {}

    const tips = await prisma.tip.findMany({
      where: {
        ...where,
        isPublished: true,
      },
      include: {
        tipster: {
          select: { name: true },
        },
        match: {
          select: { name: true, date: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tips)
  } catch (error) {
    console.error('Get tips error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tips' },
      { status: 500 }
    )
  }
}
