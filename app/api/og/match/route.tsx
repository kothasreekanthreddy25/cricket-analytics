import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

// Edge runtime deliberately — next/og's ImageResponse has a real bug on the
// Node.js runtime on Windows dev servers (throws "Invalid URL" while trying
// to load its internal default font, before any of this route's code even
// runs; see app/api/og/match-data/route.ts for the fuller explanation).
// Edge avoids it, matching the already-working app/opengraph-image.tsx.
// Prisma needs Node.js though, so the actual data lookup is split into that
// sibling route and fetched here as plain JSON.
export const runtime = 'edge'

/**
 * GET /api/og/match?key=<matchKey>
 *
 * Per-match social share image — team names + AI win probability when
 * available, generated fresh per request (cached at the HTTP layer instead,
 * see match-data's Cache-Control header) since crawlers hit unpredictable
 * matchKeys and there's no reasonable way to pre-generate every one.
 */
export async function GET(request: NextRequest) {
  const matchKey = request.nextUrl.searchParams.get('key')

  let teamA = 'Team A'
  let teamB = 'Team B'
  let tournament = 'Cricket'
  let probA: number | null = null
  let probB: number | null = null

  if (matchKey) {
    try {
      const dataUrl = new URL(`/api/og/match-data?key=${encodeURIComponent(matchKey)}`, request.nextUrl.origin)
      const res = await fetch(dataUrl)
      if (res.ok) {
        const data = await res.json()
        teamA = data.teamA
        teamB = data.teamB
        tournament = data.tournament
        probA = data.probA
        probB = data.probB
      }
    } catch {}
  }

  const favourite = probA != null && probA >= (probB ?? 0) ? teamA : teamB
  const favouriteProb = probA != null ? Math.max(probA, probB ?? 0) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #030712 0%, #0a1120 60%, #052e2b 100%)',
          fontFamily: 'sans-serif',
          padding: 60,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: 'white' }}>
            CricketTips<span style={{ color: '#34d399' }}>.ai</span>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 16,
              fontWeight: 700,
              color: '#34d399',
              background: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              borderRadius: 999,
              padding: '4px 14px',
              marginLeft: 8,
            }}
          >
            AI PREDICTION
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 16, color: '#9ca3af', marginBottom: 10 }}>
          {tournament}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 30, marginBottom: 30 }}>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, color: 'white' }}>{teamA}</div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              fontWeight: 700,
              color: '#6b7280',
              background: '#111827',
              borderRadius: 999,
              padding: '8px 18px',
            }}
          >
            VS
          </div>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, color: 'white' }}>{teamB}</div>
        </div>

        {favouriteProb != null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 28px',
              borderRadius: 16,
              background: 'rgba(52, 211, 153, 0.08)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
            }}
          >
            <div style={{ display: 'flex', fontSize: 22, color: '#d1d5db' }}>AI predicts</div>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: '#34d399' }}>{favourite}</div>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: 'white' }}>{favouriteProb}%</div>
          </div>
        )}

        <div style={{ display: 'flex', fontSize: 16, color: '#6b7280', marginTop: 30 }}>
          18+ · Gamble Responsibly
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    }
  )
}
