'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  IndianRupee,
} from 'lucide-react'

interface Stats {
  total: number
  won: number
  lost: number
  pending: number
  successRate: number
  netProfitLoss: number
  roi: number
  totalInvested: number
  lastUpdated: string | null
}

export default function PredictionStatsWidget() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/predictions/performance?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setStats({
          total: d.total,
          won: d.won,
          lost: d.lost,
          pending: d.pending,
          successRate: d.successRate,
          netProfitLoss: d.netProfitLoss,
          roi: d.roi,
          totalInvested: d.totalInvested,
          lastUpdated: d.lastUpdated || null,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const settled = stats ? stats.won + stats.lost : 0
  const isProfit = stats ? stats.netProfitLoss >= 0 : false

  function formatCurrency(amount: number) {
    const abs = Math.abs(amount)
    if (abs >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
    if (abs >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
    return `₹${amount.toLocaleString('en-IN')}`
  }

  return (
    <section className="bg-gray-950 py-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">
                AI Prediction Tracker
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Our Prediction Performance
            </h2>
            <p className="text-gray-400 mt-1 text-sm">
              T20 World Cup 2026 — live accuracy stats
              {stats?.lastUpdated && (
                <span className="text-gray-600 ml-2">
                  &middot; Updated {(() => {
                    const updated = new Date(stats.lastUpdated)
                    const now = new Date()
                    const diffMs = now.getTime() - updated.getTime()
                    const diffMins = Math.floor(diffMs / 60000)
                    if (diffMins < 1) return 'just now'
                    if (diffMins < 60) return `${diffMins}m ago`
                    const diffHours = Math.floor(diffMins / 60)
                    if (diffHours < 24) return `${diffHours}h ago`
                    return updated.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  })()}
                </span>
              )}
            </p>
          </div>
          <Link
            href="/predictions"
            className="hidden sm:inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium text-sm transition-colors"
          >
            Full Report <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          /* Skeleton */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse">
                <div className="h-3 w-20 bg-gray-800 rounded mb-3" />
                <div className="h-8 w-16 bg-gray-800 rounded mb-2" />
                <div className="h-3 w-24 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        ) : !stats || stats.total === 0 ? null : (
          <>
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

              {/* Success Rate */}
              <div className="bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-2xl p-5 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Accuracy</span>
                </div>
                <p className="text-3xl font-extrabold text-white">{stats.successRate}%</p>
                <p className="text-xs text-gray-500 mt-1">{settled} settled predictions</p>
                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${stats.successRate}%` }}
                  />
                </div>
              </div>

              {/* Won */}
              <div className="bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-2xl p-5 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Won</span>
                </div>
                <p className="text-3xl font-extrabold text-emerald-400">{stats.won}</p>
                <p className="text-xs text-gray-500 mt-1">correct predictions</p>
                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: settled > 0 ? `${(stats.won / settled) * 100}%` : '0%' }}
                  />
                </div>
              </div>

              {/* Lost */}
              <div className="bg-gray-900 border border-gray-800 hover:border-red-500/30 rounded-2xl p-5 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Lost</span>
                </div>
                <p className="text-3xl font-extrabold text-red-400">{stats.lost}</p>
                <p className="text-xs text-gray-500 mt-1">wrong predictions</p>
                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-700"
                    style={{ width: settled > 0 ? `${(stats.lost / settled) * 100}%` : '0%' }}
                  />
                </div>
              </div>

              {/* Pending */}
              <div className="bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-2xl p-5 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Pending</span>
                </div>
                <p className="text-3xl font-extrabold text-amber-400">{stats.pending}</p>
                <p className="text-xs text-gray-500 mt-1">upcoming matches</p>
                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-700"
                    style={{ width: stats.total > 0 ? `${(stats.pending / stats.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>

            {/* ── ROI Banner ── */}
            {settled > 0 && (
              <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                isProfit
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-red-500/5 border-red-500/20'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isProfit ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    <IndianRupee className={`w-5 h-5 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">₹10,000 Investment Simulation</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {isProfit
                        ? <TrendingUp className="w-5 h-5 text-emerald-400" />
                        : <TrendingDown className="w-5 h-5 text-red-400" />
                      }
                      <span className={`text-2xl font-extrabold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isProfit ? '+' : ''}{formatCurrency(stats.netProfitLoss)}
                      </span>
                      <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                        isProfit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        ROI {isProfit ? '+' : ''}{stats.roi}%
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/predictions"
                  className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shrink-0"
                >
                  View Full Report
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Mobile "Full Report" link */}
            <div className="mt-4 sm:hidden text-center">
              <Link href="/predictions" className="text-emerald-400 text-sm font-medium inline-flex items-center gap-1">
                Full Prediction Report <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
