import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Trophy, TrendingUp, Calendar } from 'lucide-react'

export default async function UserDashboard() {
  const user = await requireRole(['USER', 'TIPSTER', 'ADMIN'])

  // Get all published tips with upcoming matches
  const tips = await prisma.tip.findMany({
    where: {
      isPublished: true,
      match: {
        status: {
          in: ['Scheduled', 'Live'],
        },
      },
    },
    include: {
      tipster: {
        select: { name: true },
      },
      match: {
        select: { name: true, date: true, status: true, venue: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Get user's favorites
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: {
      match: {
        select: { name: true, date: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  // Group tips by match
  const tipsByMatch = tips.reduce((acc, tip) => {
    const matchId = tip.matchId
    if (!acc[matchId]) {
      acc[matchId] = {
        match: tip.match,
        tips: [],
      }
    }
    acc[matchId].tips.push(tip)
    return acc
  }, {} as Record<string, { match: any; tips: typeof tips }>)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-gray-900">Cricket Tips Dashboard</h1>
              <Link
                href="/matches"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                View Matches
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.name}</span>
              <form action="/api/auth/signout" method="POST">
                <button className="text-sm text-blue-600 hover:text-blue-700">Sign Out</button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Cricket Tips & Predictions</h2>
          <p className="text-blue-100">Expert analysis and tips for upcoming cricket matches</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Tips</p>
                <p className="text-2xl font-semibold text-gray-900">{tips.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Matches</p>
                <p className="text-2xl font-semibold text-gray-900">{Object.keys(tipsByMatch).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Favorites</p>
                <p className="text-2xl font-semibold text-gray-900">{favorites.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips by Match */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Latest Tips</h2>

          {Object.keys(tipsByMatch).length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 text-lg">No tips available at the moment</p>
              <p className="text-gray-400 mt-2">Check back later for expert predictions</p>
            </div>
          ) : (
            Object.entries(tipsByMatch).map(([matchId, { match, tips: matchTips }]) => (
              <div key={matchId} className="bg-white rounded-lg shadow">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{match.name}</h3>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                        <span>{new Date(match.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{match.venue}</span>
                        <span>•</span>
                        <span className={`font-medium ${
                          match.status === 'Live' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {match.status}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/matches/${matchId}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View Match
                    </Link>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {matchTips.map((tip) => (
                    <div key={tip.id} className="px-6 py-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-medium text-gray-900">{tip.prediction}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              tip.confidence === 'VERY_HIGH'
                                ? 'bg-green-100 text-green-800'
                                : tip.confidence === 'HIGH'
                                ? 'bg-blue-100 text-blue-800'
                                : tip.confidence === 'MEDIUM'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {tip.confidence.replace('_', ' ')}
                            </span>
                          </div>
                          {tip.analysis && (
                            <p className="text-sm text-gray-600 mt-2">{tip.analysis}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>By {tip.tipster.name}</span>
                            <span>•</span>
                            <span>{new Date(tip.createdAt).toLocaleString()}</span>
                            {tip.odds && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-gray-700">Odds: {tip.odds}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
