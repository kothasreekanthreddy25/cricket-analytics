import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cricket Betting Odds – Live & Pre-Match Cricket Odds',
  description:
    'AI-implied cricket odds and win probability analysis for T20 World Cup 2026, IPL, and international cricket matches — compare licensed bookmakers. 18+ Gamble responsibly.',
  keywords: [
    'cricket betting odds', 'cricket odds', 'live cricket odds', 'pre-match cricket odds',
    'T20 WC 2026 odds', 'IPL betting odds', 'cricket match odds', 'best cricket odds',
    'cricket odds comparison', 'cricket win probability', 'cricket odds analysis',
    'cricket probability odds', 'today cricket odds',
  ],
  openGraph: {
    title: 'Cricket Betting Odds & AI Win Probability | CricketTips.ai',
    description:
      'Live and pre-match cricket odds with AI win probability. Compare odds for T20 WC 2026 & IPL. 18+ Gamble responsibly.',
    url: 'https://crickettips.ai/odds',
  },
  alternates: { canonical: 'https://crickettips.ai/odds' },
}

export default function OddsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
