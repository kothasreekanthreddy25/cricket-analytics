import type { Metadata } from 'next'
import LiveMatchClient from './LiveMatchClient'
import { resolveMatchInfo } from '@/lib/ai-match-preview'

const BASE_URL = 'https://crickettips.ai'

// Server Component wrapper so this page can generate real per-match metadata
// (title, description, canonical, share image) from the [matchKey] segment —
// the interactive page itself (LiveMatchClient.tsx) has to stay a Client
// Component for its polling/state, and client components can't export
// generateMetadata. Mirrors the same split used by app/analysis/page.tsx.
export async function generateMetadata(
  { params }: { params: { matchKey: string } }
): Promise<Metadata> {
  const matchKey = params?.matchKey
  const info = matchKey ? await resolveMatchInfo(matchKey) : null
  if (!info) {
    return { title: 'Live Cricket Score' }
  }

  const title = `${info.teamA} vs ${info.teamB} Live Score — ${info.tournament}`
  const description = `Live ball-by-ball score, win probability, and AI commentary for ${info.teamA} vs ${info.teamB} (${info.tournament}). Updated every 10 seconds.`
  const ogImage = `${BASE_URL}/api/og/match?key=${encodeURIComponent(matchKey)}`
  const pageUrl = `${BASE_URL}/live/${encodeURIComponent(matchKey)}`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function LiveMatchPage({ params }: { params: { matchKey: string } }) {
  const info = params?.matchKey ? await resolveMatchInfo(params.matchKey) : null

  const jsonLd = info
    ? {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: `${info.teamA} vs ${info.teamB}`,
        sport: 'Cricket',
        startDate: info.startAt || undefined,
        location: info.venue
          ? { '@type': 'Place', name: info.venue }
          : undefined,
        competitor: [
          { '@type': 'SportsTeam', name: info.teamA },
          { '@type': 'SportsTeam', name: info.teamB },
        ],
        url: `${BASE_URL}/live/${encodeURIComponent(params.matchKey)}`,
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <LiveMatchClient />
    </>
  )
}
