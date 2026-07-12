import type { Metadata } from 'next'

// Per-match title/description/canonical/OG image come from page.tsx's
// generateMetadata (it resolves real team names from the ?match= query
// param). This layout only supplies sitewide fallbacks — no canonical/title
// here, since a hardcoded one would apply to every match.
export const metadata: Metadata = {
  keywords: [
    'cricket match analysis', 'cricket win probability', 'AI cricket analysis',
    'TensorFlow cricket predictions', 'cricket neural network', 'T20 match analysis',
    'cricket pitch conditions', 'cricket form guide', 'players to watch cricket',
    'cricket betting analysis', 'cricket match insights', 'cricket AI tips',
    'T20 World Cup 2026 analysis', 'cricket head to head', 'cricket match preview',
  ],
}

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
