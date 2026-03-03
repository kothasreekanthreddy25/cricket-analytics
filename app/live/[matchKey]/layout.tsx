import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live Cricket Match – Ball by Ball Scores & AI Commentary',
  description:
    'Follow live cricket with ball-by-ball commentary, real-time scores, win probability, worm chart, and Manhattan chart. AI-powered match insights updated every 10 seconds.',
  keywords: [
    'live cricket score', 'ball by ball cricket', 'cricket live commentary',
    'live cricket match', 'cricket scorecard live', 'cricket win probability live',
    'live cricket updates', 'cricket worm chart', 'cricket manhattan chart',
    'live T20 score', 'cricket live streaming', 'cricket match live',
  ],
  openGraph: {
    title: 'Live Cricket – Ball by Ball Scores & AI Insights | CricketTips.ai',
    description:
      'Real-time cricket scores, ball-by-ball commentary, win probability & AI match insights. Updated every 10 seconds.',
    url: 'https://crickettips.ai/live',
  },
}

export default function LiveMatchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
