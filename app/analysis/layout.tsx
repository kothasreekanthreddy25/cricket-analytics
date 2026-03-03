import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Cricket Match Analysis – Win Probability & Match Predictions',
  description:
    'Get AI-powered cricket match analysis with win probability, players to watch, pitch conditions, and form guides. TensorFlow.js neural network analysis for every T20 World Cup 2026 match.',
  keywords: [
    'cricket match analysis', 'cricket win probability', 'AI cricket analysis',
    'TensorFlow cricket predictions', 'cricket neural network', 'T20 match analysis',
    'cricket pitch conditions', 'cricket form guide', 'players to watch cricket',
    'cricket betting analysis', 'cricket match insights', 'cricket AI tips',
    'T20 World Cup 2026 analysis', 'cricket head to head', 'cricket match preview',
  ],
  openGraph: {
    title: 'AI Cricket Match Analysis & Win Probability | CricketTips.ai',
    description:
      'TensorFlow.js-powered cricket analysis: win probability, pitch conditions, player insights, and form guides for every match.',
    url: 'https://crickettips.ai/analysis',
  },
  alternates: { canonical: 'https://crickettips.ai/analysis' },
}

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
