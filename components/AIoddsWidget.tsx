'use client'

import { useEffect, useState } from 'react'
import { Brain, TrendingUp, ExternalLink, Star, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// ── Bookmaker config – replace href with your actual affiliate tracking links ──
const BOOKMAKERS = [
  {
    id: 'bet365',
    name: 'bet365',
    logo: '365',
    color: 'bg-green-600',
    href: 'https://www.bet365.com',
    bonus: '100% up to ₹8,000',
    featured: true,
  },
  {
    id: '1xbet',
    name: '1xBet',
    logo: '1X',
    color: 'bg-blue-600',
    href: 'https://reffpa.com/L?tag=d_5312130m_1599c_&site=5312130&ad=1599',
    bonus: '₹26,000 Welcome Bonus',
    featured: true,
  },
  {
    id: 'betway',
    name: 'Betway',
    logo: 'BW',
    color: 'bg-purple-600',
    href: 'https://betway.com',
    bonus: '₹2,500 Free Bet',
    featured: false,
  },
  {
    id: 'dafabet',
    name: 'Dafabet',
    logo: 'DA',
    color: 'bg-orange-600',
    href: 'https://dafabet.com',
    bonus: '160% up to ₹16,000',
    featured: false,
  },
]

interface Match {
  matchKey: string
  teamA: string
  teamB: string
  aiOddsA: number
  aiOddsB: number
  probA: number
  probB: number
  favourite: string
  favProb: number
  confidence: string
}

const CONFIDENCE_COLOR: Record<string, string> = {
  HIGH: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  VERY_HIGH: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  LOW: 'text-gray-400 bg-gray-800 border-gray-700',
}

export default function AIoddsWidget() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/odds/featured')
      .then(r => r.json())
      .then(d => { setMatches(d.matches || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-800/60 rounded-2xl" />)}
    </div>
  )

  if (matches.length === 0) return null

  return (
    <div className="space-y-4">
      {matches.map(m => (
        <div key={m.matchKey} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">

          {/* Match header */}
          <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{m.teamA} vs {m.teamB}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${CONFIDENCE_COLOR[m.confidence] || CONFIDENCE_COLOR.LOW}`}>
                  {m.confidence?.replace('_', ' ')} confidence
                </span>
              </div>
            </div>
            {/* AI Pick badge */}
            <div className="flex-shrink-0 text-right">
              <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                <Brain className="w-3.5 h-3.5" />
                AI Pick
              </div>
              <p className="text-white font-extrabold text-sm mt-0.5">{m.favourite}</p>
              <p className="text-emerald-400 text-xs">{m.favProb}% win prob</p>
            </div>
          </div>

          {/* Probability bar */}
          <div className="px-4 pb-3">
            <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
              <div className="bg-emerald-500 rounded-l-full" style={{ width: `${m.probA}%` }} />
              <div className="bg-gray-600 rounded-r-full" style={{ width: `${m.probB}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>{m.teamA} {m.probA}%</span>
              <span>{m.teamB} {m.probB}%</span>
            </div>
          </div>

          {/* AI Odds + Bookmakers */}
          <div className="border-t border-gray-800 px-4 py-3">
            <div className="flex items-center gap-2 mb-2.5">
              <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">AI Implied Odds · Bet Now</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* AI Odds chips */}
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                <Brain className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-gray-400">{m.teamA}</span>
                <span className="text-emerald-400 font-extrabold text-sm">{m.aiOddsA}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-800/80 border border-gray-700 rounded-lg px-2.5 py-1.5">
                <Brain className="w-3 h-3 text-gray-500" />
                <span className="text-[11px] text-gray-400">{m.teamB}</span>
                <span className="text-gray-300 font-extrabold text-sm">{m.aiOddsB}</span>
              </div>

              <div className="w-px h-6 bg-gray-700 mx-1" />

              {/* Bookmaker buttons */}
              {BOOKMAKERS.map(bk => (
                <a
                  key={bk.id}
                  href={bk.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={`flex items-center gap-1.5 ${bk.color} hover:opacity-90 text-white rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-opacity`}
                >
                  <span>{bk.name}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Bookmaker bonus strip */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-bold text-white">New to betting? Claim your welcome bonus</span>
          <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded ml-auto">18+</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BOOKMAKERS.map(bk => (
            <a
              key={bk.id}
              href={bk.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-2.5 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 rounded-xl px-3 py-2.5 transition-colors group"
            >
              <div className={`w-8 h-8 rounded-lg ${bk.color} flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0`}>
                {bk.logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-bold">{bk.name}</p>
                <p className="text-gray-400 text-[10px] truncate">{bk.bonus}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
            </a>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-3 text-center">T&Cs apply. Gamble responsibly. BeGambleAware.org</p>
      </div>

      <div className="text-center">
        <Link href="/odds" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1">
          View all match odds <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
