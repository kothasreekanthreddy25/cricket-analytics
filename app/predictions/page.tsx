'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Brain, CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown,
  ArrowLeft, RefreshCw, BarChart3, MapPin, Calendar, Radio,
  ChevronDown, Filter, Trophy, AlertCircle,
} from 'lucide-react'

interface Match {
  matchKey: string
  teamA: string
  teamB: string
  tournament: string
  format: string
  venue: string | null
  status: 'live' | 'upcoming' | 'completed'
  startAt: string | null
  hasPrediction: boolean
  probA: number | null
  probB: number | null
  predictedWinner: string | null
  winPct: number | null
  confidence: string | null
  tip: string | null
  aiOdds: number | null
  venueNote: string | null
  predictionAge: string | null
}

const CONF_COLORS: Record<string, string> = {
  VERY_HIGH: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  HIGH:      'bg-blue-500/10 text-blue-400 border-blue-500/30',
  MEDIUM:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  LOW:       'bg-gray-700 text-gray-400 border-gray-600',
}

const STATUS_META = {
  live:      { label: 'Live',     cls: 'bg-red-500/15 text-red-400 border-red-500/30',   dot: 'bg-red-500 animate-pulse' },
  upcoming:  { label: 'Upcoming', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
  completed: { label: 'Done',     cls: 'bg-gray-700 text-gray-400 border-gray-600',       dot: 'bg-gray-500' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// Group matches by tournament
function groupByTournament(matches: Match[]) {
  const map = new Map<string, Match[]>()
  for (const m of matches) {
    const t = m.tournament || 'Other'
    if (!map.has(t)) map.set(t, [])
    map.get(t)!.push(m)
  }
  return map
}

export default function PredictionsPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'live' | 'upcoming' | 'completed'>('ALL')
  const [confFilter, setConfFilter] = useState('all')
  const [predFilter, setPredFilter] = useState<'all' | 'predicted' | 'pending'>('all')

  const fetchMatches = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/predictions/all-matches')
      const data = await res.json()
      if (data.success) setMatches(data.matches || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchMatches() }, [])

  const filtered = useMemo(() => matches.filter(m => {
    if (filter !== 'ALL' && m.status !== filter) return false
    if (confFilter !== 'all' && m.confidence !== confFilter) return false
    if (predFilter === 'predicted' && !m.hasPrediction) return false
    if (predFilter === 'pending' && m.hasPrediction) return false
    return true
  }), [matches, filter, confFilter, predFilter])

  const grouped = useMemo(() => groupByTournament(filtered), [filtered])

  const live = matches.filter(m => m.status === 'live').length
  const upcoming = matches.filter(m => m.status === 'upcoming').length
  const predicted = matches.filter(m => m.hasPrediction).length
  const tournaments = new Set(matches.map(m => m.tournament)).size

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading matches from all tournaments...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 pb-16">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AI Match Predictions</h1>
              <p className="text-gray-500 text-xs">{matches.length} matches · {tournaments} tournaments</p>
            </div>
          </div>
          <button onClick={fetchMatches}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 transition-colors border border-gray-800 px-3 py-1.5 rounded-lg">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Tournaments', value: tournaments, icon: Trophy, color: 'text-purple-400' },
            { label: 'Live Now', value: live, icon: Radio, color: 'text-red-400' },
            { label: 'Upcoming', value: upcoming, icon: Clock, color: 'text-blue-400' },
            { label: 'AI Predicted', value: predicted, icon: Brain, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                <span className="text-[10px] text-gray-500">{s.label}</span>
              </div>
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          {([
            { key: 'ALL', label: `All (${matches.length})` },
            { key: 'live', label: `Live (${live})` },
            { key: 'upcoming', label: `Upcoming (${upcoming})` },
            { key: 'completed', label: 'Completed' },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === f.key ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {f.label}
            </button>
          ))}

          <div className="ml-auto flex gap-2">
            <select value={predFilter} onChange={e => setPredFilter(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 outline-none">
              <option value="all">All predictions</option>
              <option value="predicted">Has prediction</option>
              <option value="pending">No prediction yet</option>
            </select>
            <select value={confFilter} onChange={e => setConfFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 outline-none">
              <option value="all">All confidence</option>
              <option value="VERY_HIGH">Very High</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl py-16 text-center">
            <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No matches match this filter</p>
          </div>
        ) : (
          /* Tournament groups */
          Array.from(grouped.entries()).map(([tournament, tMatches]) => (
            <div key={tournament} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              {/* Tournament header */}
              <div className="px-5 py-3 border-b border-gray-800 bg-gray-800/40 flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="text-sm font-bold text-white">{tournament}</h2>
                <span className="text-xs text-gray-500 ml-1">{tMatches.length} match{tMatches.length !== 1 ? 'es' : ''}</span>
              </div>

              <div className="divide-y divide-gray-800/50">
                {tMatches.map(m => {
                  const sm = STATUS_META[m.status]
                  const confCls = m.confidence ? (CONF_COLORS[m.confidence] || CONF_COLORS.LOW) : ''
                  return (
                    <div key={m.matchKey} className="px-5 py-4 hover:bg-gray-800/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Teams + status */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-semibold text-sm">
                              {m.teamA} <span className="text-gray-500 font-normal">vs</span> {m.teamB}
                            </p>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sm.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                              {sm.label}
                            </span>
                            {m.format && (
                              <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{m.format}</span>
                            )}
                          </div>

                          {/* Date + venue */}
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            {m.startAt && (
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" /> {formatDate(m.startAt)}
                              </span>
                            )}
                            {m.venue && (
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" /> {m.venue}
                              </span>
                            )}
                          </div>

                          {/* Prediction section */}
                          {m.hasPrediction ? (
                            <div className="mt-2.5 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${confCls}`}>
                                  {m.confidence?.replace('_', ' ')} CONF
                                </span>
                                <span className="text-[11px] text-gray-300 flex items-center gap-1">
                                  <Brain className="w-3 h-3 text-emerald-400" />
                                  Pick: <span className="text-white font-bold ml-0.5">{m.predictedWinner}</span>
                                  <span className="text-emerald-400 ml-0.5">{m.winPct}%</span>
                                </span>
                                {m.aiOdds && (
                                  <span className="text-[11px] text-amber-400 font-bold">@ {m.aiOdds}</span>
                                )}
                              </div>

                              {/* Prob bar */}
                              {m.probA !== null && m.probB !== null && (
                                <>
                                  <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5 max-w-xs">
                                    <div className="bg-emerald-500 rounded-l-full" style={{ width: `${m.probA}%` }} />
                                    <div className="bg-gray-600 rounded-r-full" style={{ width: `${m.probB}%` }} />
                                  </div>
                                  <div className="flex justify-between text-[10px] text-gray-500 max-w-xs">
                                    <span>{m.teamA.split(' ').slice(-1)} {m.probA}%</span>
                                    <span>{m.teamB.split(' ').slice(-1)} {m.probB}%</span>
                                  </div>
                                </>
                              )}

                              {m.tip && (
                                <p className="text-[11px] text-gray-400 italic line-clamp-1">"{m.tip}"</p>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-2">
                              <RefreshCw className="w-3 h-3 text-gray-600 animate-spin" />
                              <span className="text-[11px] text-gray-500">Generating prediction...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Info note */}
        <p className="text-center text-[11px] text-gray-600 pb-4">
          Predictions are generated automatically · Matches sourced from Roanuz API · 18+ gamble responsibly
        </p>
      </div>
    </div>
  )
}
