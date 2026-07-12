import type { Metadata } from 'next'

// Per-match title/description/canonical/OG image come from page.tsx's
// generateMetadata (it has real team names to work with). This layout only
// supplies sitewide fallbacks — no canonical/title/OG here, since a
// hardcoded one would apply to every match and override the real per-match
// values Next merges in from the page level.
export const metadata: Metadata = {
  keywords: [
    'live cricket score', 'cricket live score today', 'ball by ball cricket',
    'cricket live commentary', 'live cricket match today', 'cricket scorecard live',
    'cricket win probability', 'live T20 score', 'cricket live streaming',
    'IPL live score', 'cricket match live today', 'cricket score update',
  ],
}

export default function LiveMatchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
