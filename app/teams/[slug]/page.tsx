import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Shield, Crown, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

const BASE_URL = 'https://crickettips.ai'

interface SquadPlayer {
  id: number | null
  name: string
  role: string
  isCaptain: boolean
  isWicketkeeper: boolean
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const team = await prisma.team.findUnique({ where: { slug: params.slug } })
  if (!team) return { title: 'Team Not Found' }

  const squadCount = Array.isArray(team.squad) ? (team.squad as unknown as SquadPlayer[]).length : 0
  const title = `${team.name} Squad, Players & Stats`
  const description = `${team.name}'s current squad${squadCount ? ` (${squadCount} players)` : ''}, real player stats, and recent match results — updated daily.`
  const pageUrl = `${BASE_URL}/teams/${params.slug}`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: { title, description, url: pageUrl, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export const revalidate = 3600

export default async function TeamDetailPage({ params }: { params: { slug: string } }) {
  const team = await prisma.team.findUnique({ where: { slug: params.slug } })
  if (!team) notFound()

  const squad = (Array.isArray(team.squad) ? team.squad : []) as unknown as SquadPlayer[]

  const matches = await prisma.matchAnalysis.findMany({
    where: { OR: [{ teamA: team.name }, { teamB: team.name }] },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { matchKey: true, teamA: true, teamB: true, createdAt: true },
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    sport: 'Cricket',
    url: `${BASE_URL}/teams/${team.slug}`,
    ...(squad.length > 0 && {
      athlete: squad.map((p) => ({ '@type': 'Person', name: p.name })),
    }),
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/teams" className="text-sm text-gray-400 hover:text-white transition-colors mb-4 inline-block">
          &larr; Teams
        </Link>

        <div className="flex items-center gap-4 mb-8">
          {team.flag ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.flag} alt={team.name} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center">
              <Shield className="w-7 h-7 text-gray-500" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-white">{team.name}</h1>
            <p className="text-gray-500 text-sm">{team.country}</p>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-emerald-400" />
            Current Squad
          </h2>
          {squad.length === 0 ? (
            <p className="text-gray-600 text-sm">Squad data pending — refreshed daily.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {squad.map((p) => (
                <Link
                  key={p.id ?? p.name}
                  href={p.id ? `/players/${slugify(p.name)}` : '#'}
                  className={`flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 ${p.id ? 'hover:border-emerald-500/40' : 'cursor-default'}`}
                >
                  <span className="text-sm text-gray-200 flex items-center gap-1.5">
                    {p.name}
                    {p.isCaptain && <Crown className="w-3 h-3 text-yellow-400" />}
                  </span>
                  <span className="text-xs text-gray-500">{p.role}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {matches.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Recent &amp; Upcoming Matches</h2>
            <div className="space-y-2">
              {matches.map((m) => (
                <Link
                  key={m.matchKey}
                  href={`/analysis?match=${encodeURIComponent(m.matchKey)}`}
                  className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-xl px-3 py-2.5 transition-colors"
                >
                  <span className="text-sm text-gray-200">{m.teamA} vs {m.teamB}</span>
                  <span className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
