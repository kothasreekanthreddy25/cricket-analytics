import { User } from 'lucide-react'

export const metadata = {
  title: 'Cricket Players – Stats, Rankings & T20 World Cup 2026 Stars',
  description:
    'In-depth cricket player profiles, career stats, T20 rankings, and match performance data. Find the best batsmen, bowlers, and all-rounders for T20 World Cup 2026 and IPL.',
  keywords: [
    'cricket players', 'cricket player stats', 'T20 player rankings', 'best cricket players',
    'Virat Kohli stats', 'Babar Azam', 'cricket batsmen', 'cricket bowlers',
    'cricket all-rounders', 'cricket player analysis', 'T20 WC 2026 players',
    'IPL players', 'cricket fantasy players', 'players to watch cricket',
  ],
  openGraph: {
    title: 'Cricket Players & Stats | CricketTips.ai',
    description: 'Cricket player profiles, career stats, and T20 WC 2026 rankings.',
    url: 'https://crickettips.ai/players',
  },
  alternates: { canonical: 'https://crickettips.ai/players' },
}

const FEATURED_PLAYERS = [
  { name: 'Virat Kohli', country: 'India', role: 'Batsman', flag: '🇮🇳' },
  { name: 'Steve Smith', country: 'Australia', role: 'Batsman', flag: '🇦🇺' },
  { name: 'Joe Root', country: 'England', role: 'Batsman', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Kane Williamson', country: 'New Zealand', role: 'Batsman', flag: '🇳🇿' },
  { name: 'Babar Azam', country: 'Pakistan', role: 'Batsman', flag: '🇵🇰' },
  { name: 'Jasprit Bumrah', country: 'India', role: 'Bowler', flag: '🇮🇳' },
  { name: 'Pat Cummins', country: 'Australia', role: 'Bowler', flag: '🇦🇺' },
  { name: 'Kagiso Rabada', country: 'South Africa', role: 'Bowler', flag: '🇿🇦' },
]

export default function PlayersPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Cricket Players
          </h1>
          <p className="text-gray-600">
            Explore player statistics, records, and performance analytics
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_PLAYERS.map((player) => (
            <div
              key={player.name}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-100"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
                {player.name}
              </h3>
              <div className="text-center space-y-1">
                <p className="text-sm text-gray-600">
                  {player.flag} {player.country}
                </p>
                <p className="text-xs font-medium text-blue-600">
                  {player.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
