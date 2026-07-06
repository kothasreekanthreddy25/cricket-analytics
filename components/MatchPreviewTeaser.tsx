'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mic2, ArrowRight, MapPin, Trophy, Brain, Calendar } from 'lucide-react'

interface TeaserMatch {
  matchKey: string
  teamA: string
  teamB: string
  tournament: string
  format: string
  venue?: string
  round: string | null
  dateTimeGMT: string
  probA: number
  probB: number
}

function formatMatchDateTime(dateTimeGMT: string): string | null {
  if (!dateTimeGMT) return null
  const d = new Date(dateTimeGMT)
  if (isNaN(d.getTime())) return null
  const datePart = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
  return `${datePart} · ${timePart}`
}

export default function MatchPreviewTeaser() {
  const [matches, setMatches] = useState<TeaserMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ai/match-preview/teaser')
      .then(r => r.json())
      .then(d => { if (d.success) setMatches(d.matches || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-purple-400" />
            AI Match Preview
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Pitch report · Players to watch · Head-to-head · AI prediction
          </p>
        </div>
        <Link
          href="/preview"
          className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors flex items-center gap-1"
        >
          All previews <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 bg-gray-800/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? null : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map(m => (
            <Link
              key={m.matchKey}
              href={`/preview?match=${m.matchKey}`}
              className="group bg-gray-900 border border-gray-800 hover:border-purple-500/40 rounded-2xl p-4 transition-all hover:bg-gray-800/60"
            >
              {/* Tournament badge */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate">{m.round || m.tournament}</span>
                <span className="ml-auto text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{m.format}</span>
              </div>

              {/* Date + time */}
              <div className="flex items-center gap-1 mb-3 text-[10px] text-gray-500 h-3.5">
                {formatMatchDateTime(m.dateTimeGMT) && (
                  <><Calendar className="w-2.5 h-2.5" />{formatMatchDateTime(m.dateTimeGMT)}</>
                )}
              </div>

              {/* Teams */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex-1 text-center">
                  <p className="text-sm font-extrabold text-white leading-tight">{m.teamA}</p>
                  <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{m.probA}%</p>
                </div>
                <span className="text-xs font-bold text-gray-600 bg-gray-800 px-2 py-1 rounded-lg flex-shrink-0">VS</span>
                <div className="flex-1 text-center">
                  <p className="text-sm font-extrabold text-white leading-tight">{m.teamB}</p>
                  <p className="text-lg font-extrabold text-blue-400 mt-0.5">{m.probB}%</p>
                </div>
              </div>

              {/* Prob bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5 mb-3">
                <div className="bg-emerald-500 rounded-l-full" style={{ width: `${m.probA}%` }} />
                <div className="bg-blue-500 rounded-r-full" style={{ width: `${m.probB}%` }} />
              </div>

              {/* Venue + CTA */}
              <div className="flex items-center justify-between">
                {m.venue ? (
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 truncate mr-2">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{m.venue}
                  </span>
                ) : <span />}
                <span className="text-[11px] text-purple-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all flex-shrink-0">
                  <Brain className="w-3 h-3" />Full Preview <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
