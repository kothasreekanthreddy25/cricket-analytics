import LiveMatches from '@/components/LiveMatches'

export const metadata = {
  title: 'Live Cricket Matches - Cricket Analytics',
  description: 'View all live and upcoming cricket matches with real-time scores',
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
