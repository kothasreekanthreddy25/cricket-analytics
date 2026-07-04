'use client'

import { useEffect, useState } from 'react'
import { Brain, Bookmark, BookmarkCheck, ChevronRight, RefreshCw, Zap, Eye } from 'lucide-react'
import Link from 'next/link'

interface MoodMatch {
  matchKey: string
  teamA: string
  teamB: string
  probA: number
  probB: number
  confidence: string
  emoji: string
  mood: string
  tagline: string
  watchScore: number
  watchReasons: string[]
  prediction: string
  tossImpact: 'HIGH' | 'MEDIUM' | 'LOW'
  expectedRuns: string
  vibe: 'THRILLER' | 'FEAST' | 'DOMINANT' | 'BALANCED' | 'UPSET_LIKELY'
  bookmarkLabel: string
}

const VIBE_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  THRILLER:     { bg: 'from-red-900/20 to-gray-900',    border: 'border-red-500/30',    badge: 'bg-red-500/20 text-red-300 border-red-500/40' },
  FEAST:        { bg: 'from-amber-900/20 to-gray-900',   border: 'border-amber-500/30',  badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  DOMINANT:     { bg: 'from-blue-900/20 to-gray-900',    border: 'border-blue-500/30',   badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  BALANCED:     { bg: 'from-emerald-900/20 to-gray-900', border: 'border-emerald-500/30',badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  UPSET_LIKELY: { bg: 'from-purple-900/20 to-gray-900',  border: 'border-purple-500/30', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
}

const TOSS_COLOR = { HIGH: 'text-red-400', MEDIUM: 'text-amber-400', LOW: 'text-emerald-400' }

function WatchMeter({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#6b7280'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-extrabold" style={{ color }}>{score}/10</span>
    </div>
  )
}

export default function AIMatchMoodPredictor() {
  const [matches, setMatches] = useState<MoodMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ai/match-mood')
      .then(r => r.json())
      .then(d => { if (d.success) setMatches(d.matches) })
      .finally(() => setLoading(false))
  }, [])

  const toggleBookmark = (key: string) => {
    setBookmarked(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-28 bg-gray-800/50 rounded-2xl animate-pulse" />
      ))}
    </div>
  )

  if (matches.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Match Mood</h3>
            <p className="text-[10px] text-gray-500">GPT-4o reads form, pitch & history</p>
          </div>
        </div>
        <button onClick={() => { setLoading(true); fetch('/api/ai/match-mood').then(r=>r.json()).then(d=>{if(d.success)setMatches(d.matches)}).finally(()=>setLoading(false)) }}
          className="text-gray-500 hover:text-gray-300 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {matches.map(m => {
          const style = VIBE_STYLES[m.vibe] || VIBE_STYLES.BALANCED
          const isExpanded = expanded === m.matchKey
          const isBookmarked = bookmarked.has(m.matchKey)

          return (
            <div key={m.matchKey}
              className={`bg-gradient-to-br ${style.bg} border ${style.border} rounded-2xl overflow-hidden transition-all`}>

              {/* Main row */}
              <div className="px-4 py-3.5">
                <div className="flex items-start gap-3">
                  {/* Emoji */}
                  <div className="text-2xl flex-shrink-0 mt-0.5">{m.emoji}</div>

                  <div className="flex-1 min-w-0">
                    {/* Teams */}
                    <p className="text-white font-bold text-sm truncate">
                      {m.teamA} <span className="text-gray-500 font-normal">vs</span> {m.teamB}
                    </p>

                    {/* Mood badge + vibe */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${style.badge}`}>
                        {m.mood}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate">{m.tagline}</span>
                    </div>

                    {/* Watch meter */}
                    <div className="mt-2 max-w-[180px]">
                      <p className="text-[9px] text-gray-500 mb-1 flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" /> Watchability
                      </p>
                      <WatchMeter score={m.watchScore} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleBookmark(m.matchKey)}
                      className={`p-1.5 rounded-lg transition-colors ${isBookmarked ? 'text-amber-400 bg-amber-500/10' : 'text-gray-500 hover:text-amber-400 bg-gray-800/50'}`}
                      title={isBookmarked ? 'Bookmarked' : 'Bookmark'}>
                      {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setExpanded(isExpanded ? null : m.matchKey)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white bg-gray-800/50 transition-colors">
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-700/40 pt-3">
                  {/* Prob bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>{m.teamA} {m.probA}%</span>
                      <span>{m.teamB} {m.probB}%</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                      <div className="bg-emerald-500 rounded-l-full" style={{ width: `${m.probA}%` }} />
                      <div className="bg-blue-500 rounded-r-full" style={{ width: `${m.probB}%` }} />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-800/50 rounded-xl px-3 py-2">
                      <p className="text-[9px] text-gray-500 uppercase mb-0.5">Expected Score</p>
                      <p className="text-sm font-extrabold text-white">{m.expectedRuns}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl px-3 py-2">
                      <p className="text-[9px] text-gray-500 uppercase mb-0.5">Toss Impact</p>
                      <p className={`text-sm font-extrabold ${TOSS_COLOR[m.tossImpact]}`}>{m.tossImpact}</p>
                    </div>
                  </div>

                  {/* Why watch */}
                  {m.watchReasons.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1.5 flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" /> Why to watch
                      </p>
                      <ul className="space-y-1">
                        {m.watchReasons.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-300">
                            <span className="text-emerald-400 mt-0.5">·</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* AI prediction */}
                  {m.prediction && (
                    <p className="text-[11px] text-gray-400 italic border-l-2 border-purple-500/40 pl-2.5">{m.prediction}</p>
                  )}

                  {/* Bookmark CTA */}
                  <button onClick={() => toggleBookmark(m.matchKey)}
                    className={`w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl transition-all ${
                      isBookmarked
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-amber-500/10 hover:text-amber-300 border border-gray-700'
                    }`}>
                    {isBookmarked ? <><BookmarkCheck className="w-3.5 h-3.5" /> Bookmarked!</> : <><Bookmark className="w-3.5 h-3.5" /> {m.bookmarkLabel}</>}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Link href="/predictions" className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-emerald-400 mt-3 transition-colors">
        View all match moods <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  )
}
