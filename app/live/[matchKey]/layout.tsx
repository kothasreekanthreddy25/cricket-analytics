import type { Metadata } from 'next'

// Dynamic metadata is generated in page.tsx via generateMetadata.
// This layout provides the shared structural fallback.
export const metadata: Metadata = {
  title: {
    default: 'Live Cricket – Ball by Ball Scores & AI Commentary | CricketTips.ai',
    template: '%s | CricketTips.ai Live',
  },
  description:
    'Follow live cricket with ball-by-ball commentary, real-time scores, win probability, worm chart & AI predictions. Updated every 10 seconds.',
  keywords: [
    'live cricket score', 'cricket live score today', 'ball by ball cricket',
    'cricket live commentary', 'live cricket match today', 'cricket scorecard live',
    'cricket win probability', 'live T20 score', 'cricket live streaming',
    'IPL live score', 'cricket match live today', 'cricket score update',
  ],
  openGraph: {
    type: 'website',
    siteName: 'CricketTips.ai',
    title: 'Live Cricket – Ball by Ball Scores & AI Insights | CricketTips.ai',
    description:
      'Real-time cricket scores, ball-by-ball commentary, win probability & AI match insights. Updated every 10 seconds.',
    url: 'https://crickettips.ai/live',
    images: [
      {
        url: 'https://crickettips.ai/og-live.png',
        width: 1200,
        height: 630,
        alt: 'CricketTips.ai Live Cricket Scores',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live Cricket Scores & AI Predictions | CricketTips.ai',
    description: 'Ball-by-ball live cricket scores, win probability & AI commentary.',
    images: ['https://crickettips.ai/og-live.png'],
  },
  alternates: {
    canonical: 'https://crickettips.ai/live',
  },
}

export default function LiveMatchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
