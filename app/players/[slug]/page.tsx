import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { User, Crown } from 'lucide-react'
import { prisma } from '@/lib/prisma'

const BASE_URL = 'https://crickettips.ai'

interface FormatStats {
  battingMatches: number
  runs: number
  battingAvg: number
  strikeRate: number
  fifties: number
  hundreds: number
  bowlingMatches: number
  wickets: number
  economy: number
  bowlingAvg: number
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const player = await prisma.player.findUnique({ where: { slug: params.slug } })
  if (!player) return { title: 'Player Not Found' }

  const title = `${player.name} — Career Stats & Profile`
  const description = `${player.name}'s real career batting and bowling stats (${player.role}, ${player.country}) — sourced from SportMonks, not AI-generated.`
  const pageUrl = `${BASE_URL}/players/${params.slug}`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: { title, description, url: pageUrl, type: 'profile' },
    twitter: { card: 'summary', title, description },
  }
}

export const revalidate = 3600

function StatBlock({ label, stats }: { label: string; stats: FormatStats | null }) {
  if (!stats || (stats.runs === 0 && stats.wickets === 0)) return null
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">{label}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {stats.runs > 0 && (
          <>
            <div>
              <p className="text-gray-500 text-xs">Runs</p>
              <p className="text-white font-mono font-bold">{stats.runs}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Average</p>
              <p className="text-white font-mono font-bold">{stats.battingAvg.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Strike Rate</p>
              <p className="text-white font-mono font-bold">{stats.strikeRate.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">50s / 100s</p>
              <p className="text-white font-mono font-bold">{stats.fifties} / {stats.hundreds}</p>
            </div>
          </>
        )}
        {stats.wickets > 0 && (
          <>
            <div>
              <p className="text-gray-500 text-xs">Wickets</p>
              <p className="text-white font-mono font-bold">{stats.wickets}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Economy</p>
              <p className="text-white font-mono font-bold">{stats.economy.toFixed(2)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default async function PlayerDetailPage({ params }: { params: { slug: string } }) {
  const player = await prisma.player.findUnique({ where: { slug: params.slug } })
  if (!player) notFound()

  const stats = (player.stats || {}) as Record<string, FormatStats | null>
  const teams = player.teamIds.length > 0
    ? await prisma.team.findMany({ where: { teamId: { in: player.teamIds } } })
    : []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.name,
    nationality: player.country,
    jobTitle: `Cricket ${player.role}`,
    url: `${BASE_URL}/players/${player.slug}`,
    ...(teams.length > 0 && { memberOf: teams.map((t) => ({ '@type': 'SportsTeam', name: t.name })) }),
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/players" className="text-sm text-gray-400 hover:text-white transition-colors mb-4 inline-block">
          &larr; Players
        </Link>

        <div className="flex items-center gap-4 mb-2">
          {player.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.image} alt={player.name} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-500" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-white">{player.name}</h1>
            <p className="text-gray-500 text-sm">{player.role} · {player.country}</p>
          </div>
        </div>

        {(player.battingStyle || player.bowlingStyle) && (
          <div className="flex gap-3 mb-8 text-xs text-gray-500">
            {player.battingStyle && <span>{player.battingStyle}</span>}
            {player.bowlingStyle && <span>{player.bowlingStyle}</span>}
          </div>
        )}

        {teams.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {teams.map((t) => (
              <Link
                key={t.id}
                href={`/teams/${t.slug}`}
                className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs text-gray-300 transition-colors"
              >
                <Crown className="w-3 h-3 text-gray-600" />
                {t.name}
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatBlock label="ODI" stats={stats.odi} />
          <StatBlock label="T20I" stats={stats.t20i} />
          <StatBlock label="Test" stats={stats.test} />
        </div>

        {!stats.odi && !stats.t20i && !stats.test && (
          <p className="text-gray-600 text-sm mt-4">Career stats pending — refreshed daily.</p>
        )}
      </div>
    </div>
  )
}
