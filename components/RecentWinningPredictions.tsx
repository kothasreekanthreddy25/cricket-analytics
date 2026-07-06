'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { StakeAdGrid } from './StakeAdCard'

interface WinPrediction {
  id: string
  matchKey: string
  teamA: string
  teamB: string
  predictedWinner: string
  winPct: number
  confidence: string
  isSettled: boolean
  isCorrect: boolean
  createdAt: string
}

interface Stats {
  settled: number
  correct: number
  accuracy: number
}

// Word-aware shortening: cut at a word boundary instead of mid-word so
// "Bengaluru Blasters" becomes "Bengaluru…", never "Bengaluru B…".
function short(name: string, max = 16) {
  if (name.length <= max) return name
  const words = name.split(' ')
  let out = words[0]
  for (const w of words.slice(1)) {
    if ((out + ' ' + w).length > max) return out + '…'
    out += ' ' + w
  }
  return out.slice(0, max - 1).trimEnd() + '…'
}

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function WinCard({ p }: { p: WinPrediction }) {
  const opponent = p.teamA === p.predictedWinner ? p.teamB : p.teamA
  const badge = p.isSettled
    ? p.isCorrect
      ? { icon: <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />, label: 'Correct', cls: 'text-emerald-400', border: 'border-emerald-500/15 hover:border-emerald-500/40' }
      : { icon: <XCircle className="w-2.5 h-2.5 text-red-400/80 flex-shrink-0" />, label: 'Missed', cls: 'text-red-400/80', border: 'border-gray-700/60 hover:border-gray-600' }
    : { icon: <Clock className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />, label: 'High Conf', cls: 'text-cyan-400', border: 'border-cyan-500/15 hover:border-cyan-500/40' }

  return (
    <Link
      href={`/live/${p.matchKey}`}
      className={`bg-gray-900/70 border ${badge.border} rounded-xl p-2.5 flex flex-col gap-1.5 transition-colors`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          {badge.icon}
          <span className={`text-[8px] font-bold uppercase tracking-wider ${badge.cls}`}>{badge.label}</span>
        </div>
        <span className="text-[8px] text-gray-600 flex-shrink-0">{timeAgo(p.createdAt)}</span>
      </div>
      <p className="text-[11px] font-bold text-white leading-tight truncate">{short(p.predictedWinner)}</p>
      <p className="text-[9px] text-gray-500 truncate">vs {short(opponent)}</p>
      <div className="flex items-center justify-between mt-0.5">
        <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden mr-2">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
            style={{ width: `${p.winPct}%` }}
          />
        </div>
        <span className="text-emerald-400 text-[11px] font-extrabold font-mono flex-shrink-0">{p.winPct}%</span>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-2.5 flex flex-col gap-1.5 animate-pulse">
      <div className="h-2 bg-gray-800 rounded w-1/2" />
      <div className="h-3 bg-gray-800 rounded w-3/4" />
      <div className="h-2 bg-gray-800 rounded w-1/2" />
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-gray-800 rounded-full" />
        <div className="h-3 bg-gray-800 rounded w-6" />
      </div>
    </div>
  )
}

interface Props {
  variant?: 'strip' | 'grid'
}

export default function RecentWinningPredictions({ variant = 'strip' }: Props) {
  const [predictions, setPredictions] = useState<WinPrediction[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/predictions/recent-wins')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPredictions(d.predictions)
          if (d.stats) setStats(d.stats)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && predictions.length === 0) return null

  const skeletonCount = 8
  const items = loading ? Array.from({ length: skeletonCount }) : predictions

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Recent AI Results
        </p>
        {stats && stats.settled >= 10 && (
          <p className="text-[10px] text-gray-500">
            <span className="text-emerald-400 font-extrabold">{stats.accuracy}%</span> accurate ·{' '}
            <span className="text-gray-400 font-semibold">{stats.settled}</span> settled
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((_, i) =>
          loading
            ? <SkeletonCard key={i} />
            : <WinCard key={predictions[i].id} p={predictions[i]} />
        )}
        {/* Ad sits in the last cell so it never interrupts the results grid */}
        {!loading && <StakeAdGrid />}
      </div>
    </div>
  )
}
