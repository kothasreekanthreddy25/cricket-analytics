'use client'

import { useEffect, useState } from 'react'
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

const NAV_LINKS = [
  { label: 'Live Scores', href: '/matches' },
  { label: 'News', href: '/blog' },
  { label: 'Predictions', href: '/predictions' },
  { label: 'Analysis', href: '/analysis' },
  { label: 'Odds', href: '/odds' },
  { label: 'Teams', href: '/teams' },
  { label: 'Players', href: '/players' },
  { label: 'Schedule', href: '/matches' },
]

export default function LiveMatchesTicker() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('series') || 'all'

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/matches')
        const json = await res.json()
        const list =
          json.data?.data?.tournaments ||
          json.data?.tournaments ||
          json.tournaments ||
          []
        if (json.success && list.length > 0) {
          const now = Date.now() / 1000
          const relevant = list
            .filter((t: Tournament) => t.last_scheduled_match_date > now)
            .sort((a: Tournament, b: Tournament) => a.start_date - b.start_date)
            .slice(0, 15)
          setTournaments(relevant)
        }
      } catch {}
      finally { setLoading(false) }
    }
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const now = Date.now() / 1000
  const isLive = (t: Tournament) => now >= t.start_date && now <= t.last_scheduled_match_date
  const isUpcoming = (t: Tournament) => t.start_date > now

  const liveTournaments = tournaments.filter(isLive)
  const upcomingTournaments = tournaments.filter(isUpcoming)

  // Score card tabs
  const scoreTabs = [
    { key: 'all', label: `ALL (${tournaments.length})`, isLive: false },
    ...liveTournaments.slice(0, 6).map(t => ({ key: t.key, label: t.short_name || t.name, isLive: true })),
    ...upcomingTournaments.slice(0, 4).map(t => ({ key: t.key, label: t.short_name || t.name, isLive: false })),
  ]

  function handleTabClick(key: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (key === 'all') params.delete('series')
    else params.set('series', key)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="bg-gray-900 border-b border-gray-800 sticky top-[48px] z-40">

      {/* ── Row 1: Nav Links ── */}
      <div className="border-b border-gray-800/50">
        <div className="max-w-[1600px] mx-auto flex items-stretch overflow-x-auto scrollbar-hide">

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-red-600 shrink-0">
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">Live</span>
          </div>

          {/* Dynamic tournament dropdowns */}
          {!loading && liveTournaments.slice(0, 4).map(t => (
            <TournamentDropdown key={t.key} label={t.short_name || t.name} live />
          ))}
          {!loading && upcomingTournaments.slice(0, 2).map(t => (
            <TournamentDropdown key={t.key} label={t.short_name || t.name} live={false} />
          ))}

          {/* Static nav */}
          {NAV_LINKS.map(link => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className={`flex items-center px-3 py-2 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap shrink-0 border-b-2 transition-colors ${
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

      {/* ── Row 2: Small Match Cards ── */}
      {!loading && tournaments.length > 0 && (
        <div className="max-w-[1600px] mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide px-2 py-1.5">
          {/* ALL filter pill */}
          <button
            onClick={() => handleTabClick('all')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0 transition-all border ${
              activeTab === 'all'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            ALL ({tournaments.length})
          </button>

          {/* Small match cards */}
          {tournaments.slice(0, 10).map(t => {
            const live = isLive(t)
            const startDate = new Date(t.start_date * 1000)
            const dateStr = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            const timeStr = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            const teams = t.countries?.slice(0, 2).map(c => c.short_code || c.name) || []
            const href = live ? `/live/${t.key}` : '/predictions'

            return (
              <Link
                key={t.key}
                href={href}
                className={`flex flex-col shrink-0 rounded-lg border px-2.5 py-1.5 min-w-[140px] max-w-[160px] transition-all cursor-pointer ${
                  live
                    ? 'border-green-600/60 bg-green-900/15 hover:border-green-500 hover:bg-green-900/25'
                    : 'border-gray-700/50 bg-gray-800/40 hover:border-emerald-500/40 hover:bg-gray-800/70'
                }`}
              >
                {/* Status row */}
                <div className="flex items-center justify-between mb-1">
                  {live ? (
                    <span className="flex items-center gap-1 text-green-400 text-[9px] font-bold uppercase">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      LIVE
                    </span>
                  ) : (
                    <span className="text-gray-500 text-[9px]">{dateStr} · {timeStr}</span>
                  )}
                  <span className="text-[9px] text-gray-600 bg-gray-700/40 px-1 rounded">
                    {t.formats?.[0]?.toUpperCase() || 'T20'}
                  </span>
                </div>

                {/* Teams */}
                <div className="text-white text-[11px] font-bold leading-tight truncate">
                  {teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : t.short_name || t.name}
                </div>

                {/* CTA */}
                {live ? (
                  <div className="text-green-400 text-[9px] font-semibold mt-1">
                    Live Score + Commentary →
                  </div>
                ) : (
                  <div className="text-emerald-400 text-[9px] font-medium mt-1">
                    AI Prediction →
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TournamentDropdown({ label, live }: { label: string; live: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative shrink-0" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className={`flex items-center gap-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap border-b-2 transition-colors ${
        live ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-white'
      }`}>
        {live && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
        {label}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {open && (
        <div className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px] z-50">
          {[
            { label: 'Schedule', href: '/matches' },
            { label: 'AI Predictions', href: '/analysis' },
            { label: 'Odds', href: '/odds' },
            { label: 'Teams', href: '/teams' },
          ].map(item => (
            <Link key={item.href + item.label} href={item.href}
              className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
              {item.label} <ChevronRight className="w-3 h-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
