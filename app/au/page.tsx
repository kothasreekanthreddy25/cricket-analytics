import type { Metadata } from 'next'
import RegionLandingPage from '@/components/RegionLandingPage'

export const metadata: Metadata = {
  title: 'AI Cricket Predictions & Tips for Australian Cricket Fans | CricketTips.ai',
  description:
    'Free AI-powered cricket predictions for the Big Bash League, the Ashes, and Australia internationals. Live scores, win probability, and ACMA-licensed bookmakers. 18+. Chances are you\'re about to lose.',
  keywords: [
    'cricket tips Australia', 'cricket predictions Australia', 'cricket betting Australia',
    'Australian cricket tips', 'Big Bash League predictions', 'BBL tips',
    'Ashes predictions Australia', 'ACMA licensed bookmakers cricket',
  ],
  alternates: { canonical: 'https://crickettips.ai/au' },
  openGraph: {
    title: 'AI Cricket Predictions for Australian Cricket Fans | CricketTips.ai',
    description:
      'Free AI cricket predictions for the Big Bash League, the Ashes & Australia internationals. Live scores, win probability. 18+.',
    url: 'https://crickettips.ai/au',
  },
}

export default function AULandingPage() {
  return (
    <RegionLandingPage
      config={{
        countryCode: 'AU',
        flag: '🇦🇺',
        heroHeadline: (
          <>
            Cricket Predictions for{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Australia</span>,
            Powered by AI
          </>
        ),
        heroSubcopy:
          'Free AI predictions and live scores for the Big Bash League, the Ashes, and Australia internationals — plus links to ACMA-licensed bookmakers. For informational purposes only.',
        leagues: ['Big Bash League', 'The Ashes', 'Australia', 'Sheffield Shield', 'WBBL'],
        bookmakerHeading: 'Licensed Australian Bookmakers',
        bookmakerSubcopy: 'Wagering operators licensed under the Interactive Gambling Act.',
      }}
    />
  )
}
