'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Clock, MapPin, Users, Radio } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import LiveAICommentary from '@/components/LiveAICommentary'

interface MatchDetails {
  matchInfo: any
  scorecard: any
}

export default function MatchDetailPage() {
  const params = useParams()
  const matchId = (params?.id ?? '') as string

  const [match, setMatch] = useState<MatchDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMatchDetails()
    const interval = setInterval(fetchMatchDetails, 30000)
    return () => clearInterval(interval)
  }, [matchId])

  async function fetchMatchDetails() {
    try {
      const response = await fetch(`/api/matches/${matchId}`)
      const data = await response.json()
      if (data.success) { setMatch(data.data); setError(null) }
      else setError('Failed to fetch match details')
    } catch { setError('Error loading match details') }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-5xl mx-auto px-4 animate-pulse space-y-4">
        <div className="h-6 bg-gray-800 rounded w-32" />
        <div className="h-40 bg-gray-800 rounded-2xl" />
        <div className="h-96 bg-gray-800 rounded-2xl" />
      </div>
    </div>
  )

  if (error || !match) return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <Link href="/matches" className="inline-flex items-center text-gray-400 hover:text-white mb-6 text-sm gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Matches
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
          <p className="text-red-400">{error || 'Match not found'}</p>
        </div>
      </div>
    </div>
  )

  const { matchInfo, scorecard } = match
  const isLive = ['live', 'started', 'in progress'].some(s =>
    matchInfo?.status?.toLowerCase().includes(s)
  )

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        <Link href="/matches" className="inline-flex items-center text-gray-400 hover:text-white text-sm gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Matches
        </Link>

        {/* Match Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <h1 className="text-xl font-bold text-white leading-tight">
              {matchInfo?.name || 'Match Details'}
            </h1>
            <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              isLive
                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}>
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              {matchInfo?.status || 'Upcoming'}
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{matchInfo?.venue || 'Venue TBD'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{matchInfo?.dateTimeGMT ? formatDateTime(matchInfo.dateTimeGMT) : 'Time TBD'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span>{matchInfo?.matchType || 'Format TBD'}</span>
            </div>
          </div>
        </div>

        {/* ── Live AI Commentary — ONLY shown during live matches ── */}
        {isLive && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white">Live AI Commentary</h2>
              <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">LIVE</span>
            </div>
            <LiveAICommentary matchKey={matchId} />
          </div>
        )}

        {/* Scorecard */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-5">Scorecard</h2>
          {scorecard ? (
            <pre className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl overflow-auto text-xs text-gray-300">
              {JSON.stringify(scorecard, null, 2)}
            </pre>
          ) : (
            <div className="text-center py-12 text-gray-500 text-sm">
              Scorecard not available yet
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
