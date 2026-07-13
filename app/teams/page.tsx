import Link from 'next/link'
import { Shield } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'Cricket Teams — Squads, Stats & Rankings',
  description:
    'Browse current international and domestic cricket teams with real squads, player rosters, and stats — updated daily from live match data.',
  keywords: [
    'cricket teams', 'cricket squads', 'team rankings', 'cricket team stats',
    'international cricket teams', 'T20 squads', 'ODI squads',
  ],
  openGraph: {
    title: 'Cricket Teams — Squads, Stats & Rankings | CricketTips.ai',
    description: 'Real squads and stats for current international and domestic cricket teams.',
    url: 'https://crickettips.ai/teams',
    type: 'website',
  },
  alternates: { canonical: 'https://crickettips.ai/teams' },
}

export const revalidate = 3600

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { lastSeenAt: 'desc' },
    take: 200,
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors mb-4 inline-block">
            &larr; Home
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Cricket Teams
          </h1>
          <p className="text-gray-500 mt-1">Real squads and stats, updated daily from live match data</p>
        </div>

        {teams.length === 0 ? (
          <p className="text-gray-600 text-sm">
            Team data is refreshed daily from current matches — check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.slug}`}
                className="bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 transition-colors"
              >
                {team.flag ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={team.flag} alt={team.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{team.name}</p>
                  <p className="text-xs text-gray-500">
                    {Array.isArray(team.squad) ? `${(team.squad as any[]).length} players` : 'Squad pending'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
