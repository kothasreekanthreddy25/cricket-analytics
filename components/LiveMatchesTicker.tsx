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

interface TickerMatch {
  key: string
  id: string
  name: string
  teamA: string
  teamB: string
  matchType: string
  status: 'live' | 'upcoming' | 'completed'
  statusNote: string
  scoreA: string | null
  scoreB: string | null
  date: string
  dateTimeGMT: string
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
  const [liveMatches, setLiveMatches] = useState<TickerMatch[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<TickerMatch[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('series') || 'all'

  // Fetch Roanuz tournament list (for Row 1 dropdowns)
  useEffect(() => {
    async function fetchTournaments() {
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
    }
    fetchTournaments()
    const interval = setInterval(fetchTournaments, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Fetch actual live/upcoming match data from CricAPI (for Row 2 cards)
  useEffect(() => {
    async function fetchCurrentMatches() {
      try {
        const res = await fetch('/api/cricket/featured-matches')
        const json = await res.json()
        // CricAPI fallback returns { source: 'cricapi', matches: [...] }
        const matches: TickerMatch[] = json.matches || []
        setLiveMatches(matches.filter((m) => m.status === 'live'))
        setUpcomingMatches(
          matches.filter((m) => m.status === 'upcoming').slice(0, 8)
        )
      } catch {}
      finally {
        setLoading(false)
      }
    }
    fetchCurrentMatches()
    // Refresh every 5 minutes — keeps CricAPI quota usage low
    const interval = setInterval(fetchCurrentMatches, 300_000)
    return () => clearInterval(interval)
  }, [])

  const now = Date.now() / 1000
  const activeTournaments = tournaments.filter(
    (t) => now >= t.start_date && now <= t.last_scheduled_match_date
  )
  const upcomingTournaments = tournaments.filter((t) => t.start_date > now)

  // Row 2: live matches first, then upcoming
  const tickerCards = [...liveMatches, ...upcomingMatches].slice(0, 10)

  // Fallback to tournament cards when CricAPI has no data
  const useTournamentFallback = tickerCards.length === 0 && tournaments.length > 0

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

          {/* Active tournament dropdowns — green if we have actual live matches */}
          {!loading && activeTournaments.slice(0, 4).map((t) => (
            <TournamentDropdown
              key={t.key}
              label={t.short_name || t.name}
              live={liveMatches.length > 0}
            />
          ))}
          {!loading && upcomingTournaments.slice(0, 2).map((t) => (
            <TournamentDropdown key={t.key} label={t.short_name || t.name} live={false} />
          ))}

          {/* Static nav */}
          {NAV_LINKS.map((link) => (
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

      {/* ── Row 2: Match Cards (CricAPI real data) ── */}
      {!loading && tickerCards.length > 0 && (
        <div className="max-w-[1600px] mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide px-2 py-1.5">
          <button
            onClick={() => handleTabClick('all')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0 transition-all border ${
              activeTab === 'all'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            ALL ({tickerCards.length})
          </button>

          {tickerCards.map((match) => (
            <MatchCard key={match.key || match.id} match={match} />
          ))}
        </div>
      )}

      {/* ── Row 2 Fallback: Roanuz tournament cards when CricAPI has no data ── */}
      {!loading && useTournamentFallback && (
        <div className="max-w-[1600px] mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide px-2 py-1.5">
          <button
            onClick={() => handleTabClick('all')}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0 border border-gray-700 text-gray-400"
          >
            ALL ({tournaments.length})
          </button>

          {tournaments.slice(0, 10).map((t) => {
            const isLiveT = now >= t.start_date && now <= t.last_scheduled_match_date
            const startDate = new Date(t.start_date * 1000)
            const dateStr = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            const timeStr = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            const teams = t.countries?.slice(0, 2).map((c) => c.short_code || c.name) || []

            return (
              <Link
                key={t.key}
                href={isLiveT ? '/matches' : '/predictions'}
                className={`flex flex-col shrink-0 rounded-lg border px-2.5 py-1.5 min-w-[140px] max-w-[160px] transition-all cursor-pointer ${
                  isLiveT
                    ? 'border-green-600/60 bg-green-900/15 hover:border-green-500'
                    : 'border-gray-700/50 bg-gray-800/40 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  {isLiveT ? (
                    <span className="flex items-center gap-1 text-green-400 text-[9px] font-bold uppercase">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      SERIES
                    </span>
                  ) : (
                    <span className="text-gray-500 text-[9px]">{dateStr} · {timeStr}</span>
                  )}
                  <span className="text-[9px] text-gray-600 bg-gray-700/40 px-1 rounded">
                    {t.formats?.[0]?.toUpperCase() || 'T20'}
                  </span>
                </div>
                <div className="text-white text-[11px] font-bold leading-tight truncate">
                  {teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : t.short_name || t.name}
                </div>
                <div className={`text-[9px] font-medium mt-1 ${isLiveT ? 'text-green-400' : 'text-emerald-400'}`}>
                  {isLiveT ? 'View Matches →' : 'AI Prediction →'}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Individual Match Card ─────────────────────────────────────────────────────

function MatchCard({ match }: { match: TickerMatch }) {
  const isLive = match.status === 'live'

  const teamA = match.teamA || 'TBD'
  const teamB = match.teamB || 'TBD'
  // Shorten team names for the small card
  const teamAShort = teamA.length > 12 ? teamA.slice(0, 10).trimEnd() + '…' : teamA
  const teamBShort = teamB.length > 12 ? teamB.slice(0, 10).trimEnd() + '…' : teamB

  // Date/time for upcoming matches
  const matchDate = match.dateTimeGMT
    ? new Date(match.dateTimeGMT)
    : match.date
    ? new Date(match.date)
    : null
  const dateStr = matchDate?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) || ''
  const timeStr = matchDate?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) || ''

  const href = isLive ? `/live/${match.key || match.id}` : '/predictions'

  return (
    <Link
      href={href}
      className={`flex flex-col shrink-0 rounded-lg border px-2.5 py-1.5 min-w-[155px] max-w-[180px] transition-all cursor-pointer ${
        isLive
          ? 'border-green-600/60 bg-green-900/15 hover:border-green-500 hover:bg-green-900/25'
          : 'border-gray-700/50 bg-gray-800/40 hover:border-emerald-500/40 hover:bg-gray-800/70'
      }`}
    >
      {/* Status row */}
      <div className="flex items-center justify-between mb-1">
        {isLive ? (
          <span className="flex items-center gap-1 text-green-400 text-[9px] font-bold uppercase">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            LIVE
          </span>
        ) : (
          <span className="text-gray-500 text-[9px]">
            {dateStr}{timeStr ? ` · ${timeStr}` : ''}
          </span>
        )}
        <span className="text-[9px] text-gray-600 bg-gray-700/40 px-1 rounded">
          {match.matchType || 'T20'}
        </span>
      </div>

      {/* Live: show actual scores per team */}
      {isLive ? (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-white text-[10px] font-bold truncate flex-1 min-w-0">{teamAShort}</span>
            <span className="text-emerald-400 font-mono text-[10px] font-bold whitespace-nowrap shrink-0">
              {match.scoreA || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-gray-300 text-[10px] font-semibold truncate flex-1 min-w-0">{teamBShort}</span>
            <span className="text-gray-400 font-mono text-[10px] whitespace-nowrap shrink-0">
              {match.scoreB || 'yet to bat'}
            </span>
          </div>
        </div>
      ) : (
        /* Upcoming: show team names + AI Tips badge */
        <div>
          <div className="text-white text-[11px] font-bold leading-tight truncate">
            {teamAShort} vs {teamBShort}
          </div>
          <span className="inline-block text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1">
            AI Tips
          </span>
        </div>
      )}

      {/* Footer CTA */}
      <div className={`text-[9px] font-semibold mt-1 ${isLive ? 'text-green-400' : 'text-emerald-400'}`}>
        {isLive ? 'Ball by ball →' : 'View prediction →'}
      </div>
    </Link>
  )
}

// ── Tournament Dropdown ───────────────────────────────────────────────────────

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
          ].map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            >
              {item.label} <ChevronRight className="w-3 h-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
