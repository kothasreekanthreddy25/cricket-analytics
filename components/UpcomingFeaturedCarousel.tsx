'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Clock, ChevronLeft, ChevronRight, MapPin, Brain, Trophy, Calendar } from 'lucide-react'

interface UpcomingMatch {
  key: string
  name: string
  teamA: string
  teamB: string
  teamACode: string
  teamBCode: string
  tournament: string
  tournamentKey: string
  venue: string
  dateTimeGMT: string
  matchType: string
  status: string
}

function useCountdown(dateTimeGMT: string) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const target = new Date(dateTimeGMT).getTime()

    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) {
        setStarted(true)
        setTimeLeft(null)
        return
      }
      setStarted(false)
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ d, h, m, s })
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [dateTimeGMT])

  return { timeLeft, started }
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xl sm:text-2xl font-extrabold font-mono text-white tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  )
}

function Separator() {
  return <span className="text-gray-600 font-bold text-lg leading-none mb-3">:</span>
}

function MatchCard({ match }: { match: UpcomingMatch }) {
  const { timeLeft, started } = useCountdown(match.dateTimeGMT)

  const matchDate = new Date(match.dateTimeGMT)
  const dateStr = matchDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = matchDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <div className="flex-shrink-0 w-[300px] sm:w-[360px] bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-gray-800 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all">
      {/* Tournament header */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-gray-900 px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider truncate">
            {match.tournament || match.matchType}
          </span>
        </div>
        <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">{match.matchType}</span>
      </div>

      <div className="p-4">
        {/* Teams */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* Team A */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-2">
              <span className="text-sm font-extrabold text-white">{match.teamACode || match.teamA.slice(0, 3).toUpperCase()}</span>
            </div>
            <p className="text-xs font-bold text-white leading-tight">{match.teamA}</p>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-extrabold text-gray-500 bg-gray-800 px-2.5 py-1 rounded-lg">VS</span>
            {started && (
              <span className="text-[9px] text-red-400 font-bold animate-pulse">LIVE</span>
            )}
          </div>

          {/* Team B */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-2">
              <span className="text-sm font-extrabold text-white">{match.teamBCode || match.teamB.slice(0, 3).toUpperCase()}</span>
            </div>
            <p className="text-xs font-bold text-white leading-tight">{match.teamB}</p>
          </div>
        </div>

        {/* Countdown */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 mb-3">
          {started ? (
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-sm font-bold text-red-400">Match in Progress</span>
            </div>
          ) : timeLeft ? (
            <div>
              <div className="flex items-center gap-1.5 justify-center mb-2">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Starts in</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                {timeLeft.d > 0 && <><CountdownUnit value={timeLeft.d} label="Days" /><Separator /></>}
                <CountdownUnit value={timeLeft.h} label="Hrs" />
                <Separator />
                <CountdownUnit value={timeLeft.m} label="Min" />
                <Separator />
                <CountdownUnit value={timeLeft.s} label="Sec" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>Time not available</span>
            </div>
          )}
        </div>

        {/* Date + Venue */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-3 flex-wrap gap-1">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{dateStr} · {timeStr} IST</span>
          </div>
          {match.venue && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[130px]">{match.venue}</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/live/${match.key}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
        >
          <Brain className="w-3.5 h-3.5" />
          View AI Prediction
        </Link>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[300px] sm:w-[360px] bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-9 bg-gray-800 border-b border-gray-800" />
      <div className="p-4 space-y-4">
        <div className="flex justify-between gap-4 items-center">
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-800" />
            <div className="h-3 bg-gray-800 rounded w-16" />
          </div>
          <div className="w-10 h-8 bg-gray-800 rounded-lg" />
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-800" />
            <div className="h-3 bg-gray-800 rounded w-16" />
          </div>
        </div>
        <div className="h-20 bg-gray-800 rounded-xl" />
        <div className="h-4 bg-gray-800 rounded w-3/4" />
        <div className="h-9 bg-gray-800 rounded-xl" />
      </div>
    </div>
  )
}

export default function UpcomingFeaturedCarousel() {
  const [matches, setMatches] = useState<UpcomingMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        const all: UpcomingMatch[] = d.matches || []

        // Filter upcoming only, sort by date ascending
        const upcoming = all
          .filter(m => m.status === 'upcoming' && m.dateTimeGMT)
          .sort((a, b) => new Date(a.dateTimeGMT).getTime() - new Date(b.dateTimeGMT).getTime())

        // Max 1 per tournament
        const seenTournaments = new Set<string>()
        const deduped: UpcomingMatch[] = []
        for (const m of upcoming) {
          const tKey = m.tournamentKey || m.tournament || 'unknown'
          if (!seenTournaments.has(tKey)) {
            seenTournaments.add(tKey)
            deduped.push(m)
          }
          if (deduped.length >= 5) break
        }

        setMatches(deduped)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const cardWidth = 360 + 16

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'right' ? cardWidth : -cardWidth, behavior: 'smooth' })
    setCurrent(prev =>
      dir === 'right'
        ? Math.min(prev + 1, (loading ? 5 : matches.length) - 1)
        : Math.max(prev - 1, 0)
    )
  }

  const total = loading ? 5 : matches.length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Upcoming Matches
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Featured picks — one match per tournament with live countdown
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
          : matches.length > 0
            ? matches.map(m => (
                <div key={m.key} style={{ scrollSnapAlign: 'start' }}>
                  <MatchCard match={m} />
                </div>
              ))
            : (
              <div className="flex-1 flex items-center justify-center py-16 text-gray-500 text-sm">
                No upcoming matches found.
              </div>
            )
        }
      </div>

      {/* Dot indicators */}
      {!loading && matches.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {matches.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                scrollRef.current?.scrollTo({ left: i * cardWidth, behavior: 'smooth' })
                setCurrent(i)
              }}
              className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 bg-emerald-400' : 'w-1.5 bg-gray-700'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
