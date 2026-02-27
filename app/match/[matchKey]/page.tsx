'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Radio, RefreshCw, Calendar, MapPin, Clock, Trophy, AlertCircle } from 'lucide-react'

interface BallEvent {
  ball: string
  runs: number
  extras?: number
  wicket?: boolean
  batsman?: string
  bowler?: string
  commentary?: string
}

interface MatchData {
  match: any
  ballByBall: any
  matchError: string | null
  ballByBallError: string | null
}

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const matchKey = (params?.matchKey ?? '') as string

  const [data, setData] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function fetchMatchData() {
    try {
      const res = await fetch(`/api/cricket/match/${matchKey}/live`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch match data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatchData()

    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchMatchData, 30000) // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [matchKey, autoRefresh])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading match data...</p>
        </div>
      </div>
    )
  }

  const hasMatchAccess = data?.match && !data?.matchError
  const hasBallByBallAccess = data?.ballByBall && !data?.ballByBallError

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {hasMatchAccess ? (
            <div>
              <h1 className="text-2xl font-bold">{data.match.data?.name || matchKey}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-blue-200 text-sm">
                {data.match.data?.venue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {data.match.data.venue}
                  </span>
                )}
                {data.match.data?.status && (
                  <span className="flex items-center gap-1">
                    <Radio className="w-4 h-4" />
                    {data.match.data.status}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold">
                {decodeURIComponent(matchKey).replace(/[-_]/g, ' ')}
              </h1>
              <p className="text-blue-200 text-sm mt-1">Tournament / Series Details</p>
            </div>
          )}

          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={fetchMatchData}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => setAutoRefresh(!autoRefresh)}
                className="rounded"
              />
              Auto-refresh (30s)
            </label>
            {lastUpdated && (
              <span className="text-blue-300 text-xs">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Scorecard */}
        {hasMatchAccess && data.match.data?.score && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Scorecard
            </h2>
            <div className="space-y-4">
              {Array.isArray(data.match.data.score) ? (
                data.match.data.score.map((s: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-bold text-gray-900">{s.team || s.name || `Team ${i + 1}`}</p>
                      <p className="text-sm text-gray-500">{s.inning || ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {s.r || s.runs || s.score || '-'}/{s.w || s.wickets || '-'}
                      </p>
                      <p className="text-sm text-gray-500">
                        ({s.o || s.overs || '-'} ov)
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <pre className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg overflow-auto">
                  {JSON.stringify(data.match.data.score, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Ball by Ball */}
        {hasBallByBallAccess ? (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500" />
              Ball by Ball Commentary
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {data.ballByBall.data ? (
                <pre className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg overflow-auto">
                  {JSON.stringify(data.ballByBall.data, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-500">No ball-by-ball data available yet.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-yellow-800">Match Details Restricted</h3>
                <p className="text-yellow-700 text-sm mt-1">
                  Ball-by-ball and detailed match data requires a higher Roanuz API plan.
                  {data?.matchError && (
                    <span className="block mt-1 text-xs text-yellow-600">
                      Error: {data.matchError}
                    </span>
                  )}
                </p>
                <p className="text-yellow-700 text-sm mt-2">
                  Upgrade your plan at{' '}
                  <a
                    href="https://sports.roanuz.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    sports.roanuz.com
                  </a>
                  {' '}to access live scores, ball-by-ball commentary, odds, and player stats.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Raw Match Data for debugging */}
        {hasMatchAccess && (
          <details className="bg-white rounded-xl shadow-sm border p-6">
            <summary className="cursor-pointer font-medium text-gray-700">
              Raw Match Data
            </summary>
            <pre className="mt-4 text-xs text-gray-600 bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
              {JSON.stringify(data.match, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
