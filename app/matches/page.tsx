import LiveMatches from '@/components/LiveMatches'

export const metadata = {
  title: 'Live Cricket Scores – Today\'s Cricket Matches & Schedules',
  description:
    'Follow all live cricket matches with real-time scores, upcoming fixtures, and match schedules. T20 World Cup 2026, IPL, and international cricket — updated every 5 seconds.',
  keywords: [
    'live cricket scores', 'cricket matches today', 'cricket schedule', 'live cricket match',
    'cricket scorecard', 'T20 WC 2026 matches', 'IPL live scores', 'cricket fixtures',
    'today cricket match', 'international cricket live', 'cricket match updates',
  ],
  openGraph: {
    title: 'Live Cricket Scores & Fixtures | CricketTips.ai',
    description: 'Real-time cricket scores and upcoming fixtures for T20 WC 2026, IPL, and international matches.',
    url: 'https://crickettips.ai/matches',
  },
  alternates: { canonical: 'https://crickettips.ai/matches' },
}

export default function MatchesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Live Matches
          </h1>
          <p className="text-gray-600">
            Follow all live and upcoming cricket matches with real-time updates
          </p>
        </div>

        <LiveMatches />
      </div>
    </div>
  )
}
