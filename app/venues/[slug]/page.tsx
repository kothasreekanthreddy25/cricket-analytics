import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { prisma } from '@/lib/prisma'

const BASE_URL = 'https://crickettips.ai'

interface VenueStats {
  matchesHosted: number
  avgFirstInnings: number | null
  tossAdvantage: string | null
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const venue = await prisma.venue.findUnique({ where: { slug: params.slug } })
  if (!venue) return { title: 'Venue Not Found' }

  const title = `${venue.name} — Pitch Report & Cricket Records`
  const description = `Pitch report, average first-innings score, and toss tendency at ${venue.name} — aggregated from real match data.`
  const pageUrl = `${BASE_URL}/venues/${params.slug}`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: { title, description, url: pageUrl, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export const revalidate = 3600

function extractVenueName(rawData: any): string | null {
  return rawData?.venue || rawData?.richPreview?.pitchReport?.venue || null
}

export default async function VenueDetailPage({ params }: { params: { slug: string } }) {
  const venue = await prisma.venue.findUnique({ where: { slug: params.slug } })
  if (!venue) notFound()

  const stats = (venue.stats || {}) as unknown as VenueStats

  const recent = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { matchKey: true, teamA: true, teamB: true, createdAt: true, rawData: true },
  })
  const matches = recent
    .filter((m) => extractVenueName(m.rawData)?.trim() === venue.name)
    .slice(0, 10)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: venue.name,
    url: `${BASE_URL}/venues/${venue.slug}`,
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/schedule" className="text-sm text-gray-400 hover:text-white transition-colors mb-4 inline-block">
          &larr; Schedule
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-7 h-7 text-gray-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">{venue.name}</h1>
            {venue.city && <p className="text-gray-500 text-sm">{venue.city}{venue.country ? `, ${venue.country}` : ''}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white font-mono">{stats.matchesHosted || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Matches tracked</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400 font-mono">{stats.avgFirstInnings ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Avg 1st innings</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.tossAdvantage || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Toss tendency</p>
          </div>
        </div>

        {matches.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Matches at this venue</h2>
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
