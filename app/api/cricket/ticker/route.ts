/**
 * GET /api/cricket/ticker
 * Lightweight endpoint for the nav ticker — powered by SportMonks.
 * Falls back to DB predictions when SportMonks is unavailable.
 */

import { NextResponse } from 'next/server'
import { getTickerData } from '@/lib/ticker'

export async function GET() {
  const data = await getTickerData()
  return NextResponse.json(data)
}

export const revalidate = 60
