'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Radio, ChevronDown, ChevronRight } from 'lucide-react'

interface Tournament {
  key: string
  name: string
  short_name: string
  start_date: number
  last_scheduled_match_date: number
  formats: string[]
  gender: string
  countries: { name: string; short_code: string }[]
}

const STATIC_NAV = [
  { label: 'Match Predictions', href: '/predictions' },
  { label: 'Analysis', href: '/analysis' },
  { label: 'Odds', href: '/odds' },
  { label: 'Teams', href: '/teams' },
  { label: 'Players', href: '/players' },
  { label: 'News', href: '/blog' },
  { label: 'Schedule', href: '/matches' },
]

export default function LiveMatchesTicker() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('series') || 'all'

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/matches')
        const json = await res.json()
        const tournamentList =
          json.data?.data?.tournaments ||
          json.data?.tournaments ||
          json.tournaments ||
          []
        if (json.success && tournamentList.length > 0) {
          const now = Date.now() / 1000
          const relevant = tournamentList
            .filter((t: Tournament) => t.last_scheduled_match_date > now)
            .sort((a: Tournament, b: Tournament) => a.start_date - b.start_date)
            .slice(0, 12)
          setTournaments(relevant)
        }
      } catch (err) {
        console.error('Failed to fetch live data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const now = Date.now() / 1000

  function getStatus(t: Tournament) {
    if (now >= t.start_date && now <= t.last_scheduled_match_date) return 'live'
    if (t.start_date > now) return 'upcoming'
    return 'completed'
  }

  const liveTournaments = tournaments.filter((t) => getStatus(t) === 'live')
  const upcomingTournaments = tournaments.filter((t) => getStatus(t) === 'upcoming')

  const tabs = [
    { key: 'all', label: `ALL MATCHES (${tournaments.length})` },
    ...liveTournaments.slice(0, 5).map((t) => ({
      key: t.key,
      label: t.short_name?.toUpperCase() || t.name?.toUpperCase(),
      isLive: true,
    })),
    ...upcomingTournaments.slice(0, 3).map((t) => ({
      key: t.key,
      label: t.short_name?.toUpperCase() || t.name?.toUpperCase(),
      isLive: false,
    })),
  ]

  function handleTabClick(key: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (key === 'all') {
      params.delete('series')
    } else {
      params.set('series', key)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="bg-gray-900 border-b border-gray-800 sticky top-16 z-40">
      {/* ── Row 1: Main Nav Links ── */}
      <div className="border-b border-gray-800/60">
        <div className="max-w-[1600px] mx-auto px-2 flex items-stretch overflow-x-auto scrollbar-hide">
          {/* Live Scores Button */}
          <Link
            href="/matches"
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wide shrink-0 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Live Scores
          </Link>

          {/* Dynamic Tournament Dropdowns */}
          {!loading && liveTournaments.slice(0, 4).map((t) => (
            <TournamentNavLink key={t.key} tournament={t} status="live" />
          ))}
          {!loading && upcomingTournaments.slice(0, 3).map((t) => (
            <TournamentNavLink key={t.key} tournament={t} status="upcoming" />
          ))}

          {/* Static Nav Links */}
          {STATIC_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wide whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                pathname === link.href
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Row 2: Series Filter Tabs ── */}
      {tabs.length > 1 && (
        <div className="max-w-[1600px] mx-auto px-2 flex items-center gap-1 overflow-x-auto scrollbar-hide py-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.key !== 'all' && (
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    (tab as any).isLive ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                  }`}
                />
              )}
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TournamentNavLink({
  tournament,
  status,
}: {
  tournament: Tournament
  status: 'live' | 'upcoming'
}) {
  const [open, setOpen] = useState(false)
  const label = tournament.short_name || tournament.name

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide whitespace-nowrap border-b-2 transition-colors ${
          status === 'live'
            ? 'border-green-500 text-green-400 hover:text-green-300'
            : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
        }`}
      >
        {status === 'live' && (
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        )}
        {label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px] z-50">
          <Link
            href="/matches"
            className="flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <span>Match Schedule</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
          <Link
            href="/analysis"
            className="flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <span>AI Predictions</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
          <Link
            href="/odds"
            className="flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <span>Odds & Analysis</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
          <Link
            href="/teams"
            className="flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <span>Teams & Stats</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
