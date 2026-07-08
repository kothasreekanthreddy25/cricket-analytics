import { NextResponse } from 'next/server'
import { getTopWeeklyPredictions } from '@/lib/top-weekly'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET() {
  try {
    const predictions = await getTopWeeklyPredictions()
    return NextResponse.json({ success: true, predictions })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, predictions: [] })
  }
}
