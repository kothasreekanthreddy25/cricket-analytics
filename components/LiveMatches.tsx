'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, Calendar, MapPin, Radio, Globe } from 'lucide-react'

// Roanuz tournament shape
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

// CricAPI match shape
interface CricMatch {
  id: string
  name: string
  matchType: string
  status: 'live' | 'upcoming' | 'completed'
  statusNote: string
  venue: string
  date: string
  teamA: string
  teamB: string
  scoreA: string | null
  scoreB: string | null
}

type ViewMode = 'tournaments' | 'matches'

export default function LiveMatches() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [matches, setMatches] = useState<CricMatch[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('matches')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMatches()
    const interval = setInterval(fetchMatches, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchMatches() {
    try {
      const response = await fetch('/api/matches')
      const json = await response.json()

      if (!json.success) {
        setError('Failed to fetch matches')
        return
      }

      const source = json.source

      if (source === 'cricapi') {
        // CricAPI match list
        const sorted = (json.matches as CricMatch[]).sort((a, b) => {
          if (a.status === 'live' && b.status !== 'live') return -1
          if (a.status !== 'live' && b.status === 'live') return 1
          return 0
        })
        setMatches(sorted)
        setViewMode('matches')
      } else {
        // Roanuz tournament list (featured-tournaments fallback)
        const tournamentList: Tournament[] =
          json.data?.data?.tournaments || json.data?.tournaments || []
        const now = Date.now() / 1000
        const sorted = tournamentList
          .filter((t) => t.last_scheduled_match_date > now)
          .sort((a, b) => a.start_date - b.start_date)
        setTournaments(sorted)
        setViewMode('tournaments')
      }

      setError(null)
    } catch (err) {
      setError('Error loading matches')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  function getTournamentStatus(t: Tournament) {
    const now = Date.now() / 1000
    if (now >= t.start_date && now <= t.last_scheduled_match_date) return 'live'
    if (t.start_date > now) return 'upcoming'
    return 'completed'
  }

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4" />
            <div className="h-4 bg-gray-200 rounded mb-2" />
            <div className="h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchMatches}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  // ── CricAPI: show individual matches ─────────────────────────────────────
  if (viewMode === 'matches') {
    if (matches.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No matches available at the moment</p>
        </div>
      )
    }

    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.slice(0, 12).map((match) => (
          <Link
            key={match.id}
            href={`/analysis?match=${match.id}`}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-100"
          >
            {/* Status */}
            <div className="flex justify-between items-start mb-4">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                match.status === 'live' ? 'bg-green-100 text-green-700'
                : match.status === 'upcoming' ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
              }`}>
                {match.status === 'live' && <Radio className="w-3 h-3 animate-pulse" />}
                {match.status === 'live' ? 'LIVE' : match.status === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}
              </span>
              <span className="text-xs text-gray-500 font-medium uppercase bg-gray-100 px-2 py-1 rounded">
                {match.matchType}
              </span>
            </div>

            {/* Teams & Scores */}
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">{match.teamA}</span>
                {match.scoreA && <span className="text-sm font-mono text-green-700 font-semibold">{match.scoreA}</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">{match.teamB}</span>
                {match.scoreB && <span className="text-sm font-mono text-blue-700 font-semibold">{match.scoreB}</span>}
              </div>
            </div>

            {/* Live status note */}
            {match.statusNote && match.status === 'live' && (
              <p className="text-xs text-green-700 font-medium mb-3 bg-green-50 px-2 py-1 rounded">
                {match.statusNote}
              </p>
            )}

            {/* Date & Venue */}
            <div className="space-y-1 text-xs text-gray-500">
              {match.date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              {match.venue && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{match.venue}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    )
  }

  // ── Roanuz fallback: show tournaments ────────────────────────────────────
  if (tournaments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">No tournaments available at the moment</p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tournaments.slice(0, 12).map((t) => {
        const status = getTournamentStatus(t)
        return (
          <Link
            key={t.key}
            href={`/match/${t.key}`}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-100"
          >
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                status === 'live' ? 'bg-green-100 text-green-700'
                : status === 'upcoming' ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
              }`}>
                {status === 'live' ? 'LIVE' : status === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}
              </span>
              <span className="text-xs text-gray-500 font-medium uppercase">
                {t.formats?.join(', ')}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">{t.short_name}</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-1">{t.name}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {t.countries?.map((c) => (
                <span key={c.short_code} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  <Globe className="w-3 h-3" />
                  {c.name}
                </span>
              ))}
              {t.gender !== 'male' && (
                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">Women</span>
              )}
            </div>

            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(t.start_date)} – {formatDate(t.last_scheduled_match_date)}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
