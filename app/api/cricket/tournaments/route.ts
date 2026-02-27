import { NextResponse } from 'next/server'
import { getFeaturedTournaments } from '@/lib/roanuz'

export async function GET() {
  try {
    const data = await getFeaturedTournaments()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Tournaments error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 })
  }
}
