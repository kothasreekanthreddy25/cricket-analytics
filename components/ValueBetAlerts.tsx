'use client'

import { useEffect, useState } from 'react'
import { Zap, Brain, ExternalLink, ChevronRight, TrendingUp, Tag } from 'lucide-react'
import Link from 'next/link'
import { getBookmakersByCountry, type Bookmaker } from '@/lib/bookmakers'

interface ValueMatch {
  matchKey: string
  teamA: string
  teamB: string
  favourite: string
  favProb: number
  aiOddsA: number
  aiOddsB: number
  probA: number
  probB: number
  confidence: string
  valueRating: 'STRONG' | 'GOOD' | 'FAIR' | 'AVOID'
}

export default function ValueBetAlerts() {
  const [matches, setMatches] = useState<ValueMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<Bookmaker[]>([])

  useEffect(() => {
    fetch('/api/odds/featured')
      .then(r => r.json())
      .then(d => {
        const valueBets = (d.matches || []).filter(
          (m: ValueMatch) => m.valueRating === 'STRONG' || m.valueRating === 'GOOD'
        )
        setMatches(valueBets)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch('/api/geo')
      .then(r => r.json())
      .then(({ country }: { country: string }) => setOffers(getBookmakersByCountry(country)))
      .catch(() => {})
  }, [])

  if (loading) return (
    <div className="space-y-2">
      {[1, 2].map(i => <div key={i} className="h-16 bg-gray-800/40 rounded-xl animate-pulse" />)}
    </div>
  )

  if (matches.length === 0) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/15 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">High-Confidence AI Picks</p>
            <p className="text-[10px] text-gray-500">{matches.length} high-confidence pick{matches.length !== 1 ? 's' : ''} today</p>
          </div>
        </div>
        <Link href="/odds?tab=value" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
          All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Alerts */}
      <div className="divide-y divide-gray-800/50">
        {matches.slice(0, 3).map(m => {
          const isStrong = m.valueRating === 'STRONG'
          return (
            <div key={m.matchKey} className="px-5 py-3.5">
              <div className="flex items-start gap-3">
                {/* Value badge */}
                <div className={`flex-shrink-0 mt-0.5 px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase ${isStrong ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {isStrong ? '🔥 Strong' : '✅ Good'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-xs font-semibold truncate">{m.teamA} vs {m.teamB}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Brain className="w-3 h-3 text-emerald-400" />
                    <span className="text-[11px] text-gray-400">
                      Pick: <span className="text-white font-semibold">{m.favourite}</span>
                      <span className="text-emerald-400 ml-1">{m.favProb}%</span>
                    </span>
                    <span className="text-gray-600">·</span>
                    <TrendingUp className="w-3 h-3 text-gray-500" />
                    <span className="text-[11px] text-gray-500">
                      AI odds: <span className="text-white font-bold">{m.probA >= m.probB ? m.aiOddsA : m.aiOddsB}</span>
                    </span>
                  </div>
                </div>

                {/* Quick bet buttons */}
                <div className="flex gap-1.5 flex-shrink-0">
                  {offers.map(o => (
                    <a key={o.id} href={o.url} target="_blank" rel="noopener noreferrer nofollow sponsored"
                      title={`Bet at ${o.name}`}
                      className={`${o.logoBg} hover:opacity-80 text-[10px] font-bold px-2 py-1 rounded-lg transition-opacity flex items-center gap-0.5`}>
                      {o.name.slice(0, 3)} <ExternalLink className="w-2 h-2 opacity-70" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-5 py-2.5 bg-gray-900/60 flex items-center justify-between gap-2">
        {offers.find(o => o.promo) && (
          <div className="flex items-center gap-1 min-w-0">
            <Tag className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
            <span className="text-[9px] font-bold text-amber-400 truncate">
              {offers.find(o => o.promo)!.name} promo: {offers.find(o => o.promo)!.promo}
            </span>
          </div>
        )}
        <p className="text-[10px] text-gray-600 ml-auto flex-shrink-0">18+ · T&Cs apply</p>
      </div>
    </div>
  )
}
