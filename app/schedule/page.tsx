import Link from 'next/link'
import { Calendar, MapPin } from 'lucide-react'
import { getFeaturedMatches, normalizeSportMonksMatch } from '@/lib/sportmonks'

export const metadata = {
  title: 'Cricket Schedule — Upcoming Matches & Fixtures',
  description:
    'Full cricket schedule of upcoming and live matches across international and domestic tournaments, grouped by competition and date.',
  keywords: [
    'cricket schedule', 'cricket fixtures', 'cricket matches today',
    'upcoming cricket matches', 'cricket calendar', 'T20 schedule', 'ODI schedule',
  ],
  openGraph: {
    title: 'Cricket Schedule — Upcoming Matches & Fixtures | CricketTips.ai',
    description: 'Full cricket schedule of upcoming and live matches, grouped by competition.',
    url: 'https://crickettips.ai/schedule',
    type: 'website',
  },
  alternates: { canonical: 'https://crickettips.ai/schedule' },
}

export const revalidate = 1800 // 30 minutes — fixtures shift less often than live scores

export default async function SchedulePage() {
  const featured = await getFeaturedMatches()
  const matches = (featured?.data || [])
    .map(normalizeSportMonksMatch)
    .filter((m): m is NonNullable<typeof m> => !!m)
    .filter((m) => m.status === 'upcoming' || m.status === 'live')
    .sort((a, b) => new Date(a.dateTimeGMT || 0).getTime() - new Date(b.dateTimeGMT || 0).getTime())

  const byTournament = new Map<string, typeof matches>()
  for (const m of matches) {
    const key = m.tournament || 'Cricket'
    if (!byTournament.has(key)) byTournament.set(key, [])
    byTournament.get(key)!.push(m)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors mb-4 inline-block">
            &larr; Home
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Cricket Schedule
          </h1>
          <p className="text-gray-500 mt-1">Upcoming and live matches, grouped by competition</p>
        </div>

        {byTournament.size === 0 ? (
          <p className="text-gray-600 text-sm">No upcoming matches found right now — check back soon.</p>
        ) : (
          <div className="space-y-8">
            {Array.from(byTournament.entries()).map(([tournament, tMatches]) => (
              <section key={tournament}>
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">{tournament}</h2>
                <div className="space-y-2">
                  {tMatches.map((m) => (
                    <Link
                      key={m.key}
                      href={`/analysis?match=${encodeURIComponent(m.key)}`}
                      className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-xl px-4 py-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-gray-200 truncate">{m.teamA} vs {m.teamB}</p>
                        {m.venue && (
                          <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {m.venue}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0 ml-3">
                        <Calendar className="w-3 h-3" />
                        {m.dateTimeGMT ? new Date(m.dateTimeGMT).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
