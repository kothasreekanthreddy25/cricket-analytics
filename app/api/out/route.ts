import { NextRequest, NextResponse } from 'next/server'
import { getBookmakerById } from '@/lib/bookmakers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/out?id=bet365uk&src=sidebar&match=67370
 *
 * First-party outbound click tracker for bookmaker/affiliate links. Every
 * "Claim Bonus" / "Visit Site" CTA routes through here instead of linking
 * directly to the operator, so click volume is measurable even for UK/AU
 * bookmakers that don't have their own affiliate tracking IDs yet — and it
 * resolves the real destination server-side by id, so no raw external URL
 * is ever passed as a query param (avoids an open-redirect surface).
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const source = request.nextUrl.searchParams.get('src') || 'unknown'
  const matchKey = request.nextUrl.searchParams.get('match')

  const bookmaker = id ? getBookmakerById(id) : undefined
  if (!bookmaker) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const country =
    request.headers.get('x-country') ||
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    'ZA'

  try {
    await prisma.affiliateClick.create({
      data: {
        bookmakerId: bookmaker.id,
        bookmakerName: bookmaker.name,
        country: country.toUpperCase(),
        source,
        matchKey: matchKey || null,
        referer: request.headers.get('referer') || null,
      },
    })
  } catch (err) {
    // Never block the redirect on logging — a missed click log is far
    // better than a broken affiliate link.
    console.warn('[api/out] Could not log click:', err)
  }

  return NextResponse.redirect(bookmaker.url)
}
