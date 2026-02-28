'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLiveScores } from '@/lib/use-live-scores'
import Link from 'next/link'
import { Radio, Wifi, WifiOff, RefreshCw, TrendingUp } from 'lucide-react'

// Win probability data per match
interface WinProbability {
  teamA: { name: string; code: string; pct: number }
  teamB: { name: string; code: string; pct: number }
  source: string
}

// Ticking "X seconds ago" display — re-renders every second
function SecondsAgo({ timestamp }: { timestamp: number }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const seconds = Math.floor((now - timestamp) / 1000)
  if (seconds < 2) return <span className="text-emerald-400">just now</span>
  if (seconds < 60) return <span>{seconds}s ago</span>
  return <span>{Math.floor(seconds / 60)}m ago</span>
}

// Animated win probability bar
function WinProbabilityBar({
  probability,
}: {
  probability: WinProbability
}) {
  const { teamA, teamB, source } = probability
  const pctA = Math.max(1, Math.min(99, teamA.pct))
  const pctB = Math.max(1, Math.min(99, teamB.pct))

  return (
    <div className="mt-4 pt-3 border-t border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-yellow-400" />
          Win Probability
        </span>
        <span className="text-[9px] text-gray-600">
          {source === 'live' ? '🔴 Live' : 'Pre-match'}
        </span>
      </div>

      {/* Team labels with percentages */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-emerald-400">
          {teamA.code || teamA.name.slice(0, 3).toUpperCase()}{' '}
          <span className="text-emerald-300 font-mono">{pctA}%</span>
        </span>
        <span className="text-xs font-bold text-cyan-400">
          <span className="text-cyan-300 font-mono">{pctB}%</span>{' '}
          {teamB.code || teamB.name.slice(0, 3).toUpperCase()}
        </span>
      </div>

      {/* Probability bar */}
      <div className="relative w-full h-3 rounded-full overflow-hidden bg-gray-700/50 flex">
        {/* Team A bar */}
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out rounded-l-full"
          style={{ width: `${pctA}%` }}
        />
        {/* Divider */}
        <div className="w-[2px] h-full bg-gray-900/80 flex-shrink-0" />
        {/* Team B bar */}
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-1000 ease-out rounded-r-full flex-1"
        />
      </div>

      {/* Favourite indicator */}
      {Math.abs(pctA - pctB) >= 10 && (
        <p className="text-[10px] text-gray-500 mt-1.5 text-center">
          {pctA > pctB ? teamA.name : teamB.name}{' '}
          <span className="text-yellow-500/80">favoured</span> to win
        </p>
      )}
    </div>
  )
}

export default function LiveScoreCard() {
  const { scores, connected, pollingStatus } = useLiveScores()
  const [probabilities, setProbabilities] = useState<
    Record<string, WinProbability | null>
  >({})
  const [probLoading, setProbLoading] = useState<Record<string, boolean>>({})

  const liveMatches = Array.from(scores.values())

  // Fetch win probability for a specific match
  const fetchProbability = useCallback(async (matchKey: string) => {
    setProbLoading((prev) => ({ ...prev, [matchKey]: true }))
    try {
      const res = await fetch(
        `/api/cricket/live-probability?match=${matchKey}&t=${Date.now()}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (data.success && data.probability) {
        setProbabilities((prev) => ({
          ...prev,
          [matchKey]: {
            teamA: data.probability.teamA,
            teamB: data.probability.teamB,
            source: data.source,
          },
        }))
      } else {
        setProbabilities((prev) => ({ ...prev, [matchKey]: null }))
      }
    } catch {
      setProbabilities((prev) => ({ ...prev, [matchKey]: null }))
    } finally {
      setProbLoading((prev) => ({ ...prev, [matchKey]: false }))
    }
  }, [])

  // Fetch probabilities for all live matches on mount + every 30s
  useEffect(() => {
    if (liveMatches.length === 0) return

    const matchKeys = liveMatches.map((m) => m.matchKey)

    // Initial fetch
    for (const key of matchKeys) {
      fetchProbability(key)
    }

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      for (const key of matchKeys) {
        fetchProbability(key)
      }
    }, 30_000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMatches.length, liveMatches.map((m) => m.matchKey).join(',')])

  // No live matches — show upcoming matches as fallback
  if (liveMatches.length === 0) {
    return <UpcomingMatchesFallback connected={connected} />
  }

  return (
    <div className="space-y-4">
      {liveMatches.map((match) => {
        const prob = probabilities[match.matchKey]
        const loading = probLoading[match.matchKey]

        return (
          <Link
            key={match.matchKey}
            href="/analysis"
            className="block bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-emerald-500/30 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300 shadow-lg shadow-emerald-500/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Live Score
              </span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] text-emerald-400/70">
                  <Wifi className="w-3 h-3" />
                  Real-time
                </span>
                <span className="text-[10px] text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
                  T20 WC 2026
                </span>
              </div>
            </div>

            {/* Scoreboard */}
            <div className="space-y-4">
              {/* Team A */}
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-lg">{match.teamA}</span>
                <span className="text-emerald-400 font-mono font-bold text-xl">
                  {match.scoreA || '—'}
                </span>
              </div>

              {/* Team B */}
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-lg">{match.teamB}</span>
                <span className="text-cyan-400 font-mono font-bold text-xl">
                  {match.scoreB || '—'}
                </span>
              </div>
            </div>

            {/* Win Probability Bar */}
            {prob && <WinProbabilityBar probability={prob} />}
            {loading && !prob && (
              <div className="mt-4 pt-3 border-t border-gray-700/50">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3 h-3 text-gray-600 animate-spin" />
                  <span className="text-[10px] text-gray-600">Loading win probability...</span>
                </div>
              </div>
            )}

            {/* Status Note */}
            {match.statusNote && (
              <div className="mt-4 pt-3 border-t border-gray-700/50">
                <p className="text-emerald-400 text-sm font-medium">
                  {match.statusNote}
                </p>
              </div>
            )}

            {/* Live ticker — ticks every second */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '5s' }} />
                Updated <SecondsAgo timestamp={match.lastUpdated} />
              </span>
              <span className="text-emerald-400 text-xs font-medium">
                View Full Analysis &rarr;
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ── Fallback: show upcoming tournaments from Roanuz when no live data ──
function UpcomingMatchesFallback({ connected }: { connected: boolean }) {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/matches')
      .then((r) => r.json())
      .then((d) => {
        const list = d.tournaments || d.matches || []
        setMatches(list.slice(0, 6))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs text-gray-400">
          {connected ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Connected</span>
              <span className="text-gray-600">— monitoring for live matches</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-gray-500" />
              <span className="text-gray-500">Connecting to live scores...</span>
            </>
          )}
        </span>
        <span className="text-[10px] text-gray-600 bg-gray-700/50 px-2 py-0.5 rounded">
          No live matches right now
        </span>
      </div>

      {/* Upcoming tournaments */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-3 animate-pulse h-20" />
          ))}
        </div>
      ) : matches.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {matches.map((m: any, i: number) => (
            <div
              key={i}
              className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-white text-xs font-semibold leading-snug line-clamp-2">
                {m.name || m.title || m.tournament_name || 'Upcoming Match'}
              </p>
              {(m.startDate || m.start_date || m.dateTimeGMT) && (
                <p className="text-gray-500 text-[10px] mt-1">
                  {new Date(m.startDate || m.start_date || m.dateTimeGMT).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </p>
              )}
              {(m.format || m.matchType) && (
                <span className="inline-block text-emerald-400 text-[10px] font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1">
                  {m.format || m.matchType}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm text-center py-4">
          Live scores will appear here automatically when a match starts.
        </p>
      )}
    </div>
  )
}
