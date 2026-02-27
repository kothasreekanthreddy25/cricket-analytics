import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import TipsterForm from '@/components/TipsterForm'

export default async function TipsterDashboard() {
  const user = await requireRole(['TIPSTER', 'ADMIN'])

  // Get upcoming matches
  const upcomingMatches = await prisma.match.findMany({
    where: {
      status: {
        in: ['Scheduled', 'Live'],
      },
    },
    orderBy: { date: 'asc' },
    take: 50,
  })

  // Get tipster's recent tips
  const myTips = await prisma.tip.findMany({
    where: { tipsterId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      match: { select: { name: true, status: true } },
    },
  })

  const tipsCount = await prisma.tip.count({
    where: { tipsterId: user.id },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-gray-900">Tipster Dashboard</h1>
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Tips</p>
            <p className="text-3xl font-semibold text-gray-900 mt-2">{tipsCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Upcoming Matches</p>
            <p className="text-3xl font-semibold text-gray-900 mt-2">{upcomingMatches.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Recent Tips</p>
            <p className="text-3xl font-semibold text-gray-900 mt-2">{myTips.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Tip Form */}
          <div>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Create New Tip</h2>
              </div>
              <div className="p-6">
                <TipsterForm matches={upcomingMatches} tipsterId={user.id} />
              </div>
            </div>
          </div>

          {/* My Recent Tips */}
          <div>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">My Recent Tips</h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {myTips.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    You haven&apos;t created any tips yet
                  </div>
                ) : (
                  myTips.map((tip) => (
                    <div key={tip.id} className="px-6 py-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{tip.match.name}</p>
                          <p className="text-sm text-gray-600 mt-1">{tip.prediction}</p>
                          {tip.analysis && (
                            <p className="text-xs text-gray-500 mt-1">{tip.analysis}</p>
                          )}
                          {tip.odds && (
                            <p className="text-xs text-gray-600 mt-1">Odds: {tip.odds}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(tip.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="ml-4 flex flex-col items-end gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {tip.confidence}
                          </span>
                          {tip.match.status === 'Completed' && tip.result && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              tip.result === 'WIN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {tip.result}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
