import Link from 'next/link'
import { User } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'Cricket Players — Real Career Stats & Profiles',
  description:
    'Real career batting and bowling stats for current international and domestic cricket players — sourced from SportMonks, updated daily. No AI guesswork.',
  keywords: [
    'cricket player stats', 'cricket player profiles', 'batting average',
    'bowling stats', 'cricket career stats', 'player rankings',
  ],
  openGraph: {
    title: 'Cricket Players — Real Career Stats & Profiles | CricketTips.ai',
    description: 'Real career stats for current cricket players, updated daily.',
    url: 'https://crickettips.ai/players',
    type: 'website',
  },
  alternates: { canonical: 'https://crickettips.ai/players' },
}

export const revalidate = 3600

export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 300,
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors mb-4 inline-block">
            &larr; Home
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Cricket Players
          </h1>
          <p className="text-gray-500 mt-1">Real career stats, updated daily — no AI-generated guesses</p>
        </div>

        {players.length === 0 ? (
          <p className="text-gray-600 text-sm">
            Player data is refreshed daily from current matches — check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {players.map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.slug}`}
                className="bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 transition-colors"
              >
                {player.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={player.image} alt={player.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{player.name}</p>
                  <p className="text-xs text-gray-500">{player.role} · {player.country}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
