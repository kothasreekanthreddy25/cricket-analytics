'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, Clock, TrendingUp, Calendar, Trophy } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'

interface PredictionRecord {
  id: string
  matchKey: string
  teamA: string
  teamB: string
  confidence: string
  createdAt: string
  matchDate: string | null
  group: string
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
  lastUpdated: string
  records: PredictionRecord[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}{p.name === 'Accuracy' ? '%' : ''}</p>
      ))}
    </div>
  )
}

function barColor(accuracy: number) {
  if (accuracy >= 70) return '#10b981' // emerald-500
  if (accuracy >= 50) return '#f59e0b' // amber-500
  return '#ef4444' // red-500
}

// Groups settled records by a key and returns { key, accuracy, settled }[],
// sorted by the caller as needed. Skips groups with too few settled
// predictions to be a meaningful accuracy figure (avoids a "100%" bar from
// a single lucky pick looking as credible as one built on 50 matches).
function groupAccuracy<T>(records: PredictionRecord[], keyFn: (r: PredictionRecord) => T, minSettled = 3) {
  const groups = new Map<T, { won: number; settled: number }>()
  for (const r of records) {
    if (r.status !== 'won' && r.status !== 'lost') continue
    const key = keyFn(r)
    const g = groups.get(key) || { won: 0, settled: 0 }
    g.settled++
    if (r.status === 'won') g.won++
    groups.set(key, g)
  }
  return [...groups.entries()]
    .filter(([, g]) => g.settled >= minSettled)
    .map(([key, g]) => ({ key, accuracy: Math.round((g.won / g.settled) * 100), settled: g.settled }))
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function PredictionHistoryPage() {
  const [data, setData] = useState<PerformanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'won' | 'lost'>('all')

  useEffect(() => {
    fetch('/api/predictions/performance')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const records = data?.records || []
  const settled = useMemo(() => records.filter(r => r.status === 'won' || r.status === 'lost'), [records])

  const byMonth = useMemo(() => {
    const rows = groupAccuracy(
      settled.filter(r => r.matchDate || r.createdAt),
      r => monthLabel(r.matchDate || r.createdAt),
      1 // months can legitimately have few matches — still show them
    )
    // groupAccuracy's Map iteration order roughly follows insertion (record
    // order is createdAt desc), so re-sort chronologically for the chart
    return rows.sort((a, b) => new Date(`1 ${a.key}`).getTime() - new Date(`1 ${b.key}`).getTime()).slice(-12)
  }, [settled])

  const byTournament = useMemo(
    () => groupAccuracy(settled, r => r.group || 'Other').sort((a, b) => b.settled - a.settled).slice(0, 8),
    [settled]
  )

  const byConfidence = useMemo(() => {
    const order = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW']
    const rows = groupAccuracy(settled, r => (r.confidence || 'unknown').toUpperCase())
    return order.filter(k => rows.some(r => r.key === k)).map(k => rows.find(r => r.key === k)!)
  }, [settled])

  const filteredRecent = useMemo(() => {
    const pool = filter === 'all' ? settled : settled.filter(r => r.status === filter)
    return pool.slice(0, 40)
  }, [settled, filter])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/predictions" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Predictions
        </Link>

        <div className="flex items-center gap-3 mb-1">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl md:text-3xl font-bold">Prediction Track Record</h1>
        </div>
        <p className="text-gray-400 text-sm mb-8">
          Every settled prediction, wins and losses alike — nothing hidden. Updated {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}.
        </p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-800/50 rounded-2xl animate-pulse" />)}
          </div>
        ) : !data || data.total === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <p className="text-gray-400">No prediction history yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Headline stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Overall Accuracy', value: `${data.successRate}%`, icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400' },
                { label: 'Won', value: data.won, icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400' },
                { label: 'Lost', value: data.lost, icon: <XCircle className="w-4 h-4 text-red-400" />, color: 'text-red-400' },
                { label: 'Pending', value: data.pending, icon: <Clock className="w-4 h-4 text-amber-400" />, color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500">{s.icon}{s.label}</div>
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Accuracy by confidence tier — does "HIGH confidence" actually mean higher accuracy? */}
            {byConfidence.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-1">Accuracy by Confidence Tier</h2>
                <p className="text-xs text-gray-500 mb-4">Does a "HIGH confidence" label actually mean a higher hit rate? This is how you check.</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byConfidence.map(r => ({ tier: String(r.key).replace('_', ' '), Accuracy: r.accuracy, settled: r.settled }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="tier" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="Accuracy" radius={[6, 6, 0, 0]}>
                      {byConfidence.map((r, i) => <Cell key={i} fill={barColor(r.accuracy)} />)}
                      <LabelList dataKey="Accuracy" position="top" formatter={(v: number) => `${v}%`} fill="#e5e7eb" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly trend */}
            {byMonth.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-bold text-white">Accuracy Over Time</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">Monthly accuracy, by match date.</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byMonth.map(r => ({ month: r.key, Accuracy: r.accuracy, settled: r.settled }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="Accuracy" radius={[6, 6, 0, 0]}>
                      {byMonth.map((r, i) => <Cell key={i} fill={barColor(r.accuracy)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* By tournament */}
            {byTournament.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-white">Accuracy by Tournament</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">Tournaments with at least 3 settled predictions.</p>
                <ResponsiveContainer width="100%" height={Math.max(200, byTournament.length * 36)}>
                  <BarChart data={byTournament.map(r => ({ tournament: String(r.key), Accuracy: r.accuracy, settled: r.settled }))} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
                    <YAxis dataKey="tournament" type="category" width={150} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="Accuracy" radius={[0, 6, 6, 0]}>
                      {byTournament.map((r, i) => <Cell key={i} fill={barColor(r.accuracy)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent settled predictions — wins and losses */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-sm font-bold text-white">Recent Settled Predictions</h2>
                <div className="flex gap-1.5">
                  {(['all', 'won', 'lost'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors capitalize ${filter === f ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {filteredRecent.map(r => (
                  <Link
                    key={r.id}
                    href={`/analysis?match=${r.matchKey}`}
                    className="flex items-center gap-3 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-800 rounded-xl px-4 py-3 transition-colors"
                  >
                    {r.status === 'won' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{r.teamA} vs {r.teamB}</p>
                      <p className="text-[11px] text-gray-500">
                        Picked {r.predictedWinner} · {Math.round(r.predictedProbability > 1 ? r.predictedProbability : r.predictedProbability * 100)}% · {r.group}
                      </p>
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-full flex-shrink-0 ${r.status === 'won' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {r.status}
                    </span>
                  </Link>
                ))}
                {filteredRecent.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-8">No {filter !== 'all' ? filter : ''} predictions to show.</p>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-gray-600 pb-4">
              AI predictions are for informational purposes only. Past accuracy does not guarantee future results. 18+ Gamble responsibly.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
