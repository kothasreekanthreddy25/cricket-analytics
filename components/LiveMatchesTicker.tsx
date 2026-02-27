'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Radio, ChevronRight } from 'lucide-react'

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

export default function LiveMatchesTicker() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/matches')
        const json = await res.json()
        const tournamentList = json.data?.data?.tournaments || json.data?.tournaments || []
        if (json.success && tournamentList.length > 0) {
          // Filter to show current/upcoming tournaments
          const now = Date.now() / 1000
          const relevant = tournamentList
            .filter((t: Tournament) => t.last_scheduled_match_date > now)
            .sort((a: Tournament, b: Tournament) => a.start_date - b.start_date)
            .slice(0, 10)
          setTournaments(relevant)
        }
      } catch (err) {
        console.error('Failed to fetch live data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-900 text-white py-2">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 text-sm">
            <Radio className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-gray-400">Loading live matches...</span>
          </div>
        </div>
      </div>
    )
  }

  if (tournaments.length === 0) return null

  const now = Date.now() / 1000

  function getStatus(t: Tournament) {
    if (now >= t.start_date && now <= t.last_scheduled_match_date) return 'live'
    if (t.start_date > now) return 'upcoming'
    return 'completed'
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-gray-900 text-white overflow-hidden">
      <div className="flex items-center">
        {/* Live Label */}
        <div className="bg-red-600 px-4 py-2 flex items-center gap-2 shrink-0 z-10">
          <Radio className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-bold uppercase tracking-wider">Live & Upcoming</span>
        </div>

        {/* Scrolling Ticker */}
        <div className="overflow-x-auto flex items-center gap-1 py-2 px-2 scrollbar-hide">
          {tournaments.map((t) => {
            const status = getStatus(t)
            return (
              <Link
                key={t.key}
                href={`/match/${t.key}`}
                className="shrink-0 flex items-center gap-2 px-3 py-1 rounded-full text-sm hover:bg-gray-800 transition-colors group"
              >
                {status === 'live' && (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
                {status === 'upcoming' && (
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                )}
                <span className="text-gray-300 group-hover:text-white">
                  {t.short_name}
                </span>
                <span className="text-gray-500 text-xs">
                  {t.formats[0]?.toUpperCase()}
                </span>
                <span className="text-gray-500 text-xs">
                  {formatDate(t.start_date)}
                </span>
                <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-white" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
