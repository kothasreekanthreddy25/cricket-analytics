'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Radio,
  Calendar,
  MapPin,
  ArrowLeft,
  Zap,
  Target,
  BarChart3,
} from 'lucide-react'

/* ── Types ── */
interface MatchEntry {
  key: string
  name: string
  teamA: string
  teamB: string
  status: string
  startDate: string
  venue: string
}

interface TeamOdds {
  teamKey: string
  name: string
  code: string
  decimalOdds: number | null
  fractionalOdds: string | null
  winProbability: number | null
}

interface OddsData {
  matchKey: string
  type: string
  status: string
  format: string
  startAt: string | null
  teams: TeamOdds[]
}

export default function OddsPage() {
  const [matches, setMatches] = useState<MatchEntry[]>([])
  const [selectedMatch, setSelectedMatch] = useState<string>('')
  const [oddsType, setOddsType] = useState<'pre' | 'live'>('pre')
  const [odds, setOdds] = useState<OddsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [oddsLoading, setOddsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Fetch match list
  useEffect(() => {
    fetch('/api/cricket/odds')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMatches(d.matches || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Fetch odds
  const fetchOdds = useCallback(
    async (matchKey: string, type: 'pre' | 'live') => {
      setOddsLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/cricket/odds?match=${matchKey}&type=${type}&t=${Date.now()}`
        )
        const json = await res.json()
        if (json.success && json.odds) {
          setOdds(json.odds)
        } else {
          setError(json.error || 'No odds data available')
          setOdds(null)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load odds')
        setOdds(null)
      } finally {
        setOddsLoading(false)
      }
    },
    []
  )

  // Auto-refresh for live odds
  useEffect(() => {
    if (!autoRefresh || oddsType !== 'live' || !selectedMatch) return
    const interval = setInterval(() => {
      fetchOdds(selectedMatch, 'live')
    }, 10_000) // every 10 seconds
    return () => clearInterval(interval)
  }, [autoRefresh, oddsType, selectedMatch, fetchOdds])

  function handleMatchSelect(key: string) {
    setSelectedMatch(key)
    setOdds(null)
    setError(null)
    fetchOdds(key, oddsType)
  }

  function handleTypeChange(type: 'pre' | 'live') {
    setOddsType(type)
    setAutoRefresh(type === 'live')
    if (selectedMatch) {
      fetchOdds(selectedMatch, type)
    }
  }

  const selectedMatchData = matches.find((m) => m.key === selectedMatch)
  const liveMatches = matches.filter((m) => m.status === 'live')
  const upcomingMatches = matches.filter((m) => m.status !== 'live')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors mb-4 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Home
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Match Odds
              </h1>
              <p className="text-gray-400 text-sm">
                AI-powered pre-match &amp; live odds with winning probability
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left Panel: Match Selection ── */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sticky top-20">
              {/* Odds Type Toggle */}
              <div className="flex rounded-lg border border-gray-700 mb-4 overflow-hidden">
                <button
                  onClick={() => handleTypeChange('pre')}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    oddsType === 'pre'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  Pre-Match
                </button>
                <button
                  onClick={() => handleTypeChange('live')}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    oddsType === 'live'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  Live
                </button>
              </div>

              <h2 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
                Select Match
              </h2>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-hide">
                {loading ? (
                  <div className="text-center py-10">
                    <RefreshCw className="w-5 h-5 text-gray-500 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Loading matches...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">
                    No upcoming matches found
                  </p>
                ) : (
                  <>
                    {/* Live matches first */}
                    {liveMatches.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Radio className="w-3 h-3 animate-pulse" /> Live Now
                        </p>
                        {liveMatches.map((m) => (
                          <MatchItem
                            key={m.key}
                            match={m}
                            selected={selectedMatch === m.key}
                            onClick={() => handleMatchSelect(m.key)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Upcoming */}
                    {upcomingMatches.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                          Upcoming
                        </p>
                        {upcomingMatches.map((m) => (
                          <MatchItem
                            key={m.key}
                            match={m}
                            selected={selectedMatch === m.key}
                            onClick={() => handleMatchSelect(m.key)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Panel: Odds Display ── */}
          <div className="lg:col-span-2">
            {!selectedMatch ? (
              /* Empty state */
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Select a Match
                </h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                  Choose a match from the left panel to view AI-powered{' '}
                  {oddsType === 'pre' ? 'pre-match' : 'live'} odds and
                  winning probabilities
                </p>
              </div>
            ) : oddsLoading && !odds ? (
              /* Loading */
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-16 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading odds data...</p>
              </div>
            ) : error ? (
              /* Error */
              <div className="bg-gray-900 rounded-xl border border-amber-500/30 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-amber-300">
                      Odds Not Available
                    </h3>
                    <p className="text-amber-200/70 text-sm mt-1">{error}</p>
                    <p className="text-gray-500 text-xs mt-2">
                      {oddsType === 'live'
                        ? 'Live odds are only available during an ongoing match.'
                        : 'Pre-match odds update daily, and every 3 hours on match day.'}
                    </p>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => fetchOdds(selectedMatch, oddsType)}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Retry
                      </button>
                      {oddsType === 'live' && (
                        <button
                          onClick={() => handleTypeChange('pre')}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Try Pre-Match Odds
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : odds ? (
              /* Odds Display */
              <div className="space-y-4">
                {/* Match Header */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {oddsType === 'live' ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                          <Radio className="w-3 h-3 animate-pulse" />
                          LIVE ODDS
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <Target className="w-3 h-3" />
                          PRE-MATCH ODDS
                        </span>
                      )}
                      <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase">
                        {odds.format || 'T20'}
                      </span>
                    </div>
                    <button
                      onClick={() => fetchOdds(selectedMatch, oddsType)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${oddsLoading ? 'animate-spin' : ''}`}
                      />
                      Refresh
                    </button>
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedMatchData?.name || 'Match Odds'}
                  </h2>
                  <div className="flex items-center gap-4 mt-1">
                    {selectedMatchData?.startDate && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {selectedMatchData.startDate}
                      </span>
                    )}
                    {selectedMatchData?.venue && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {selectedMatchData.venue}
                      </span>
                    )}
                  </div>
                  {oddsType === 'live' && autoRefresh && (
                    <p className="text-[10px] text-green-400 mt-2 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Auto-refreshing every 10s
                    </p>
                  )}
                </div>

                {/* Win Probability Section */}
                {odds.teams.some((t) => t.winProbability !== null) && (
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      Win Probability
                    </h3>
                    <WinProbabilityDisplay teams={odds.teams} />
                  </div>
                )}

                {/* Team Odds Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {odds.teams.map((team, idx) => (
                    <TeamOddsCard
                      key={team.teamKey}
                      team={team}
                      isFirst={idx === 0}
                    />
                  ))}
                </div>

                {/* Info Footer */}
                <div className="bg-gray-900/50 rounded-xl border border-gray-800/50 p-4">
                  <p className="text-[10px] text-gray-600 text-center">
                    {oddsType === 'live'
                      ? 'Live odds refresh every 5 seconds on the Roanuz API. Powered by AI match analysis.'
                      : 'Pre-match odds update once daily, and every 3 hours on match day. Powered by AI analysis.'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Match List Item ── */
function MatchItem({
  match,
  selected,
  onClick,
}: {
  match: MatchEntry
  selected: boolean
  onClick: () => void
}) {
  const isLive = match.status === 'live'
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all mb-1.5 ${
        selected
          ? 'border-emerald-500/50 bg-emerald-500/10'
          : 'border-gray-800 hover:border-gray-700 hover:bg-gray-800/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {isLive && (
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
        )}
        <span className="text-sm font-semibold text-white truncate">
          {match.teamA}
          <span className="text-gray-500 mx-1.5 font-normal">vs</span>
          {match.teamB}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-2.5 h-2.5" />
          {match.startDate}
        </span>
        {match.venue && (
          <span className="truncate">{match.venue.split(',')[0]}</span>
        )}
      </div>
    </button>
  )
}

/* ── Win Probability Bar ── */
function WinProbabilityDisplay({ teams }: { teams: TeamOdds[] }) {
  const teamA = teams[0]
  const teamB = teams[1]
  if (!teamA || !teamB) return null

  const probA = teamA.winProbability ?? 50
  const probB = teamB.winProbability ?? 50

  return (
    <div>
      {/* Team names with probabilities */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-white font-bold text-lg">{teamA.name}</span>
          <span className="ml-2 text-2xl font-extrabold text-emerald-400">
            {probA}%
          </span>
        </div>
        <div className="text-right">
          <span className="mr-2 text-2xl font-extrabold text-cyan-400">
            {probB}%
          </span>
          <span className="text-white font-bold text-lg">{teamB.name}</span>
        </div>
      </div>

      {/* Probability bar */}
      <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
          style={{ width: `${probA}%` }}
        />
        <div className="w-0.5 h-full bg-gray-900" />
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-700"
          style={{ width: `${probB}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-500">{teamA.code}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          AI Prediction
        </span>
        <span className="text-[10px] text-gray-500">{teamB.code}</span>
      </div>
    </div>
  )
}

/* ── Team Odds Card ── */
function TeamOddsCard({
  team,
  isFirst,
}: {
  team: TeamOdds
  isFirst: boolean
}) {
  const accentColor = isFirst ? 'emerald' : 'cyan'
  const bgAccent = isFirst ? 'bg-emerald-500/10' : 'bg-cyan-500/10'
  const textAccent = isFirst ? 'text-emerald-400' : 'text-cyan-400'
  const borderAccent = isFirst
    ? 'border-emerald-500/20'
    : 'border-cyan-500/20'

  return (
    <div
      className={`bg-gray-900 rounded-xl border ${borderAccent} p-5 hover:border-${accentColor}-500/40 transition-colors`}
    >
      {/* Team header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className={`w-10 h-10 rounded-xl ${bgAccent} flex items-center justify-center`}
        >
          <span className={`text-sm font-extrabold ${textAccent}`}>
            {team.code}
          </span>
        </div>
        <div>
          <h3 className="text-base font-bold text-white">{team.name}</h3>
          {team.winProbability !== null && (
            <p className={`text-xs ${textAccent} font-semibold`}>
              {team.winProbability}% win chance
            </p>
          )}
        </div>
      </div>

      {/* Odds grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Decimal Odds */}
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            Decimal
          </p>
          <p className={`text-2xl font-extrabold ${textAccent}`}>
            {team.decimalOdds?.toFixed(2) ?? '—'}
          </p>
        </div>

        {/* Fractional Odds */}
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            Fractional
          </p>
          <p className={`text-2xl font-extrabold ${textAccent}`}>
            {team.fractionalOdds ?? '—'}
          </p>
        </div>
      </div>

      {/* Implied probability */}
      {team.decimalOdds && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Implied Probability</span>
            <span className="text-xs font-semibold text-gray-300">
              {((1 / team.decimalOdds) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isFirst
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                  : 'bg-gradient-to-r from-cyan-400 to-cyan-600'
              }`}
              style={{
                width: `${((1 / team.decimalOdds) * 100).toFixed(1)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
