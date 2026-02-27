'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Brain, Home, Handshake } from 'lucide-react'

interface H2HMatch {
  key: string
  name: string
  date: string | null
  venue: string | null
  winner: string | null
  teamAScore: string | null
  teamBScore: string | null
  teamAName: string | null
  teamBName: string | null
  resultText: string | null
}

interface H2HSummary {
  teamA: string
  teamB: string
  teamAWins: number
  teamBWins: number
  noResult: number
  totalMatches: number
  matches: H2HMatch[]
}

interface Player {
  name: string
  role: string
  reason: string
  impact: 'high' | 'medium' | 'low'
  stats?: {
    runs?: number
    wickets?: number
    strikeRate?: number
    economy?: number
    catches?: number
    ranking?: { category: string; rank: number }
  }
}

interface Analysis {
  matchKey: string
  teamA: string
  teamB: string
  winProbabilityA: number
  winProbabilityB: number
  confidence: 'high' | 'medium' | 'low'
  tips: string[]
  playersToWatch: {
    teamA: Player[]
    teamB: Player[]
  }
  conditions: {
    venue: string
    pitchType: string
    weatherImpact: string
    tossAdvice: string
  }
  recentForm: {
    teamA: { wins: number; losses: number; trend: string }
    teamB: { wins: number; losses: number; trend: string }
  }
  reasoning: string
}

function PlayerCard({ player, accent }: { player: Player; accent: 'blue' | 'red' }) {
  const impactDot =
    player.impact === 'high'
      ? 'bg-emerald-400'
      : player.impact === 'medium'
      ? 'bg-yellow-400'
      : 'bg-gray-500'
  const roleBadge =
    accent === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${impactDot}`} />
          <span className="font-semibold text-white">{player.name}</span>
        </div>
        <span className={`text-xs ${roleBadge} px-2 py-0.5 rounded`}>{player.role}</span>
      </div>

      {player.stats && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {player.stats.runs != null && (
            <span className="text-xs bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full">
              {player.stats.runs} runs
            </span>
          )}
          {player.stats.wickets != null && (
            <span className="text-xs bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-full">
              {player.stats.wickets} wkts
            </span>
          )}
          {player.stats.strikeRate != null && (
            <span className="text-xs bg-orange-500/15 text-orange-300 px-2 py-0.5 rounded-full">
              SR {player.stats.strikeRate}
            </span>
          )}
          {player.stats.economy != null && (
            <span className="text-xs bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-full">
              Econ {player.stats.economy}
            </span>
          )}
          {player.stats.catches != null && (
            <span className="text-xs bg-yellow-500/15 text-yellow-300 px-2 py-0.5 rounded-full">
              {player.stats.catches} catches
            </span>
          )}
          {player.stats.ranking && (
            <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
              #{player.stats.ranking.rank} {player.stats.ranking.category}
            </span>
          )}
        </div>
      )}

      <p className="text-sm text-gray-400">{player.reason}</p>
    </div>
  )
}

export default function AnalysisPage() {
  const searchParams = useSearchParams()
  const [selectedMatch, setSelectedMatch] = useState<string>('')
  const [matchName, setMatchName] = useState<string>('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [h2h, setH2h] = useState<H2HSummary | null>(null)
  const [h2hLoading, setH2hLoading] = useState(false)
  const [h2hError, setH2hError] = useState<string | null>(null)
  const [h2hRaw, setH2hRaw] = useState<any>(null)

  const matchParam = searchParams?.get('match') ?? null

  useEffect(() => {
    if (matchParam && matchParam !== selectedMatch) {
      runAnalysis(matchParam)
    }
  }, [matchParam])

  async function fetchH2H(matchKey: string, teamA: string, teamB: string) {
    setH2hLoading(true)
    setH2h(null)
    setH2hError(null)
    setH2hRaw(null)
    try {
      const res = await fetch(
        `/api/analysis/insights?match=${encodeURIComponent(matchKey)}&teamA=${encodeURIComponent(teamA)}&teamB=${encodeURIComponent(teamB)}`
      )
      const data = await res.json()
      console.log('[H2H] raw API response:', JSON.stringify(data, null, 2))
      setH2hRaw(data.raw)
      if (data.h2h) {
        setH2h(data.h2h)
      } else if (!res.ok) {
        setH2hError(data.detail || data.error || 'Insights API error')
      } else {
        setH2hError('No H2H data found in API response')
      }
    } catch (err: any) {
      setH2hError(err.message || 'Failed to fetch H2H data')
    } finally {
      setH2hLoading(false)
    }
  }

  async function runAnalysis(matchKey: string) {
    setSelectedMatch(matchKey)
    setLoading(true)
    setError(null)
    setAnalysis(null)
    setH2h(null)
    setH2hError(null)
    setH2hRaw(null)

    try {
      const res = await fetch(`/api/analysis?match=${encodeURIComponent(matchKey)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Analysis failed')
      }

      setAnalysis(data.analysis)
      if (data.analysis?.teamA && data.analysis?.teamB) {
        setMatchName(`${data.analysis.teamA} vs ${data.analysis.teamB}`)
        // Fetch H2H in parallel after we know team names
        fetchH2H(matchKey, data.analysis.teamA, data.analysis.teamB)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run analysis')
    } finally {
      setLoading(false)
    }
  }

  const confidenceColor = {
    high: 'text-green-400 bg-green-400/10 border-green-400/30',
    medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    low: 'text-red-400 bg-red-400/10 border-red-400/30',
  }

  // ── No match selected — direct users to pick one from home ──
  if (!matchParam && !loading && !analysis) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-6">
            <Brain className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">No Match Selected</h1>
          <p className="text-gray-400 mb-8">
            To view AI analysis, go to the home page and select a match from the
            upcoming matches section.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              AI Match Analysis
            </h1>
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-500/30">
              T20 World Cup 2026
            </span>
          </div>
          {matchName && (
            <p className="text-gray-400 font-medium">{matchName}</p>
          )}
          {!matchName && loading && (
            <p className="text-gray-500 text-sm">Loading analysis...</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-8">
            <p className="text-red-400">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-red-300 hover:text-red-200 text-sm mt-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back and select another match
            </Link>
          </div>
        )}

        {/* Loading Animation */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-700 rounded-full" />
              <div className="w-16 h-16 border-4 border-transparent border-t-purple-500 rounded-full animate-spin absolute top-0" />
            </div>
            <p className="text-gray-400">Running TensorFlow.js model...</p>
            <p className="text-gray-600 text-sm">
              Analyzing team strength, form, and conditions
            </p>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && !loading && (
          <div className="space-y-6">
            {/* Win Probability Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Win Probability</h2>
                  <p className="text-sm text-gray-500 mt-1">ICC T20 World Cup 2026</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    confidenceColor[analysis.confidence]
                  }`}
                >
                  {analysis.confidence.toUpperCase()} Confidence
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Team A */}
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{analysis.teamA}</p>
                  <p className="text-4xl font-black mt-2">{analysis.winProbabilityA}%</p>
                </div>

                {/* VS bar */}
                <div className="text-center">
                  <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-l-full transition-all duration-1000"
                      style={{ width: `${analysis.winProbabilityA}%` }}
                    />
                    <div
                      className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-red-400 rounded-r-full transition-all duration-1000"
                      style={{ width: `${analysis.winProbabilityB}%` }}
                    />
                  </div>
                  <p className="text-gray-500 text-sm mt-2">VS</p>
                </div>

                {/* Team B */}
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{analysis.teamB}</p>
                  <p className="text-4xl font-black mt-2">{analysis.winProbabilityB}%</p>
                </div>
              </div>
            </div>

            {/* ── Recent H2H — compact stats bar ── */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              {/* Loading skeleton */}
              {h2hLoading && (
                <div className="h-10 bg-gray-800 rounded-lg animate-pulse" />
              )}

              {/* Error — subtle one-liner */}
              {!h2hLoading && h2hError && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Handshake className="w-4 h-4 text-gray-600" />
                  <span>H2H stats unavailable</span>
                </div>
              )}

              {/* Compact H2H stats bar */}
              {!h2hLoading && h2h && (
                <div className="flex items-center gap-3">
                  {/* Icon + label */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Handshake className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-semibold text-gray-300">H2H</span>
                  </div>

                  {/* Team A wins */}
                  <span className="text-sm font-bold text-blue-400 shrink-0">
                    {analysis?.teamA} {h2h.teamAWins}
                  </span>

                  {/* Progress bar */}
                  <div className="flex-1 flex rounded-full overflow-hidden h-2 bg-gray-800">
                    <div
                      className="bg-blue-500 transition-all duration-700"
                      style={{ width: h2h.totalMatches > 0 ? `${(h2h.teamAWins / h2h.totalMatches) * 100}%` : '50%' }}
                    />
                    {h2h.noResult > 0 && (
                      <div
                        className="bg-gray-500 transition-all duration-700"
                        style={{ width: `${(h2h.noResult / h2h.totalMatches) * 100}%` }}
                      />
                    )}
                    <div
                      className="bg-red-500 transition-all duration-700"
                      style={{ width: h2h.totalMatches > 0 ? `${(h2h.teamBWins / h2h.totalMatches) * 100}%` : '50%' }}
                    />
                  </div>

                  {/* Team B wins */}
                  <span className="text-sm font-bold text-red-400 shrink-0">
                    {h2h.teamBWins} {analysis?.teamB}
                  </span>

                  {/* Match count + draw */}
                  <span className="text-xs text-gray-500 shrink-0">
                    ({h2h.matches.length} match{h2h.matches.length !== 1 ? 'es' : ''}{h2h.noResult > 0 ? `, ${h2h.noResult} NR` : ''})
                  </span>
                </div>
              )}
            </div>

            {/* Match Tips */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4">Match Tips</h2>
              <div className="space-y-3">
                {analysis.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-gray-300">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Players to Watch */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team A Players */}
              <div className="bg-gray-900 rounded-xl border border-blue-900/50 p-6">
                <h3 className="text-lg font-bold text-blue-400 mb-4">
                  {analysis.teamA} — Key Players
                </h3>
                <div className="space-y-3">
                  {analysis.playersToWatch.teamA.map((player, i) => (
                    <PlayerCard key={i} player={player} accent="blue" />
                  ))}
                </div>
              </div>

              {/* Team B Players */}
              <div className="bg-gray-900 rounded-xl border border-red-900/50 p-6">
                <h3 className="text-lg font-bold text-red-400 mb-4">
                  {analysis.teamB} — Key Players
                </h3>
                <div className="space-y-3">
                  {analysis.playersToWatch.teamB.map((player, i) => (
                    <PlayerCard key={i} player={player} accent="red" />
                  ))}
                </div>
              </div>
            </div>

            {/* Conditions & Recent Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-bold mb-4">Match Conditions</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Venue</p>
                    <p className="text-gray-200">{analysis.conditions.venue}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pitch</p>
                    <p className="text-gray-200">{analysis.conditions.pitchType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Weather</p>
                    <p className="text-gray-200">{analysis.conditions.weatherImpact}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Toss Advice</p>
                    <p className="text-yellow-300">{analysis.conditions.tossAdvice}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-bold mb-4">Recent Form (Last 7 matches)</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-400 font-semibold">{analysis.teamA}</span>
                      <span className="text-sm">
                        <span className="text-green-400">{analysis.recentForm.teamA.wins}W</span>
                        {' - '}
                        <span className="text-red-400">{analysis.recentForm.teamA.losses}L</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                        style={{ width: `${(analysis.recentForm.teamA.wins / 7) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{analysis.recentForm.teamA.trend}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-red-400 font-semibold">{analysis.teamB}</span>
                      <span className="text-sm">
                        <span className="text-green-400">{analysis.recentForm.teamB.wins}W</span>
                        {' - '}
                        <span className="text-red-400">{analysis.recentForm.teamB.losses}L</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                        style={{ width: `${(analysis.recentForm.teamB.wins / 7) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{analysis.recentForm.teamB.trend}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="bg-gray-900 rounded-xl border border-purple-900/50 p-6">
              <h3 className="text-lg font-bold mb-3 text-purple-400">AI Analysis Reasoning</h3>
              <div
                className="text-gray-300 leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: analysis.reasoning.replace(
                    /\*\*(.*?)\*\*/g,
                    '<strong class="text-white">$1</strong>'
                  ),
                }}
              />
            </div>

            {/* Disclaimer */}
            <div className="text-center text-gray-600 text-xs py-4">
              Predictions are generated by a TensorFlow.js neural network model and are for
              informational purposes only. Past performance does not guarantee future results.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
