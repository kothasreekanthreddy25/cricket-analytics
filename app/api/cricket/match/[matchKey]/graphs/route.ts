import { NextRequest, NextResponse } from 'next/server'
import { roanuzGet } from '@/lib/roanuz'

/**
 * GET /api/cricket/match/{matchKey}/graphs
 *
 * Returns worm, manhattan, and run-rate data from Roanuz v5 in one call.
 * Gracefully handles individual endpoint failures.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { matchKey: string } }
) {
  const matchKey = params.matchKey

  try {
    const [wormRes, manhattanRes, runRateRes] = await Promise.allSettled([
      roanuzGet(`match/${matchKey}/worm/`),
      roanuzGet(`match/${matchKey}/manhattan/`),
      roanuzGet(`match/${matchKey}/run-rate/`),
    ])

    return NextResponse.json({
      success: true,
      worm: wormRes.status === 'fulfilled' ? wormRes.value?.data : null,
      manhattan: manhattanRes.status === 'fulfilled' ? manhattanRes.value?.data : null,
      runRate: runRateRes.status === 'fulfilled' ? runRateRes.value?.data : null,
      errors: {
        worm: wormRes.status === 'rejected' ? wormRes.reason?.message : null,
        manhattan: manhattanRes.status === 'rejected' ? manhattanRes.reason?.message : null,
        runRate: runRateRes.status === 'rejected' ? runRateRes.reason?.message : null,
      },
    })
  } catch (error: any) {
    console.error('Graphs API error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
