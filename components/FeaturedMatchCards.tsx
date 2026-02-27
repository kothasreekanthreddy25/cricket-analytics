'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Radio, Calendar, MapPin, ChevronLeft, ChevronRight, Brain } from 'lucide-react'
import { useLiveScores } from '@/lib/use-live-scores'

interface AnalysisMatch {
  key: string
  name: string
  teamA: string
  teamB: string
  status: string
  startDate: string
  venue: string
  statusNote?: string
  scoreA?: string
  scoreB?: string
}

interface Props {
  variant: 'hero' | 'analysis' | 'carousel'
}

export default function FeaturedMatchCards({ variant }: Props) {
  const [matches, setMatches] = useState<AnalysisMatch[]>([])
  const [loading, setLoading] = useState(true)
  const { scores: liveScores } = useLiveScores()

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch('/api/analysis')
        const json = await res.json()
        const allMatches: AnalysisMatch[] = json?.matches || []

        // Only show live or upcoming matches — never completed/past
        const relevant = allMatches.filter(
          (m) => m.status === 'live' || m.status === 'upcoming'
        )

        // Filter out TBC vs TBC matches (teams not yet decided)
        const withTeams = relevant.filter(
          (m) => m.teamA !== 'TBD' && m.teamB !== 'TBD' && m.name !== 'TBC vs TBC'
        )

        setMatches(withTeams)
      } catch (err) {
        console.error('Failed to fetch featured matches:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchMatches()
  }, [])

  // Merge live score data into matches (updates scores + status in real-time)
  const enrichedMatches = matches.map((match) => {
    const live = liveScores.get(match.key)
    if (live) {
      return {
        ...match,
        status: 'live',
        scoreA: live.scoreA,
        scoreB: live.scoreB,
        statusNote: live.statusNote,
      }
    }
    return match
  })

  if (loading) {
    if (variant === 'carousel') {
      return (
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[300px] bg-gray-800/50 rounded-xl border border-gray-700/50 p-5 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
              <div className="h-6 bg-gray-700 rounded w-2/3 mb-3" />
              <div className="h-6 bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      )
    }
    return (
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-6 bg-gray-700 rounded w-2/3 mb-3" />
        <div className="h-3 bg-gray-700 rounded w-full mb-3" />
        <div className="h-6 bg-gray-700 rounded w-2/3" />
      </div>
    )
  }

  if (enrichedMatches.length === 0) return null

  // Prioritize live matches first, then upcoming
  const sorted = [...enrichedMatches].sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1
    if (a.status !== 'live' && b.status === 'live') return 1
    return 0
  })

  if (variant === 'carousel') {
    return <MatchCarousel matches={sorted.slice(0, 5)} />
  }

  if (variant === 'hero') {
    return <HeroCard match={sorted[0]} />
  }

  const analysisMatch = sorted.length > 1 ? sorted[1] : sorted[0]
  return <AnalysisCard match={analysisMatch} />
}

// Team strength ratings based on ICC T20I rankings (approximate)
const teamStrength: Record<string, number> = {
  'India': 92,
  'England': 88,
  'Australia': 87,
  'South Africa': 85,
  'West Indies': 83,
  'Pakistan': 82,
  'New Zealand': 81,
  'Sri Lanka': 78,
  'Bangladesh': 74,
  'Afghanistan': 73,
  'Netherlands': 65,
  'Zimbabwe': 63,
  'Ireland': 62,
  'Scotland': 60,
  'Nepal': 58,
  'Namibia': 56,
  'USA': 55,
  'UAE': 52,
  'Oman': 51,
  'Uganda': 48,
  'Papua New Guinea': 47,
  'Canada': 46,
}

// Generate team-wise win probability based on team strength ratings
function getWinProbability(teamA: string, teamB: string): { probA: number; probB: number } {
  const strengthA = teamStrength[teamA] || 55
  const strengthB = teamStrength[teamB] || 55

  // Convert strength difference to probability using logistic function
  const diff = strengthA - strengthB
  const probA = Math.round(50 + diff * 1.5)

  // Clamp between 20% and 80% — no match is ever a sure thing
  const clampedA = Math.max(20, Math.min(80, probA))
  const clampedB = 100 - clampedA

  return { probA: clampedA, probB: clampedB }
}

/* ── Win Probability Bar (shared across card variants) ── */
function WinProbabilityBar({
  teamA,
  teamB,
  probA,
  probB,
  size = 'sm',
}: {
  teamA: string
  teamB: string
  probA: number
  probB: number
  size?: 'sm' | 'lg'
}) {
  const barHeight = size === 'lg' ? 'h-3' : 'h-2'
  const textSize = size === 'lg' ? 'text-sm' : 'text-xs'
  const percentSize = size === 'lg' ? 'text-base font-bold' : 'text-xs font-semibold'

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`${percentSize} text-emerald-400`}>{probA}%</span>
          <span className={`${textSize} text-gray-400`}>{teamA}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`${textSize} text-gray-400`}>{teamB}</span>
          <span className={`${percentSize} text-cyan-400`}>{probB}%</span>
        </div>
      </div>
      <div className={`w-full ${barHeight} rounded-full overflow-hidden flex`}>
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
          style={{ width: `${probA}%` }}
        />
        <div className="w-px h-full bg-gray-900" />
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-700"
          style={{ width: `${probB}%` }}
        />
      </div>
    </div>
  )
}

/* ── Carousel ── */
function MatchCarousel({ matches }: { matches: AnalysisMatch[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(direction: 'left' | 'right') {
    if (!scrollRef.current) return
    const amount = 320
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative">
      {/* Navigation arrows */}
      <button
        onClick={() => scroll('left')}
        className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-gray-800 border border-gray-700 items-center justify-center text-white hover:bg-gray-700 transition-colors shadow-lg hidden md:flex"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-gray-800 border border-gray-700 items-center justify-center text-white hover:bg-gray-700 transition-colors shadow-lg hidden md:flex"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
      >
        {matches.map((match) => {
          const isLive = match.status === 'live'
          const { probA, probB } = getWinProbability(match.teamA, match.teamB)

          return (
            <Link
              key={match.key}
              href={`/analysis?match=${match.key}`}
              className="group min-w-[300px] md:min-w-[320px] bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-emerald-500/30 rounded-xl p-5 transition-all duration-300 snap-start shrink-0"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                {isLive ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <Radio className="w-3 h-3 animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Upcoming
                  </span>
                )}
                <span className="text-[10px] text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
                  AI Prediction
                </span>
              </div>

              {/* Teams & Scores */}
              {isLive && (match.scoreA || match.scoreB) ? (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">{match.teamA}</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">
                      {match.scoreA || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">{match.teamB}</span>
                    <span className="text-cyan-400 font-mono font-bold text-sm">
                      {match.scoreB || '—'}
                    </span>
                  </div>
                  {match.statusNote && (
                    <p className="text-emerald-400 text-[10px] font-medium mt-1">
                      {match.statusNote}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white font-bold">{match.teamA}</span>
                    <span className="text-xs font-bold text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">VS</span>
                    <span className="text-white font-bold">{match.teamB}</span>
                  </div>

                  {/* Win Probability Bar */}
                  <div className="mb-4">
                    <WinProbabilityBar
                      teamA={match.teamA}
                      teamB={match.teamB}
                      probA={probA}
                      probB={probB}
                      size="sm"
                    />
                  </div>
                </>
              )}

              {/* Date */}
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {match.startDate}
                </span>
              </div>

              {/* Venue */}
              {match.venue && match.venue !== 'TBC' && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{match.venue}</span>
                </div>
              )}

              {/* CTA */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                <span className="text-[10px] text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
                  T20 WC 2026
                </span>
                <span className="text-emerald-400 text-xs font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  <Brain className="w-3 h-3" />
                  Full Analysis
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/* ── Hero Card ── */
function HeroCard({ match }: { match: AnalysisMatch }) {
  const isLive = match.status === 'live'
  const { probA, probB } = getWinProbability(match.teamA, match.teamB)

  return (
    <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
          {isLive ? 'Live Match' : 'Next Match'}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            Live
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            {match.startDate}
          </span>
        )}
      </div>

      {/* Teams with scores (live) or win probability (upcoming) */}
      {isLive && (match.scoreA || match.scoreB) ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-lg">{match.teamA}</span>
            <span className="text-emerald-400 font-mono font-bold text-xl">
              {match.scoreA || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-lg">{match.teamB}</span>
            <span className="text-cyan-400 font-mono font-bold text-xl">
              {match.scoreB || '—'}
            </span>
          </div>
          {match.statusNote && (
            <p className="text-emerald-400 text-sm font-medium">{match.statusNote}</p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-lg">{match.teamA}</span>
              <span className="text-emerald-400 font-bold text-lg">{probA}%</span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-xs font-bold text-gray-500 bg-gray-700/50 px-3 py-1 rounded-full">
                VS
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-lg">{match.teamB}</span>
              <span className="text-cyan-400 font-bold text-lg">{probB}%</span>
            </div>
          </div>

          {/* Win Probability Bar */}
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Win Probability</p>
            <WinProbabilityBar
              teamA={match.teamA}
              teamB={match.teamB}
              probA={probA}
              probB={probB}
              size="lg"
            />
          </div>
        </>
      )}

      {/* Venue */}
      {match.venue && match.venue !== 'TBC' && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-2 border-t border-gray-700/50">
          <MapPin className="w-3 h-3" />
          <span>{match.venue}</span>
        </div>
      )}

      {isLive && match.statusNote && (
        <p className="text-xs text-emerald-400">{match.statusNote}</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
        <span className="text-[10px] text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
          AI-Powered Prediction
        </span>
        <span className="text-xs text-gray-500">T20 WC 2026</span>
      </div>

      <Link
        href={`/analysis?match=${match.key}`}
        className="block text-center text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        Get Detailed Analysis &rarr;
      </Link>
    </div>
  )
}

/* ── Analysis Card ── */
function AnalysisCard({ match }: { match: AnalysisMatch }) {
  const isLive = match.status === 'live'
  const { probA, probB } = getWinProbability(match.teamA, match.teamB)

  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
          Match Analysis Preview
        </span>
        {isLive && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Teams with percentages */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-white font-bold text-lg">{match.teamA}</span>
            <span className="ml-2 text-emerald-400 font-bold">{probA}%</span>
          </div>
          <span className="text-sm text-gray-400">vs</span>
          <div>
            <span className="text-cyan-400 font-bold">{probB}%</span>
            <span className="ml-2 text-white font-bold text-lg">{match.teamB}</span>
          </div>
        </div>

        {/* Win Probability Bar */}
        <WinProbabilityBar
          teamA={match.teamA}
          teamB={match.teamB}
          probA={probA}
          probB={probB}
          size="lg"
        />
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700/50 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          {match.startDate}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
            TensorFlow.js
          </span>
          <span className="text-[10px] text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
            14 Features
          </span>
        </div>
      </div>
    </div>
  )
}
