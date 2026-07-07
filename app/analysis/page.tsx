'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Brain, Home, Mic2, MapPin, Droplets, Target, Star, User,
  History, Calendar, Trophy, AlertTriangle, Shield, TrendingUp, Zap,
  CheckCircle2, ListChecks, Database,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface PitchReport {
  venue: string; surface: string; type: string; avgFirstInnings: number
  chaseSuccessRate: number; dew: string; expectedBehavior: string
  tossAdvantage: 'BAT' | 'BOWL'; tossReason: string
}
interface RichPlayer {
  name: string; team: string; role: string; reason: string; keyStats: string | string[]; threat: 'HIGH' | 'MEDIUM'; impactScore?: number
}
interface TeamHistory {
  totalMeetings: number; teamAWins: number; teamBWins: number
  lastResult: string; currentStreak: string; keyRivalryFact: string
}
interface RecentFormSide { last5: string; trend: string; avgScore: number }
interface RecentForm { teamA: RecentFormSide; teamB: RecentFormSide }
interface Prediction {
  winner: string; confidence: string; margin: string; winnerProbPct: number
  keyFactor: string; xFactor: string
}
interface DataSources { squads: string; playerStats: string; winProbability: string; pitchAndNarrative: string }

interface Analysis {
  matchKey: string
  teamA: string
  teamB: string
  tournament: string
  format: string
  venue: string
  startAt: string | null
  winProbabilityA: number
  winProbabilityB: number
  confidence: 'high' | 'medium' | 'low'
  tips: string[]
  reasoning: string
  pitchReport?: PitchReport
  playersToWatch?: RichPlayer[]
  teamHistory?: TeamHistory
  recentForm?: RecentForm
  prediction?: Prediction
  commentatorIntro?: string
  commentatorSource?: string
  lineupSource?: { teamA: string | null; teamB: string | null }
  lineupConfirmed?: { teamA: boolean; teamB: boolean }
  dataSources?: DataSources
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

function FormBadge({ result }: { result: string }) {
  const cls = result === 'W' ? 'bg-emerald-500 text-white' : result === 'L' ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-300'
  return <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${cls}`}>{result}</span>
}

function keyStatsList(k: string | string[] | undefined): string[] {
  if (!k) return []
  return Array.isArray(k) ? k : [k]
}

function ImpactScore({ score }: { score?: number }) {
  if (score == null) return null
  const color = score >= 85 ? 'text-emerald-400' : score >= 65 ? 'text-amber-400' : 'text-gray-400'
  const barColor = score >= 85 ? 'bg-emerald-500' : score >= 65 ? 'bg-amber-500' : 'bg-gray-500'
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="w-14 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-extrabold font-mono ${color}`}>{score}/100</span>
    </div>
  )
}

function LineupBadge({ confirmed, hasSource }: { confirmed?: boolean; hasSource: boolean }) {
  if (confirmed) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full mb-2">
        <CheckCircle2 className="w-3 h-3" /> Confirmed Playing XI
      </span>
    )
  }
  if (hasSource) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full mb-2">
        <ListChecks className="w-3 h-3" /> Predicted Playing XI
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full mb-2">
      🤖 AI Estimate — confirm closer to match time
    </span>
  )
}

function PlayerCard({ player }: { player: RichPlayer }) {
  const roleColor: Record<string, string> = {
    BAT: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    BOWL: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    AR: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    WK: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  }
  const stats = keyStatsList(player.keyStats)
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-gray-600 flex items-center justify-center flex-shrink-0">
        <User className="w-5 h-5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white">{player.name}</p>
            {player.threat === 'HIGH' && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${roleColor[player.role] || roleColor.BAT}`}>{player.role}</span>
          </div>
          <ImpactScore score={player.impactScore} />
        </div>
        <p className="text-sm text-gray-400 mt-1 leading-relaxed">{player.reason}</p>
        {stats.length > 0 && (
          <ul className="mt-2 space-y-1">
            {stats.map((s, i) => (
              <li key={i} className="text-xs text-emerald-400 font-medium flex items-start gap-1.5">
                <span className="text-emerald-600 mt-0.5">▸</span>{s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function AnalysisContent() {
  const searchParams = useSearchParams()
  const [selectedMatch, setSelectedMatch] = useState<string>('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matchParam = searchParams?.get('match') ?? null

  useEffect(() => {
    if (matchParam && matchParam !== selectedMatch) {
      runAnalysis(matchParam)
    }
  }, [matchParam])

  async function runAnalysis(matchKey: string) {
    setSelectedMatch(matchKey)
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const res = await fetch(`/api/analysis?match=${encodeURIComponent(matchKey)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Analysis failed')
      }

      setAnalysis(data.analysis)
    } catch (err: any) {
      setError(err.message || 'Failed to run analysis')
    } finally {
      setLoading(false)
    }
  }

  const confidenceColor: Record<string, string> = {
    high: 'text-green-400 bg-green-400/10 border-green-400/30',
    medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    low: 'text-red-400 bg-red-400/10 border-red-400/30',
  }
  const PITCH_ICON: Record<string, React.ReactNode> = {
    'Spin-friendly': <Zap className="w-4 h-4 text-amber-400" />,
    'Batting paradise': <TrendingUp className="w-4 h-4 text-emerald-400" />,
    'Pace-friendly': <Zap className="w-4 h-4 text-blue-400" />,
    'Balanced': <Shield className="w-4 h-4 text-purple-400" />,
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

  const h = analysis?.teamHistory
  const form = analysis?.recentForm
  const pitch = analysis?.pitchReport
  const pred = analysis?.prediction
  const players = analysis?.playersToWatch || []

  const formChartData = form && analysis ? [
    { name: analysis.teamA.split(' ').slice(-1)[0], avg: form.teamA.avgScore, fill: '#10b981' },
    { name: analysis.teamB.split(' ').slice(-1)[0], avg: form.teamB.avgScore, fill: '#3b82f6' },
  ] : []

  const h2hChartData = h && analysis ? [
    { name: analysis.teamA.split(' ').slice(-1)[0], wins: h.teamAWins, fill: '#10b981' },
    { name: analysis.teamB.split(' ').slice(-1)[0], wins: h.teamBWins, fill: '#3b82f6' },
  ] : []

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              AI Match Analysis
            </h1>
            {analysis?.tournament && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-500/30">
                {analysis.tournament}
              </span>
            )}
            {analysis?.format && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full border border-gray-700">
                {analysis.format}
              </span>
            )}
          </div>
          {analysis && (
            <>
              <p className="text-gray-300 font-semibold text-lg">{analysis.teamA} vs {analysis.teamB}</p>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                {analysis.startAt && (
                  <p className="text-gray-500 text-sm flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(analysis.startAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                )}
                {analysis.venue && (
                  <p className="text-gray-500 text-sm flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {analysis.venue}
                  </p>
                )}
              </div>
              {analysis.dataSources && (
                <div className="flex items-center gap-1.5 flex-wrap mt-3">
                  <Database className="w-3 h-3 text-gray-600 flex-shrink-0" />
                  {[
                    ['Squads', analysis.dataSources.squads],
                    ['Stats', analysis.dataSources.playerStats],
                    ['Predictions', analysis.dataSources.winProbability],
                  ].map(([label, source]) => (
                    <span key={label} className="text-[10px] text-gray-500 bg-gray-800/80 border border-gray-700/60 px-1.5 py-0.5 rounded">
                      {label}: <span className="text-gray-400 font-medium">{source}</span>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
          {!analysis && loading && (
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
            <p className="text-gray-400">Analyzing team strength, form, and conditions...</p>
            <p className="text-gray-600 text-sm">Pulling pitch reports and player data from GPT-4o + Gemini</p>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && !loading && (
          <div className="space-y-6">
            {/* Win Probability Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Win Probability</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${confidenceColor[analysis.confidence]}`}>
                  {analysis.confidence.toUpperCase()} Confidence
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{analysis.teamA}</p>
                  <p className="text-4xl font-black mt-2">{analysis.winProbabilityA}%</p>
                </div>
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
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{analysis.teamB}</p>
                  <p className="text-4xl font-black mt-2">{analysis.winProbabilityB}%</p>
                </div>
              </div>
            </div>

            {/* Commentator intro */}
            {analysis.commentatorIntro && (
              <div className="bg-gray-900 rounded-xl border border-purple-900/40 p-5 bg-purple-500/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Mic2 className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-gray-200 leading-relaxed italic">"{analysis.commentatorIntro}"</p>
                    {analysis.commentatorSource && (
                      <p className="text-xs text-gray-600 mt-2">— {analysis.commentatorSource}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Why each team could win */}
            {pred?.winner && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-xl font-bold mb-4">Why {pred.winner} Could Win</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-gray-800/50 rounded-xl px-4 py-4">
                    <Target className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Key Factor</p>
                      <p className="text-sm text-gray-200">{pred.keyFactor}</p>
                    </div>
                  </div>
                  {pred.xFactor && (
                    <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-4">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-amber-400 mb-1">X-Factor / Wildcard</p>
                        <p className="text-sm text-gray-200">{pred.xFactor}</p>
                      </div>
                    </div>
                  )}
                  {pred.margin && (
                    <p className="text-sm text-gray-400">
                      Predicted margin: <span className="text-white font-semibold">{pred.margin}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

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

            {/* Pitch Report */}
            {pitch?.venue && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-500" />Pitch Report
                </h2>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <p className="text-gray-300">{pitch.venue}</p>
                  <span className="flex items-center gap-1.5 text-sm font-bold bg-gray-800 border border-gray-700 px-3 py-1 rounded-full">
                    {PITCH_ICON[pitch.type] || <Shield className="w-4 h-4 text-gray-400" />}{pitch.type}
                  </span>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-4">
                  <p className="text-sm text-amber-300 font-semibold mb-1">Surface: {pitch.surface}</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{pitch.expectedBehavior}</p>
                </div>

                {/* Pitch stats graph */}
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={[
                      { name: 'Avg 1st Innings', value: pitch.avgFirstInnings, fill: '#f59e0b' },
                      { name: 'Chase Win %', value: pitch.chaseSuccessRate, fill: '#06b6d4' },
                    ]}
                    layout="vertical"
                    margin={{ left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                      {[0, 1].map(i => <Cell key={i} fill={i === 0 ? '#f59e0b' : '#06b6d4'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
                    <Droplets className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300">{pitch.dew}</p>
                  </div>
                  <div className="flex items-start gap-2 bg-gray-800/50 rounded-xl px-4 py-3">
                    <Target className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300"><span className="text-amber-300 font-semibold">Toss ({pitch.tossAdvantage}): </span>{pitch.tossReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Players to Watch */}
            {players.length > 0 && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-500" />Players to Watch
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />{analysis.teamA}
                    </p>
                    <LineupBadge confirmed={analysis.lineupConfirmed?.teamA} hasSource={!!analysis.lineupSource?.teamA} />
                    <div className="space-y-3">
                      {players.filter(p => p.team === analysis.teamA).map((p, i) => <PlayerCard key={i} player={p} />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />{analysis.teamB}
                    </p>
                    <LineupBadge confirmed={analysis.lineupConfirmed?.teamB} hasSource={!!analysis.lineupSource?.teamB} />
                    <div className="space-y-3">
                      {players.filter(p => p.team === analysis.teamB).map((p, i) => <PlayerCard key={i} player={p} />)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Head-to-Head + Recent Form */}
            {(h?.totalMeetings || form?.teamA) && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-500" />Head-to-Head &amp; Recent Form
                </h2>

                {h?.totalMeetings ? (
                  <div className="mb-6">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-3">{h.totalMeetings} Historic Meetings</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={h2hChartData} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="wins" name="Wins" radius={[0, 6, 6, 0]} barSize={28}>
                          {h2hChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-gray-800/50 rounded-xl px-4 py-3">
                        <p className="text-xs text-gray-500 mb-1">Current Streak</p>
                        <p className="text-sm text-white font-semibold">{h.currentStreak}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl px-4 py-3">
                        <p className="text-xs text-gray-500 mb-1">Last Meeting</p>
                        <p className="text-sm text-white font-semibold">{h.lastResult}</p>
                      </div>
                    </div>
                    {h.keyRivalryFact && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 mt-3">
                        <p className="text-xs text-amber-400 mb-1 flex items-center gap-1"><Trophy className="w-3 h-3" />Rivalry Fact</p>
                        <p className="text-sm text-gray-300">{h.keyRivalryFact}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mb-6">Head-to-head history unavailable for this matchup.</p>
                )}

                {form?.teamA && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-3">Recent Form (last 5)</p>
                    <div className="space-y-3 mb-4">
                      {[{ team: analysis.teamA, data: form.teamA }, { team: analysis.teamB, data: form.teamB }].map(({ team, data }) => (
                        <div key={team} className="flex items-center gap-3">
                          <span className="text-sm text-gray-400 w-28 truncate">{team}</span>
                          <div className="flex gap-1.5">{data.last5.split(' ').map((r, i) => <FormBadge key={i} result={r} />)}</div>
                          <span className={`text-xs font-bold ml-1 ${data.trend === 'Strong' ? 'text-emerald-400' : data.trend === 'Poor' ? 'text-red-400' : 'text-amber-400'}`}>{data.trend}</span>
                        </div>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={formChartData} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="avg" name="Avg Score" radius={[6, 6, 0, 0]} barSize={40}>
                          {formChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

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
              Win probability from our internal prediction model; pitch, player, and history
              details generated by OpenAI GPT-4o and Google Gemini from real cricket knowledge.
              For informational purposes only — past performance does not guarantee future results.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>}>
      <AnalysisContent />
    </Suspense>
  )
}
