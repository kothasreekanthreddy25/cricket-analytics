import type { Metadata } from 'next'
import AnalysisPageClient from '@/components/AnalysisPageClient'
import { resolveMatchInfo } from '@/lib/ai-match-preview'

const BASE_URL = 'https://crickettips.ai'

// Server Component wrapper so this page can generate real per-match
// metadata (title, description, share image) from the ?match= query param —
// the interactive page itself (components/AnalysisPageClient.tsx) has to
// stay a Client Component for its state/effects, and client components
// can't export generateMetadata.
export async function generateMetadata(
  { searchParams }: { searchParams: { match?: string } }
): Promise<Metadata> {
  const matchKey = searchParams?.match
  if (!matchKey) {
    return {
      title: 'AI Match Analysis',
      description: 'Pick a match to see AI-powered pitch reports, players to watch, and win probability — free cricket predictions.',
    }
  }

  const info = await resolveMatchInfo(matchKey)
  if (!info) {
    return { title: 'AI Match Analysis' }
  }

  const title = `${info.teamA} vs ${info.teamB} — AI Prediction & Analysis`
  const description = `AI-powered pitch report, players to watch, and win probability for ${info.teamA} vs ${info.teamB} (${info.tournament}). Free cricket predictions by CricketTips.ai.`
  const ogImage = `${BASE_URL}/api/og/match?key=${encodeURIComponent(matchKey)}`
  const pageUrl = `${BASE_URL}/analysis?match=${encodeURIComponent(matchKey)}`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
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

export default function AnalysisPage() {
  return <AnalysisPageClient />
}
