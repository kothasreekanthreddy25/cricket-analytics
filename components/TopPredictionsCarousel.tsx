'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Brain, ChevronLeft, ChevronRight, Trophy, MapPin, TrendingUp, Star } from 'lucide-react'
import { StakeAdCarousel } from './StakeAdCard'

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
  venue: string | null
  pitchType: string | null
  tip: string | null
  reasoning: string | null
  createdAt: string
}

const CONF_COLORS: Record<string, string> = {
  VERY_HIGH: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  HIGH: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  LOW: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
}

const CONF_LABEL: Record<string, string> = {
  VERY_HIGH: 'Very High',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

function PredictionCard({ pred }: { pred: Prediction }) {
  const isAWinner = pred.predictedWinner === pred.teamA
  const confCls = CONF_COLORS[pred.confidence] || CONF_COLORS.MEDIUM

  return (
    <div className="flex-shrink-0 w-[300px] sm:w-[340px] bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-colors">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">AI Pick</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${confCls}`}>
          {CONF_LABEL[pred.confidence] || pred.confidence} Confidence
        </span>
      </div>

      <div className="p-4">
        {/* Teams vs */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Team A */}
          <div className={`flex-1 text-center ${isAWinner ? '' : 'opacity-50'}`}>
            <p className={`text-sm font-bold leading-tight ${isAWinner ? 'text-white' : 'text-gray-400'}`}>
              {pred.teamA}
            </p>
            <p className={`text-xl font-extrabold font-mono mt-1 ${isAWinner ? 'text-emerald-400' : 'text-gray-500'}`}>
              {pred.winProbabilityA}%
            </p>
          </div>

          {/* VS */}
          <div className="text-center flex-shrink-0">
            <span className="text-xs font-bold text-gray-600 bg-gray-800 px-2 py-1 rounded-lg">VS</span>
          </div>

          {/* Team B */}
          <div className={`flex-1 text-center ${!isAWinner ? '' : 'opacity-50'}`}>
            <p className={`text-sm font-bold leading-tight ${!isAWinner ? 'text-white' : 'text-gray-400'}`}>
              {pred.teamB}
            </p>
            <p className={`text-xl font-extrabold font-mono mt-1 ${!isAWinner ? 'text-emerald-400' : 'text-gray-500'}`}>
              {pred.winProbabilityB}%
            </p>
          </div>
        </div>

        {/* Win probability bar */}
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
            style={{ width: `${pred.winProbabilityA}%` }}
          />
        </div>

        {/* Predicted winner badge */}
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 mb-3">
          <Trophy className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Predicted Winner</p>
            <p className="text-sm font-bold text-white truncate">{pred.predictedWinner} <span className="text-emerald-400">{pred.winPct}%</span></p>
          </div>
        </div>

        {/* Tip */}
        {pred.tip && (
          <div className="flex items-start gap-2 bg-gray-800/50 rounded-xl px-3 py-2 mb-3">
            <Star className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-300 leading-relaxed line-clamp-2">{pred.tip}</p>
          </div>
        )}

        {/* Venue + Pitch */}
        {(pred.venue || pred.pitchType) && (
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {pred.venue && (
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{pred.venue}</span>
              </div>
            )}
            {pred.pitchType && (
              <div className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-2.5 h-2.5" />
                {pred.pitchType}
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/live/${pred.matchKey}`}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold bg-gray-800 hover:bg-gray-700 text-white transition-colors"
        >
          View Full Analysis
        </Link>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[300px] sm:w-[340px] bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-10 bg-gray-800 border-b border-gray-800" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-800 rounded w-3/4" />
            <div className="h-6 bg-gray-800 rounded w-1/2" />
          </div>
          <div className="w-8 h-8 bg-gray-800 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-800 rounded w-3/4 ml-auto" />
            <div className="h-6 bg-gray-800 rounded w-1/2 ml-auto" />
          </div>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full" />
        <div className="h-12 bg-gray-800 rounded-xl" />
        <div className="h-10 bg-gray-800 rounded-xl" />
        <div className="h-8 bg-gray-800 rounded-xl" />
      </div>
    </div>
  )
}

export default function TopPredictionsCarousel() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/predictions/top-weekly')
      .then(r => r.json())
      .then(d => {
        if (d.success) setPredictions(d.predictions)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = 340 + 16 // card + gap
    el.scrollBy({ left: dir === 'right' ? cardWidth : -cardWidth, behavior: 'smooth' })
    setCurrent(prev =>
      dir === 'right'
        ? Math.min(prev + 1, predictions.length - 1)
        : Math.max(prev - 1, 0)
    )
  }

  const total = loading ? 5 : predictions.length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Latest AI Predictions
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Highest confidence picks from recent matches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={current === 0}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-30 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={current >= total - 1}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-30 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : predictions.length > 0
            ? predictions.flatMap((p, i) => {
                const card = (
                  <div key={p.id} style={{ scrollSnapAlign: 'start' }}>
                    <PredictionCard pred={p} />
                  </div>
                )
                if (i === 1) return [card, <StakeAdCarousel key="stake-ad" />]
                return [card]
              })
            : (
              <div className="flex-1 flex items-center justify-center py-12 text-gray-500 text-sm">
                No predictions available this week yet.
              </div>
            )
        }
      </div>

      {/* Dot indicators */}
      {!loading && predictions.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {predictions.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const el = scrollRef.current
                if (!el) return
                el.scrollTo({ left: i * (340 + 16), behavior: 'smooth' })
                setCurrent(i)
              }}
              className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 bg-purple-400' : 'w-1.5 bg-gray-700'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
