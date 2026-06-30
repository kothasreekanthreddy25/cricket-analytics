'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { StakeAdGrid } from './StakeAdCard'

interface WinPrediction {
  id: string
  matchKey: string
  teamA: string
  teamB: string
  predictedWinner: string
  winPct: number
  confidence: string
}

function short(name: string, max = 12) {
  return name.length > max ? name.slice(0, max - 1).trimEnd() + '…' : name
}

function WinCard({ p }: { p: WinPrediction }) {
  const opponent = p.teamA === p.predictedWinner ? p.teamB : p.teamA
  return (
    <Link
      href={`/live/${p.matchKey}`}
      className="bg-gray-900/70 border border-emerald-500/15 hover:border-emerald-500/40 rounded-xl p-2.5 flex flex-col gap-1.5 transition-colors"
    >
      <div className="flex items-center gap-1">
        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
        <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">Correct</span>
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/predictions/recent-wins')
      .then(r => r.json())
      .then(d => { if (d.success) setPredictions(d.predictions) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && predictions.length === 0) return null

  const skeletonCount = 9
  const items = loading ? Array.from({ length: skeletonCount }) : predictions

  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        Recent Winning Predictions
      </p>
      <div className="grid grid-cols-3 gap-2">
        {items.flatMap((_, i) => {
          const card = loading
            ? <SkeletonCard key={i} />
            : <WinCard key={predictions[i].id} p={predictions[i]} />
          if (i === 2) return [card, <StakeAdGrid key="stake-ad" />]
          return [card]
        })}
      </div>
    </div>
  )
}
