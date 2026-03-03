import { Shield } from 'lucide-react'

export const metadata = {
  title: 'Cricket Teams – Rankings, Stats & T20 World Cup 2026 Squads',
  description:
    'Explore ICC cricket team rankings, squad information, win rates, and performance stats. T20 World Cup 2026 team analysis including India, Australia, England, Pakistan, and more.',
  keywords: [
    'cricket teams', 'cricket team rankings', 'ICC T20 rankings', 'cricket squad',
    'T20 WC 2026 teams', 'India cricket team', 'Australia cricket team',
    'cricket team stats', 'cricket team performance', 'cricket world cup squads',
    'cricket team analysis', 'Pakistan cricket team',
  ],
  openGraph: {
    title: 'Cricket Teams & Rankings | CricketTips.ai',
    description: 'ICC cricket team rankings, squad info, and performance stats for T20 WC 2026.',
    url: 'https://crickettips.ai/teams',
  },
  alternates: { canonical: 'https://crickettips.ai/teams' },
}

const TEAMS = [
  { name: 'India', flag: '🇮🇳', ranking: 1 },
  { name: 'Australia', flag: '🇦🇺', ranking: 2 },
  { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ranking: 3 },
  { name: 'New Zealand', flag: '🇳🇿', ranking: 4 },
  { name: 'Pakistan', flag: '🇵🇰', ranking: 5 },
  { name: 'South Africa', flag: '🇿🇦', ranking: 6 },
  { name: 'West Indies', flag: '🏴', ranking: 7 },
  { name: 'Sri Lanka', flag: '🇱🇰', ranking: 8 },
]

export default function TeamsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Cricket Teams
          </h1>
          <p className="text-gray-600">
            Explore team statistics, rankings, and performance analytics
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEAMS.map((team) => (
            <div
              key={team.name}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">{team.flag}</span>
                <span className="text-sm font-semibold text-gray-500">
                  Rank #{team.ranking}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {team.name}
              </h3>
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="w-4 h-4 mr-2" />
                <span>View Team Stats</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
