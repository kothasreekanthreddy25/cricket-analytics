import type { Metadata } from 'next'
import RegionLandingPage from '@/components/RegionLandingPage'

export const metadata: Metadata = {
  title: 'AI Cricket Predictions & Betting Tips for UK Punters | CricketTips.ai',
  description:
    'Free AI-powered cricket predictions for England, the Ashes, T20 Blast, and The Hundred. Live scores, win probability, and odds from UKGC-licensed bookmakers. 18+ Gamble responsibly.',
  keywords: [
    'cricket tips UK', 'cricket predictions UK', 'England cricket predictions',
    'cricket betting tips UK', 'best cricket tipster UK', 'Ashes predictions',
    'T20 Blast tips', 'The Hundred predictions', 'UKGC licensed bookmakers cricket',
  ],
  alternates: { canonical: 'https://crickettips.ai/uk' },
  openGraph: {
    title: 'AI Cricket Predictions for UK Punters | CricketTips.ai',
    description:
      'Free AI cricket predictions for England, the Ashes & T20 Blast. Live scores, win probability, UKGC-licensed odds. 18+ Gamble responsibly.',
    url: 'https://crickettips.ai/uk',
  },
}

export default function UKLandingPage() {
  return (
    <RegionLandingPage
      config={{
        countryCode: 'GB',
        flag: '🇬🇧',
        heroHeadline: (
          <>
            Cricket Predictions for the{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">UK</span>,
            Powered by AI
          </>
        ),
        heroSubcopy:
          'Free AI predictions and live scores for England internationals, the Ashes, T20 Blast, and The Hundred — plus odds comparison from UKGC-licensed bookmakers. For informational purposes only.',
        leagues: ['England', 'The Ashes', 'T20 Blast', 'The Hundred', 'County Championship'],
        bookmakerHeading: 'UKGC-Licensed Bookmakers',
        bookmakerSubcopy: 'Compare odds and offers from bookmakers licensed by the UK Gambling Commission.',
      }}
    />
  )
}
