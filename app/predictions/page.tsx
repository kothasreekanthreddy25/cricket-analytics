'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Brain, CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown,
  ArrowLeft, RefreshCw, BarChart3, MapPin, Calendar, IndianRupee,
  ChevronDown, Filter,
} from 'lucide-react'

interface Prediction {
  id: string
  matchKey: string
  teamA: string
  teamB: string
  winProbabilityA: number
  winProbabilityB: number
  predictedWinner: string
  winPct: number
  confidence: string
  tip: string | null
  venue: string | null
  result: 'WON' | 'LOST' | 'PENDING'
  createdAt: string
}

const CONF_COLORS: Record<string, string> = {
  VERY_HIGH: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  HIGH:      'bg-blue-500/10 text-blue-400 border-blue-500/30',
  MEDIUM:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  LOW:       'bg-gray-700 text-gray-400 border-gray-600',
}

const RESULT_META = {
  WON:     { label: 'Won',     icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  LOST:    { label: 'Lost',    icon: XCircle,      cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
  PENDING: { label: 'Pending', icon: Clock,         cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function formatCurrency(n: number) {
  const a = Math.abs(n)
  if (a >= 100000) return `₹${(n / 100000).toFixed(2)}L`
  if (a >= 1000)   return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toLocaleString('en-IN')}`
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'WON' | 'LOST' | 'PENDING'>('ALL')
  const [confFilter, setConfFilter] = useState('all')

  const fetchPredictions = async (reset = false) => {
    const currentOffset = reset ? 0 : offset
    if (!reset) setLoadingMore(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/predictions/history?limit=50&offset=${currentOffset}`)
      const data = await res.json()
      if (data.success) {
        setPredictions(prev => reset ? data.predictions : [...prev, ...data.predictions])
        setTotal(data.total)
        setHasMore(data.hasMore)
        setOffset(currentOffset + 50)
      }
    } catch {}
    finally { setLoading(false); setLoadingMore(false) }
  }

  useEffect(() => { fetchPredictions(true) }, [])

  const filtered = useMemo(() => predictions.filter(p => {
    if (filter !== 'ALL' && p.result !== filter) return false
    if (confFilter !== 'all' && p.confidence !== confFilter) return false
    return true
  }), [predictions, filter, confFilter])

  // Stats
  const won     = predictions.filter(p => p.result === 'WON').length
  const lost    = predictions.filter(p => p.result === 'LOST').length
  const pending = predictions.filter(p => p.result === 'PENDING').length
  const settled = won + lost
  const accuracy = settled > 0 ? Math.round((won / settled) * 100) : null

  // Simple ₹10,000 simulation — ₹500 per bet, 1.85 average odds
  const stakePerBet = 500
  const avgOdds = 1.85
  const totalInvested = settled * stakePerBet
  const totalReturned = won * stakePerBet * avgOdds
  const netPnL = Math.round(totalReturned - totalInvested)
  const roi = totalInvested > 0 ? Math.round((netPnL / totalInvested) * 100) : 0
  const isProfit = netPnL >= 0

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading predictions...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 pb-16">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-6 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Prediction History</h1>
              <p className="text-gray-500 text-xs">{total} total predictions · last 50 shown</p>
            </div>
          </div>
          <button onClick={() => fetchPredictions(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 transition-colors border border-gray-800 px-3 py-1.5 rounded-lg">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 space-y-6">

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Accuracy', value: accuracy !== null ? `${accuracy}%` : '—', sub: `${settled} settled`, color: 'text-emerald-400', icon: Brain },
            { label: 'Won',      value: won,     sub: 'correct picks',   color: 'text-emerald-400', icon: CheckCircle2 },
            { label: 'Lost',     value: lost,    sub: 'wrong picks',     color: 'text-red-400',     icon: XCircle },
            { label: 'Pending',  value: pending, sub: 'awaiting result', color: 'text-amber-400',   icon: Clock },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-gray-400">{s.label}</span>
              </div>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ROI simulation */}
        {settled > 0 && (
          <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isProfit ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isProfit ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                <IndianRupee className={`w-5 h-5 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-400">₹500/bet Simulation · {settled} settled bets · avg odds 1.85</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {isProfit ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                  <span className={`text-xl font-extrabold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isProfit ? '+' : ''}{formatCurrency(netPnL)}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isProfit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    ROI {isProfit ? '+' : ''}{roi}%
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-600">Simulated — for informational purposes only · 18+</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          {(['ALL', 'WON', 'LOST', 'PENDING'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === f ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {f === 'ALL' ? `All (${predictions.length})` : f === 'WON' ? `Won (${won})` : f === 'LOST' ? `Lost (${lost})` : `Pending (${pending})`}
            </button>
          ))}
          <div className="ml-auto">
            <select value={confFilter} onChange={e => setConfFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 outline-none">
              <option value="all">All confidence</option>
              <option value="VERY_HIGH">Very High</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Predictions table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400" /> AI Predictions
            </h2>
            <span className="text-xs text-gray-500">{filtered.length} shown</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">No predictions match this filter</div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {filtered.map(p => {
                const rm = RESULT_META[p.result]
                const ResultIcon = rm.icon
                const confCls = CONF_COLORS[p.confidence] || CONF_COLORS.LOW
                return (
                  <div key={p.id} className="px-5 py-4 hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Teams */}
                        <p className="text-white font-semibold text-sm">
                          {p.teamA} <span className="text-gray-500 font-normal">vs</span> {p.teamB}
                        </p>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${confCls}`}>
                            {p.confidence?.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Brain className="w-3 h-3 text-emerald-400" />
                            Pick: <span className="text-white font-semibold ml-0.5">{p.predictedWinner}</span>
                            <span className="text-emerald-400 ml-0.5">{p.winPct}%</span>
                          </span>
                          {p.venue && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" /> {p.venue}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-600 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" /> {formatDate(p.createdAt)}
                          </span>
                        </div>

                        {/* Prob bar */}
                        <div className="flex h-1.5 rounded-full overflow-hidden mt-2 gap-0.5 max-w-xs">
                          <div className="bg-emerald-500 rounded-l-full" style={{ width: `${p.winProbabilityA}%` }} />
                          <div className="bg-gray-600 rounded-r-full" style={{ width: `${p.winProbabilityB}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-0.5 max-w-xs">
                          <span>{p.teamA.split(' ').slice(-1)} {p.winProbabilityA}%</span>
                          <span>{p.teamB.split(' ').slice(-1)} {p.winProbabilityB}%</span>
                        </div>

                        {p.tip && (
                          <p className="text-[11px] text-gray-400 mt-2 italic line-clamp-1">"{p.tip}"</p>
                        )}
                      </div>

                      {/* Result badge */}
                      <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${rm.cls}`}>
                        <ResultIcon className="w-3 h-3" /> {rm.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="text-center">
            <button onClick={() => fetchPredictions(false)} disabled={loadingMore}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto">
              {loadingMore ? <><RefreshCw className="w-4 h-4 animate-spin" /> Loading...</> : <>Load more <ChevronDown className="w-4 h-4" /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
