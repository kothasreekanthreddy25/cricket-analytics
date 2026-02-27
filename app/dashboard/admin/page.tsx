import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Users, Award, FileText, BarChart } from 'lucide-react'

export default async function AdminDashboard() {
  const user = await requireRole(['ADMIN'])

  const [usersCount, tipstersCount, tipsCount, matchesCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'TIPSTER' } }),
    prisma.tip.count(),
    prisma.match.count(),
  ])

  const recentTips = await prisma.tip.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      tipster: { select: { name: true, email: true } },
      match: { select: { name: true } },
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{usersCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tipsters</p>
                <p className="text-2xl font-semibold text-gray-900">{tipstersCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tips</p>
                <p className="text-2xl font-semibold text-gray-900">{tipsCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <BarChart className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Matches</p>
                <p className="text-2xl font-semibold text-gray-900">{matchesCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/matches"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Matches</h3>
            <p className="text-sm text-gray-600">View and manage cricket matches</p>
          </Link>

          <Link
            href="/teams"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Teams</h3>
            <p className="text-sm text-gray-600">View and manage cricket teams</p>
          </Link>

          <Link
            href="/players"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Players</h3>
            <p className="text-sm text-gray-600">View and manage cricket players</p>
          </Link>
        </div>

        {/* Recent Tips */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tips</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentTips.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No tips submitted yet
              </div>
            ) : (
              recentTips.map((tip) => (
                <div key={tip.id} className="px-6 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{tip.match.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{tip.prediction}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        by {tip.tipster.name} • {new Date(tip.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {tip.confidence}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
