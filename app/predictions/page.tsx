'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import AffiliateBanner from '@/components/AffiliateBanner'
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Brain,
  IndianRupee,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  Filter,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface PredictionRecord {
  id: string
  matchKey: string
  teamA: string
  teamB: string
  winProbabilityA: number
  winProbabilityB: number
  confidence: string
  createdAt: string
  matchDate: string | null
  stage: string
  group: string
  venue: string | null
  predictedWinner: string
  predictedProbability: number
  actualWinner: string | null
  status: 'won' | 'lost' | 'pending' | 'no_result'
}

interface PerformanceSummary {
  total: number
  won: number
  lost: number
  pending: number
  noResult: number
  successRate: number
  stakePerMatch: number
  totalInvested: number
  totalReturned: number
  netProfitLoss: number
  roi: number
  records: PredictionRecord[]
}

type FilterType = 'all' | 'won' | 'lost' | 'pending'
type StageFilter = 'all' | string

const statusConfig = {
  won: { label: 'Won', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  lost: { label: 'Lost', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  no_result: { label: 'No Result', icon: MinusCircle, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
}

// Canonical stage order for sorting
const STAGE_ORDER: Record<string, number> = {
  'Group': 1,
  'Super 8': 2,
  'Knockout': 3,
}

const STAGE_LABELS: Record<string, string> = {
  'Group': '🏏 Group Stage',
  'Super 8': '⚡ Super 8',
  'Knockout': '🏆 Knockout',
}

function formatMatchDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function formatCurrency(amount: number) {
  const abs = Math.abs(amount)
  if (abs >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
  if (abs >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toLocaleString('en-IN')}`
}

function ProbabilityBar({ probA, probB, teamA, teamB }: { probA: number; probB: number; teamA: string; teamB: string }) {
  const pA = probA > 1 ? probA : probA * 100
  const pB = probB > 1 ? probB : probB * 100
  return (
    <div className="w-full min-w-[120px]">
      <div className="flex text-xs text-gray-400 justify-between mb-1">
        <span className="truncate max-w-[48%]">{teamA.split(' ').slice(-1)[0]}</span>
        <span className="truncate max-w-[48%] text-right">{teamB.split(' ').slice(-1)[0]}</span>
      </div>
      <div className="flex rounded-full overflow-hidden h-2">
        <div className="bg-emerald-500 transition-all" style={{ width: `${pA}%` }} />
        <div className="bg-blue-500 transition-all" style={{ width: `${pB}%` }} />
      </div>
      <div className="flex text-xs justify-between mt-1">
        <span className="text-emerald-400 font-medium">{pA.toFixed(0)}%</span>
        <span className="text-blue-400 font-medium">{pB.toFixed(0)}%</span>
      </div>
    </div>
  )
}

function StageSection({ stage, records, expandedByDefault }: { stage: string; records: PredictionRecord[]; expandedByDefault: boolean }) {
  const [expanded, setExpanded] = useState(expandedByDefault)
  const won = records.filter(r => r.status === 'won').length
  const lost = records.filter(r => r.status === 'lost').length
  const pending = records.filter(r => r.status === 'pending').length
  const settled = won + lost
  const rate = settled > 0 ? Math.round((won / settled) * 100) : null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Stage header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-white">{STAGE_LABELS[stage] || stage}</span>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">{records.length} matches</span>
            {rate !== null && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${rate >= 70 ? 'bg-emerald-500/20 text-emerald-400' : rate >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                {rate}% accuracy
              </span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-3 text-sm">
            {won > 0 && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{won}</span>}
            {lost > 0 && <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{lost}</span>}
            {pending > 0 && <span className="text-amber-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{pending}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800/60 text-left bg-gray-900/50">
                  <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Match</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Group</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Prediction</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Win Prob.</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actual</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Result</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Match Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden xl:table-cell">Venue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {records.map((record) => {
                  const cfg = statusConfig[record.status]
                  const Icon = cfg.icon
                  const prob = record.predictedProbability > 1 ? record.predictedProbability : record.predictedProbability * 100
                  return (
                    <tr key={record.id} className="hover:bg-gray-800/30 transition-colors">
                      {/* Match */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-white font-medium text-sm leading-tight">{record.teamA}</span>
                          <span className="text-gray-500 text-xs">vs</span>
                          <span className="text-white font-medium text-sm leading-tight">{record.teamB}</span>
                        </div>
                      </td>

                      {/* Group */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-gray-300 text-xs font-medium">{record.group}</span>
                      </td>

                      {/* Predicted winner */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <div>
                            <p className="text-white text-sm font-medium leading-tight">{record.predictedWinner}</p>
                            <p className="text-emerald-400 text-xs">{prob.toFixed(0)}%</p>
                          </div>
                        </div>
                      </td>

                      {/* Win probability bar */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <ProbabilityBar
                          probA={record.winProbabilityA}
                          probB={record.winProbabilityB}
                          teamA={record.teamA}
                          teamB={record.teamB}
                        />
                      </td>

                      {/* Actual winner */}
                      <td className="px-4 py-3.5">
                        {record.actualWinner ? (
                          <span className="text-white text-sm font-medium">{record.actualWinner}</span>
                        ) : (
                          <span className="text-gray-500 text-xs italic">
                            {record.status === 'pending' ? 'Not played' : '—'}
                          </span>
                        )}
                      </td>

                      {/* Result badge */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Match Date */}
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        {record.matchDate ? (
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {formatMatchDate(record.matchDate)}
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Venue */}
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        {record.venue ? (
                          <div className="flex items-center gap-1 text-gray-400 text-xs max-w-[160px]">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{record.venue}</span>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PredictionsPage() {
  const [data, setData] = useState<PerformanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [stageFilter, setStageFilter] = useState<StageFilter>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/predictions/performance')
      if (!res.ok) throw new Error('Failed to fetch performance data')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Derive unique stages, groups, teams from all records
  const allStages = useMemo(() => {
    if (!data) return []
    const s = new Set(data.records.map(r => r.stage || 'Group'))
    return Object.keys(STAGE_ORDER).filter(st => s.has(st))
  }, [data])

  const allGroups = useMemo(() => {
    if (!data) return []
    const g = new Set(data.records.map(r => r.group).filter(Boolean))
    return Array.from(g).sort()
  }, [data])

  const allTeams = useMemo(() => {
    if (!data) return []
    const t = new Set<string>()
    data.records.forEach(r => { t.add(r.teamA); t.add(r.teamB) })
    return Array.from(t).sort()
  }, [data])

  // Filter records — status + stage + group + team
  const filteredRecords = useMemo(() => {
    if (!data) return []
    return data.records.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false
      if (stageFilter !== 'all' && (r.stage || 'Group') !== stageFilter) return false
      if (groupFilter !== 'all' && r.group !== groupFilter) return false
      if (teamFilter !== 'all' && r.teamA !== teamFilter && r.teamB !== teamFilter) return false
      return true
    })
  }, [data, filter, stageFilter, groupFilter, teamFilter])

  const hasActiveFilters = filter !== 'all' || stageFilter !== 'all' || groupFilter !== 'all' || teamFilter !== 'all'

  function clearAllFilters() {
    setFilter('all')
    setStageFilter('all')
    setGroupFilter('all')
    setTeamFilter('all')
  }

  // Group by stage, sorted by stage order
  const groupedByStage = useMemo(() => {
    const groups: Record<string, PredictionRecord[]> = {}
    for (const r of filteredRecords) {
      const s = r.stage || 'Group'
      if (!groups[s]) groups[s] = []
      groups[s].push(r)
    }
    // Sort each group by match date
    for (const s of Object.keys(groups)) {
      groups[s].sort((a, b) => {
        const da = a.matchDate ? new Date(a.matchDate).getTime() : 0
        const db = b.matchDate ? new Date(b.matchDate).getTime() : 0
        return da - db
      })
    }
    return Object.entries(groups).sort(([a], [b]) => (STAGE_ORDER[a] || 9) - (STAGE_ORDER[b] || 9))
  }, [filteredRecords])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Calculating prediction performance...</p>
          <p className="text-gray-500 text-sm mt-2">Loading all T20 WC 2026 match predictions</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Failed to load data</p>
          <p className="text-gray-400 mt-2">{error}</p>
          <button onClick={fetchData} className="mt-6 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg transition-colors">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const isProfit = data.netProfitLoss >= 0
  const settled = data.won + data.lost

  const filterButtons: { key: FilterType; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All Matches', count: data.total, color: 'text-white' },
    { key: 'won', label: 'Won', count: data.won, color: 'text-emerald-400' },
    { key: 'lost', label: 'Lost', count: data.lost, color: 'text-red-400' },
    { key: 'pending', label: 'Pending', count: data.pending, color: 'text-amber-400' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Prediction Performance</h1>
                <p className="text-gray-400 text-sm">T20 World Cup 2026 — All {data.total} matches</p>
              </div>
            </div>
            <button onClick={fetchData} className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-6">

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Brain className="w-5 h-5 text-blue-400" />} label="Total Predictions" value={data.total.toString()} sub="All T20 WC 2026 matches" color="blue" />
          <StatCard icon={<Trophy className="w-5 h-5 text-emerald-400" />} label="Success Rate" value={`${data.successRate}%`} sub={`${data.won}W / ${data.lost}L of ${settled} settled`} color="emerald" />
          <StatCard icon={<Clock className="w-5 h-5 text-amber-400" />} label="Pending" value={data.pending.toString()} sub="Upcoming matches" color="amber" />
          <StatCard icon={<Target className="w-5 h-5 text-purple-400" />} label="Confidence" value={settled > 0 ? (data.won >= data.lost ? 'Positive' : 'Improving') : 'N/A'} sub="Overall AI signal" color="purple" />
        </div>

        {/* Affiliate Banner */}
        <AffiliateBanner />

        {/* ── ₹10,000 Simulation ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">₹10,000 Investment Simulation</h2>
              <p className="text-gray-400 text-sm">Equal stake of {formatCurrency(data.stakePerMatch)} × {settled} settled matches</p>
            </div>
          </div>
          {settled === 0 ? (
            <p className="text-gray-500 text-center py-6">No settled predictions yet.</p>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4 mb-5">
                <div className={`flex-1 rounded-xl p-5 border ${isProfit ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <p className="text-sm text-gray-400 mb-1">Net Profit / Loss</p>
                  <div className="flex items-center gap-2">
                    {isProfit ? <TrendingUp className="w-7 h-7 text-emerald-400" /> : <TrendingDown className="w-7 h-7 text-red-400" />}
                    <span className={`text-3xl font-extrabold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isProfit ? '+' : ''}{formatCurrency(data.netProfitLoss)}
                    </span>
                  </div>
                  <p className={`text-sm mt-2 font-medium ${isProfit ? 'text-emerald-300' : 'text-red-300'}`}>ROI: {isProfit ? '+' : ''}{data.roi}%</p>
                </div>
                <div className="flex-1 rounded-xl p-5 bg-gray-800/50 border border-gray-700/50 space-y-3">
                  <SimRow label="Total Invested" value={formatCurrency(data.totalInvested)} />
                  <SimRow label="Total Returned" value={formatCurrency(data.totalReturned)} highlight={isProfit ? 'green' : 'red'} />
                  <SimRow label="Stake Per Match" value={formatCurrency(data.stakePerMatch)} />
                  <SimRow label="Settled Matches" value={`${settled} of ${data.total}`} />
                </div>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-gray-300 leading-relaxed">
                <p className="font-semibold text-blue-300 mb-2">How is this calculated?</p>
                <p>₹10,000 split equally as <strong className="text-white">{formatCurrency(data.stakePerMatch)}</strong> per settled match. Correct predictions return stake × implied odds (1 ÷ predicted probability). Wrong bets lose the stake.</p>
                {isProfit
                  ? <p className="mt-2 text-emerald-300 font-medium">✅ ₹10,000 → <strong>{formatCurrency(10000 + data.netProfitLoss)}</strong> (+{formatCurrency(data.netProfitLoss)} profit)</p>
                  : <p className="mt-2 text-amber-300 font-medium">⚠️ ₹10,000 → <strong>{formatCurrency(10000 + data.netProfitLoss)}</strong> ({formatCurrency(data.netProfitLoss)} loss)</p>
                }
              </div>
            </>
          )}
        </div>

        {/* ── Filter Panel ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-white">Filters</span>
              {hasActiveFilters && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  {filteredRecords.length} match{filteredRecords.length !== 1 ? 'es' : ''}
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-2">
                Clear all
              </button>
            )}
          </div>

          {/* Row 1: Result Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 w-14 shrink-0">Result</span>
            <div className="flex gap-2 flex-wrap">
              {filterButtons.map(btn => (
                <button
                  key={btn.key}
                  onClick={() => setFilter(btn.key)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                    filter === btn.key
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  {btn.label}
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${filter === btn.key ? 'bg-emerald-600 text-white' : 'bg-gray-700 ' + btn.color}`}>
                    {btn.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Stage */}
          {allStages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 w-14 shrink-0">Stage</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setStageFilter('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                    stageFilter === 'all'
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  All Stages
                </button>
                {allStages.map(stage => (
                  <button
                    key={stage}
                    onClick={() => setStageFilter(stage)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                      stageFilter === stage
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    {STAGE_LABELS[stage] || stage}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row 3: Group + Team dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-500 w-14 shrink-0">More</span>
            {/* Group dropdown */}
            {allGroups.length > 0 && (
              <div className="relative">
                <select
                  value={groupFilter}
                  onChange={e => setGroupFilter(e.target.value)}
                  className={`appearance-none bg-gray-800 border rounded-lg px-3 py-1.5 pr-8 text-sm font-medium transition-all cursor-pointer focus:outline-none ${
                    groupFilter !== 'all'
                      ? 'border-purple-500 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  <option value="all">All Groups</option>
                  {allGroups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Team dropdown */}
            {allTeams.length > 0 && (
              <div className="relative">
                <select
                  value={teamFilter}
                  onChange={e => setTeamFilter(e.target.value)}
                  className={`appearance-none bg-gray-800 border rounded-lg px-3 py-1.5 pr-8 text-sm font-medium transition-all cursor-pointer focus:outline-none ${
                    teamFilter !== 'all'
                      ? 'border-amber-500 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  <option value="all">All Teams</option>
                  {allTeams.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* ── Grouped Tables by Stage ── */}
        {groupedByStage.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center text-gray-500">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No matches found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByStage.map(([stage, stageRecords]) => (
              <StageSection
                key={stage}
                stage={stage}
                records={stageRecords}
                expandedByDefault={hasActiveFilters || stage !== 'Knockout'}
              />
            ))}
          </div>
        )}

        {/* ── Performance Breakdown ── */}
        {settled > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Performance Breakdown</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <ProgressBar label="Correct Predictions" value={data.won} total={settled} color="emerald" icon={<CheckCircle2 className="w-4 h-4" />} />
                <ProgressBar label="Wrong Predictions" value={data.lost} total={settled} color="red" icon={<XCircle className="w-4 h-4" />} />
                {data.pending > 0 && (
                  <ProgressBar label="Pending" value={data.pending} total={data.total} color="amber" icon={<Clock className="w-4 h-4" />} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <MiniStat label="Correct" value={data.won} color="emerald" />
                <MiniStat label="Wrong" value={data.lost} color="red" />
                <MiniStat label="Pending" value={data.pending} color="amber" />
                <MiniStat label="No Result" value={data.noResult} color="gray" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = { blue: 'bg-blue-500/10', emerald: 'bg-emerald-500/10', amber: 'bg-amber-500/10', purple: 'bg-purple-500/10' }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className={`w-9 h-9 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm font-medium text-gray-300 mt-1">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  )
}

function SimRow({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${highlight === 'green' ? 'text-emerald-400' : highlight === 'red' ? 'text-red-400' : 'text-white'}`}>{value}</span>
    </div>
  )
}

function ProgressBar({ label, value, total, color, icon }: { label: string; value: number; total: number; color: string; icon: React.ReactNode }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const colorMap: Record<string, string> = { emerald: 'text-emerald-400 bg-emerald-500', red: 'text-red-400 bg-red-500', amber: 'text-amber-400 bg-amber-500' }
  const [textColor, barColor] = (colorMap[color] || 'text-gray-400 bg-gray-500').split(' ')
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className={`${textColor} flex items-center gap-1.5`}>{icon} {label}</span>
        <span className="text-white font-medium">{value} <span className="text-gray-400">({pct}%)</span></span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2.5">
        <div className={`${barColor} h-2.5 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = { emerald: 'text-emerald-400', red: 'text-red-400', amber: 'text-amber-400', gray: 'text-gray-400' }
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 text-center">
      <p className={`text-3xl font-bold ${colorMap[color] || 'text-white'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  )
}
