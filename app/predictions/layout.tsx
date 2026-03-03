import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cricket Prediction Stats – AI Accuracy & Win Rate Tracker',
  description:
    'Track CricketTips.ai prediction accuracy with real match results. See win rates, confidence breakdowns, T20 World Cup 2026 predictions, and a ₹10,000 investment simulation. AI-powered cricket tips.',
  keywords: [
    'cricket prediction stats', 'cricket prediction accuracy', 'cricket tips results',
    'AI cricket prediction tracker', 'cricket win rate', 'T20 WC 2026 predictions',
    'cricket betting performance', 'cricket prediction history', 'cricket match results',
    'best cricket prediction site', 'cricket prediction today',
  ],
  openGraph: {
    title: 'Cricket Prediction Stats – AI Accuracy Tracker | CricketTips.ai',
    description:
      'See our AI prediction accuracy, win rates, and ₹10,000 investment simulation for T20 World Cup 2026 matches.',
    url: 'https://crickettips.ai/predictions',
  },
  alternates: { canonical: 'https://crickettips.ai/predictions' },
}

export default function PredictionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
