import { NextResponse } from 'next/server'
import { getLeagues } from '@/lib/sportmonks'

export async function GET() {
  try {
    const data = await getLeagues()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Tournaments error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 })
  }
}
