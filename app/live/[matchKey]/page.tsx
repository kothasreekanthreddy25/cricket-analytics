'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Radio,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  Activity,
  BarChart3,
  Zap,
  Target,
  MapPin,
  ChevronDown,
  ChevronUp,
  Wifi,
  Users,
  Trophy,
  Brain,
  ClipboardList,
  Star,
} from 'lucide-react'
import YouTubePlayer from '@/components/YouTubePlayer'
import AffiliateBanner from '@/components/AffiliateBanner'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface BallEvent {
  innings: string
  over: number
  ball: number
  runs: number
  batsmanRuns: number
  extras: number
  batsman: string
  bowler: string
  commentary: string
  isWicket: boolean
  wicketType: string | null
  dismissedPlayer: string | null
  isFour: boolean
  isSix: boolean
  milestone?: string | null  // e.g. "half-century", "century"
}

interface InningsData {
  key: string
  teamSide: 'a' | 'b'
  battingTeam: string
  runs: number | null
  wickets: number | null
  overs: string | number | null
  scoreStr: string | null
  runRate: number | null
  extras: number | null
}

interface TeamInfo {
  key: string
  name: string
  code: string
}

interface MatchData {
  key: string
  name: string
  shortName: string
  subTitle: string
  status: string
  playStatus: string
  format: string
  startAt: string | null
  winner: string | null
  toss: any
  venue: { name: string; city: string; country: string } | null
  teams: { a: TeamInfo | null; b: TeamInfo | null }
  innings: InningsData[]
  messages: any[]
  statusNote: string
}

interface Probability {
  data: {
    teamA: { key: string; name: string; code: string; pct: number }
    teamB: { key: string; name: string; code: string; pct: number }
  } | null
  source: string
}

interface BatsmanInfo {
  name: string
  runs: number | null
  balls: number | null
  fours: number | null
  sixes: number | null
  strikeRate: number | null
}

interface BowlerInfo {
  name: string
  overs: number | null
  runs: number | null
  wickets: number | null
  economy: number | null
}

interface CurrentPlayers {
  liveInningKey: string | null
  striker: BatsmanInfo | null
  nonStriker: BatsmanInfo | null
  bowler: BowlerInfo | null
}

interface FormMatch { result: 'W' | 'L'; opponent: string }

interface PredictionInsights {
  predictedScoreA: number | null
  predictedScoreB: number | null
  confidence: string | null
  teamAWinRate: number | null
  teamBWinRate: number | null
  avgScoreAtVenue: number | null
  venueInfo: string | null
  pitchType: string | null
  factors: any
  reasoning: string | null
  teamALast5?: FormMatch[]
  teamBLast5?: FormMatch[]
}

interface LiveData {
  success: boolean
  match: MatchData
  currentPlayers: CurrentPlayers
  ballByBall: BallEvent[]
  probability: Probability
  predictionInsights: PredictionInsights | null
  graphs: {
    worm: any
    manhattan: any
    runRate: any
  }
  errors: Record<string, string | null>
  timestamp: string
}

// ──────────────────────────────────────────────
// Win Probability Section
// ──────────────────────────────────────────────

function WinProbabilitySection({
  probability,
  insights,
}: {
  probability: Probability
  insights: PredictionInsights | null
}) {
  const [animated, setAnimated] = useState(false)
  const [displayA, setDisplayA] = useState(50)
  const [displayB, setDisplayB] = useState(50)

  const pctA = probability.data ? Math.max(5, Math.min(95, probability.data.teamA.pct)) : 50
  const pctB = probability.data ? Math.max(5, Math.min(95, probability.data.teamB.pct)) : 50

  // Animate numbers counting up on load / change
  useEffect(() => {
    const t = setTimeout(() => {
      setAnimated(true)
      setDisplayA(pctA)
      setDisplayB(pctB)
    }, 300)
    return () => clearTimeout(t)
  }, [pctA, pctB])

  const teamAName = probability.data?.teamA.name ?? 'Team A'
  const teamBName = probability.data?.teamB.name ?? 'Team B'
  const teamACode = probability.data?.teamA.code ?? 'A'
  const teamBCode = probability.data?.teamB.code ?? 'B'
  const diff = Math.abs(pctA - pctB)
  const favouredName = pctA >= pctB ? teamAName : teamBName
  const favouredColor = pctA >= pctB ? 'text-emerald-400' : 'text-cyan-400'

  const histA = insights?.teamAWinRate != null ? Math.round(insights.teamAWinRate * 100) : null
  const histB = insights?.teamBWinRate != null ? Math.round(insights.teamBWinRate * 100) : null

  const sourceLabel =
    probability.source === 'live' ? { text: 'Live', dot: 'bg-red-500', cls: 'text-red-400 border-red-500/20 bg-red-500/10' }
    : probability.source === 'ai'  ? { text: 'AI Model', dot: 'bg-purple-500', cls: 'text-purple-400 border-purple-500/20 bg-purple-500/10' }
    : { text: 'Pre-match', dot: 'bg-gray-500', cls: 'text-gray-400 border-gray-600/30 bg-gray-700/30' }

  return (
    <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 border border-gray-700/40 rounded-2xl overflow-hidden h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-700/30">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Win Probability</span>
        </div>
        <span className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${sourceLabel.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sourceLabel.dot} ${probability.source === 'live' ? 'animate-pulse' : ''}`} />
          {sourceLabel.text}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">

        {/* Team names + big percentages */}
        <div className="flex items-center justify-between">
          {/* Team A */}
          <div className="flex-1 text-left">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5 truncate">{teamAName}</p>
            <p className={`text-3xl font-black font-mono transition-all duration-700 ${
              !probability.data ? 'text-gray-600' : pctA >= pctB ? 'text-emerald-400' : 'text-gray-400'
            }`}>
              {probability.data ? `${displayA}%` : '—'}
            </p>
            {histA !== null && (
              <p className="text-[9px] text-gray-600 mt-0.5">Hist: {histA}%</p>
            )}
          </div>

          {/* Centre divider */}
          <div className="flex flex-col items-center px-3">
            <span className="text-[10px] text-gray-700 font-bold">VS</span>
            {diff >= 15 && probability.data && (
              <span className={`text-[8px] font-bold mt-1 ${favouredColor}`}>▲ FAV</span>
            )}
          </div>

          {/* Team B */}
          <div className="flex-1 text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5 truncate">{teamBName}</p>
            <p className={`text-3xl font-black font-mono transition-all duration-700 ${
              !probability.data ? 'text-gray-600' : pctB > pctA ? 'text-cyan-400' : 'text-gray-400'
            }`}>
              {probability.data ? `${displayB}%` : '—'}
            </p>
            {histB !== null && (
              <p className="text-[9px] text-gray-600 mt-0.5">Hist: {histB}%</p>
            )}
          </div>
        </div>

        {/* Main probability bar */}
        {probability.data ? (
          <div className="space-y-1">
            <div className="relative w-full h-8 rounded-xl overflow-hidden bg-gray-900/60 flex shadow-inner">
              {/* Team A fill */}
              <div
                className="h-full flex items-center justify-end pr-2 transition-all duration-1000 ease-out"
                style={{
                  width: animated ? `${pctA}%` : '50%',
                  background: pctA >= pctB
                    ? 'linear-gradient(90deg, #064e3b, #059669, #34d399)'
                    : 'linear-gradient(90deg, #374151, #4b5563, #6b7280)',
                }}
              >
                {pctA >= 25 && (
                  <span className="text-[10px] font-bold text-white/90">{pctA}%</span>
                )}
              </div>
              {/* Divider */}
              <div className="w-0.5 h-full bg-gray-950 flex-shrink-0 z-10" />
              {/* Team B fill */}
              <div
                className="h-full flex items-center justify-start pl-2 flex-1 transition-all duration-1000 ease-out"
                style={{
                  background: pctB > pctA
                    ? 'linear-gradient(90deg, #22d3ee, #0891b2, #0e7490)'
                    : 'linear-gradient(90deg, #374151, #4b5563, #6b7280)',
                }}
              >
                {pctB >= 25 && (
                  <span className="text-[10px] font-bold text-white/90">{pctB}%</span>
                )}
              </div>
              {/* Shimmer on favoured side */}
              {animated && (
                <div
                  className="absolute top-0 h-full w-6 bg-white/8 animate-pulse pointer-events-none rounded"
                  style={{ left: pctA > pctB ? `${Math.max(0, pctA - 8)}%` : `${Math.min(92, pctA + 3)}%` }}
                />
              )}
            </div>
            {/* Team codes below bar */}
            <div className="flex justify-between text-[9px] text-gray-600 px-0.5">
              <span>{teamACode}</span>
              {diff >= 10 && (
                <span className={`font-semibold ${diff >= 30 ? 'text-yellow-500' : diff >= 20 ? favouredColor : 'text-gray-500'}`}>
                  {diff >= 30 ? '⭐ ' : ''}{favouredName} favoured
                </span>
              )}
              <span>{teamBCode}</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-8 rounded-xl bg-gray-900/60 flex items-center justify-center">
            <span className="text-[10px] text-gray-600">Calculating...</span>
          </div>
        )}

        {/* Factor breakdown rows */}
        <div className="space-y-1.5 pt-1 border-t border-gray-700/30">
          <p className="text-[9px] text-gray-600 uppercase tracking-wider">Factors</p>

          {/* Team history */}
          {histA !== null && histB !== null && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-600 w-20 flex-shrink-0">Team history</span>
              <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-gray-900/60">
                <div
                  className="h-full bg-emerald-500/70 transition-all duration-1000"
                  style={{ width: animated ? `${histA}%` : '0%' }}
                />
                <div className="h-full bg-cyan-500/70 flex-1" />
              </div>
              <span className="text-[9px] font-mono text-gray-500 w-16 text-right flex-shrink-0">
                {histA}% / {histB}%
              </span>
            </div>
          )}

          {/* Current form (live probability itself) */}
          {probability.data && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-600 w-20 flex-shrink-0">Live form</span>
              <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-gray-900/60">
                <div
                  className="h-full bg-emerald-400/60 transition-all duration-1000"
                  style={{ width: animated ? `${pctA}%` : '50%' }}
                />
                <div className="h-full bg-cyan-400/60 flex-1" />
              </div>
              <span className="text-[9px] font-mono text-gray-500 w-16 text-right flex-shrink-0">
                {pctA}% / {pctB}%
              </span>
            </div>
          )}

          {/* Venue avg */}
          {insights?.avgScoreAtVenue && (
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[9px] text-gray-600">Venue avg score</span>
              <span className="text-[9px] font-mono text-yellow-400">{insights.avgScoreAtVenue}</span>
            </div>
          )}

          {/* Pitch type */}
          {insights?.pitchType && (
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-gray-600">Pitch</span>
              <span className="text-[9px] text-orange-400 font-medium">{insights.pitchType}</span>
            </div>
          )}

          {/* Venue name */}
          {insights?.venueInfo && (
            <div className="flex items-center gap-1 pt-0.5">
              <MapPin className="w-2.5 h-2.5 text-gray-700 flex-shrink-0" />
              <span className="text-[9px] text-gray-600 truncate">{insights.venueInfo}</span>
            </div>
          )}

          {/* No data message */}
          {!probability.data && !histA && (
            <p className="text-[10px] text-gray-700 text-center py-2">
              Gathering data from match history…
            </p>
          )}
        </div>

        {/* Last 5 matches per team */}
        {(insights?.teamALast5?.length || insights?.teamBLast5?.length) ? (
          <div className="pt-2 border-t border-gray-700/30 space-y-2">
            <p className="text-[9px] text-gray-600 uppercase tracking-wider">Last 5 Matches</p>

            {/* Team A form */}
            {insights?.teamALast5?.length ? (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-500 w-20 flex-shrink-0 truncate">{teamAName}</span>
                <div className="flex gap-1">
                  {insights.teamALast5.map((m, i) => (
                    <span
                      key={i}
                      title={`vs ${m.opponent} — ${m.result}`}
                      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold ${
                        m.result === 'W'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {m.result}
                    </span>
                  ))}
                  {/* empty slots */}
                  {Array.from({ length: Math.max(0, 5 - (insights.teamALast5.length)) }).map((_, i) => (
                    <span key={`ea-${i}`} className="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-700/40 text-[9px] text-gray-700">–</span>
                  ))}
                </div>
                <span className="text-[9px] text-gray-600 ml-auto">
                  {insights.teamALast5.filter(m => m.result === 'W').length}/{insights.teamALast5.length}W
                </span>
              </div>
            ) : null}

            {/* Team B form */}
            {insights?.teamBLast5?.length ? (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-500 w-20 flex-shrink-0 truncate">{teamBName}</span>
                <div className="flex gap-1">
                  {insights.teamBLast5.map((m, i) => (
                    <span
                      key={i}
                      title={`vs ${m.opponent} — ${m.result}`}
                      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold ${
                        m.result === 'W'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {m.result}
                    </span>
                  ))}
                  {Array.from({ length: Math.max(0, 5 - (insights.teamBLast5.length)) }).map((_, i) => (
                    <span key={`eb-${i}`} className="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-700/40 text-[9px] text-gray-700">–</span>
                  ))}
                </div>
                <span className="text-[9px] text-gray-600 ml-auto">
                  {insights.teamBLast5.filter(m => m.result === 'W').length}/{insights.teamBLast5.length}W
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Player Rating + Live Card helpers
// ──────────────────────────────────────────────

function computeBatRating(career: any): number {
  if (!Array.isArray(career)) return 0
  const t20 = career.filter((c: any) => c.type === 'T20' || c.type === 'T20I')
  if (!t20.length) return 0
  // Aggregate across seasons
  let totalRuns = 0, totalInnings = 0, totalBalls = 0, totalFifties = 0, totalHundreds = 0
  for (const s of t20) {
    const b = s.batting || {}
    totalRuns    += Number(b.runs_scored   ?? b.runs  ?? 0)
    totalInnings += Number(b.innings       ?? 0)
    totalBalls   += Number(b.balls_faced   ?? 0)
    totalFifties += Number(b.fifties       ?? 0)
    totalHundreds+= Number(b.hundreds      ?? 0)
  }
  if (totalInnings === 0) return 0
  const avg = totalRuns / totalInnings
  const sr  = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0
  const milestonePts = Math.min(25, (totalFifties * 3 + totalHundreds * 8))
  const rating = Math.min(100, Math.round(
    (Math.min(avg, 50) / 50) * 35 +   // avg: max 35pts at avg=50
    (Math.min(sr, 170) / 170) * 35 +  // SR: max 35pts at SR=170
    milestonePts                        // 50s/100s: max 25pts
  ))
  return rating
}

function computeBowlRating(career: any): number {
  if (!Array.isArray(career)) return 0
  const t20 = career.filter((c: any) => c.type === 'T20' || c.type === 'T20I')
  if (!t20.length) return 0
  let totalWickets = 0, totalEcon = 0, econCount = 0, totalAvg = 0, avgCount = 0
  for (const s of t20) {
    const b = s.bowling || {}
    totalWickets += Number(b.wickets       ?? 0)
    const eco     = Number(b.economy_rate  ?? b.economy ?? 0)
    const avg     = Number(b.average       ?? 0)
    if (eco > 0) { totalEcon += eco; econCount++ }
    if (avg > 0) { totalAvg  += avg; avgCount++ }
  }
  if (totalWickets === 0) return 0
  const avgEcon = econCount > 0 ? totalEcon / econCount : 8
  const avgAvg  = avgCount  > 0 ? totalAvg  / avgCount  : 30
  const rating  = Math.min(100, Math.round(
    Math.min(totalWickets / 1.5, 40) +           // wickets volume: max 40pts at 60 wkts
    (Math.max(0, 10 - avgEcon) / 10) * 35 +      // economy: max 35pts at eco=0 (ideal <7)
    (Math.max(0, 40 - avgAvg)  / 40) * 25        // average: max 25pts at avg=0 (ideal <20)
  ))
  return rating
}

function RatingRing({ rating, color }: { rating: number; color: string }) {
  const r = 16, circ = 2 * Math.PI * r
  const dash = (rating / 100) * circ
  return (
    <div className="relative flex-shrink-0" style={{ width: 44, height: 44 }}>
      <svg width="44" height="44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#1f2937" strokeWidth="3.5" />
        <circle
          cx="22" cy="22" r={r} fill="none"
          stroke={color} strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
        {rating}
      </span>
    </div>
  )
}

function Last5Performances({ seasons, type }: { seasons: any; type: 'bat' | 'bowl' }) {
  if (!Array.isArray(seasons)) return null
  const t20 = seasons.filter((s: any) => s.type === 'T20' || s.type === 'T20I').slice(-5)
  if (!t20.length) return null
  return (
    <div className="mt-2">
      <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Last {t20.length} seasons (T20)</p>
      <div className="space-y-0.5">
        {t20.reverse().map((s: any, i: number) => {
          if (type === 'bat') {
            const b = s.batting || {}
            const runs = b.runs_scored ?? b.runs ?? 0
            const inn  = b.innings ?? 0
            const avg  = inn > 0 ? (runs / inn).toFixed(1) : '—'
            const sr   = b.strike_rate ?? b.sr ?? '—'
            return (
              <div key={i} className="flex items-center gap-2 text-[9px]">
                <span className="text-gray-600 w-14 flex-shrink-0">S{s.season_id ?? i + 1}</span>
                <span className="text-white font-mono w-10">{runs} runs</span>
                <span className="text-gray-500">{inn} inn</span>
                <span className="text-emerald-400 ml-auto">Avg {avg}</span>
                <span className="text-cyan-400">SR {Number(sr).toFixed(0)}</span>
              </div>
            )
          } else {
            const b = s.bowling || {}
            const wkts = b.wickets ?? 0
            const eco  = b.economy_rate ?? b.economy ?? '—'
            const avg  = b.average ?? '—'
            return (
              <div key={i} className="flex items-center gap-2 text-[9px]">
                <span className="text-gray-600 w-14 flex-shrink-0">S{s.season_id ?? i + 1}</span>
                <span className="text-red-400 font-mono w-10">{wkts} wkts</span>
                <span className="text-emerald-400 ml-auto">Eco {Number(eco).toFixed(2)}</span>
                <span className="text-gray-400">Avg {Number(avg).toFixed(1)}</span>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}

function PlayerLiveCard({
  name, matchRuns, matchBalls, matchFours, matchSixes, matchSR,
  career, type, color,
}: {
  name: string
  matchRuns?: number | null
  matchBalls?: number | null
  matchFours?: number | null
  matchSixes?: number | null
  matchSR?: number | null
  career?: any[]
  type: 'bat' | 'bowl'
  color: string
}) {
  const [open, setOpen] = useState(false)
  const seasons = Array.isArray(career) ? career : []
  const rating = type === 'bat' ? computeBatRating(seasons) : computeBowlRating(seasons)
  const ratingColor = rating >= 75 ? '#10b981' : rating >= 50 ? '#f59e0b' : '#6b7280'

  return (
    <div className={`rounded-xl border bg-gray-900/50 overflow-hidden ${color}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left"
      >
        <RatingRing rating={rating} color={ratingColor} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{name}</p>
          {type === 'bat' ? (
            <p className="text-[10px] font-mono">
              <span className="text-emerald-400">{matchRuns ?? '—'}</span>
              <span className="text-gray-600"> ({matchBalls ?? '—'}b)</span>
              {matchFours ? <span className="text-blue-400 ml-1.5">{matchFours}×4</span> : null}
              {matchSixes ? <span className="text-purple-400 ml-1">  {matchSixes}×6</span> : null}
              {matchSR   ? <span className="text-gray-500 ml-1.5">SR:{Number(matchSR).toFixed(0)}</span> : null}
            </p>
          ) : (
            <p className="text-[10px] font-mono">
              <span className="text-red-400">{matchRuns ?? '—'}/{matchBalls ?? '—'} wkts</span>
              {matchFours ? <span className="text-gray-500 ml-1.5">{matchFours}ov</span> : null}
              {matchSixes ? <span className="text-yellow-400 ml-1">  Eco:{matchSixes}</span> : null}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
            rating >= 75 ? 'bg-emerald-500/20 text-emerald-400'
            : rating >= 50 ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-gray-700/50 text-gray-400'
          }`}>
            {rating >= 75 ? 'Elite' : rating >= 50 ? 'Good' : rating > 0 ? 'Avg' : 'N/A'}
          </span>
          <span className="text-gray-700 text-[8px]">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && seasons.length > 0 && (
        <div className="px-3 pb-2.5 border-t border-gray-700/30">
          <Last5Performances seasons={seasons} type={type} />
        </div>
      )}
      {open && seasons.length === 0 && (
        <p className="px-3 pb-2.5 text-[9px] text-gray-700 border-t border-gray-700/30 pt-1.5">No career data available</p>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Last 30 Balls Strip
// ──────────────────────────────────────────────

function Last30BallsStrip({ balls }: { balls: BallEvent[] }) {
  if (balls.length === 0) return null
  // balls sorted descending (newest first) — keep that order so newest balls are always visible on the left
  const recent = balls.slice(0, 30)

  const getBallStyle = (b: BallEvent) => {
    if (b.isWicket) return { bg: 'bg-red-500', border: 'border-red-400', text: 'text-white', label: 'W' }
    if (b.isSix) return { bg: 'bg-purple-600', border: 'border-purple-400', text: 'text-white', label: '6' }
    if (b.isFour) return { bg: 'bg-blue-600', border: 'border-blue-400', text: 'text-white', label: '4' }
    if (b.extras > 0 && b.batsmanRuns === 0) return { bg: 'bg-yellow-600/70', border: 'border-yellow-500/50', text: 'text-white', label: b.runs === 0 ? 'Wd' : `${b.runs}` }
    if (b.runs === 0) return { bg: 'bg-gray-700', border: 'border-gray-600', text: 'text-gray-400', label: '·' }
    return { bg: 'bg-emerald-700/80', border: 'border-emerald-500/50', text: 'text-white', label: String(b.batsmanRuns || b.runs) }
  }

  return (
    <div className="mt-3 -mx-1">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 px-1 scrollbar-hide">
        <span className="text-[9px] text-gray-600 uppercase tracking-wider whitespace-nowrap mr-2 flex-shrink-0">Latest →</span>
        {recent.map((b, i) => {
          const s = getBallStyle(b)
          const nextBall = recent[i + 1]
          const isOverBoundary = nextBall && nextBall.over !== b.over
          return (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              <span
                title={`Over ${b.over}.${b.ball} • ${b.batsman} • ${b.commentary || s.label}`}
                className={`inline-flex items-center justify-center w-6 h-6 flex-shrink-0 rounded-full text-[9px] font-bold border ${s.bg} ${s.border} ${s.text} cursor-default`}
              >
                {s.label}
              </span>
              {isOverBoundary && (
                <div className="flex flex-col items-center gap-0.5 mx-0.5 flex-shrink-0">
                  <div className="w-px h-4 bg-gray-600/60" />
                  <span className="text-[8px] text-gray-700 leading-none">{b.over}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Scorecard Component
// ──────────────────────────────────────────────

function Scorecard({
  match,
  isLive,
  currentPlayers,
  ballByBall,
  insights,
  matchStats,
}: {
  match: MatchData
  isLive: boolean
  currentPlayers: CurrentPlayers | null
  ballByBall: BallEvent[]
  insights: PredictionInsights | null
  matchStats: MatchStatsData | null
}) {
  const teamA = match.teams.a
  const teamB = match.teams.b

  // Smart projected score — 1st innings only while live
  const inn1 = match.innings[0] ?? null
  const inn2 = match.innings[1] ?? null

  interface ScorePrediction { mid: number; lo: number; hi: number; factors: string[] }
  let scorePrediction: ScorePrediction | null = null

  if (isLive && inn1 && match.innings.length === 1 && inn1.runs !== null && inn1.overs) {
    const currentRuns = inn1.runs
    const wickets = inn1.wickets ?? 0
    const oversRaw = parseFloat(String(inn1.overs)) || 0
    const oversCompleted = Math.floor(oversRaw)
    const ballsThisOver = Math.round((oversRaw - oversCompleted) * 10)
    const ballsDone = oversCompleted * 6 + ballsThisOver
    const ballsRemaining = 120 - ballsDone
    const oversRemaining = ballsRemaining / 6

    if (oversCompleted >= 1 && oversRemaining > 0) {
      const currentRR = ballsDone > 0 ? (currentRuns / ballsDone) * 6 : 0

      // --- Wicket decay: each wicket reduces remaining RR by ~3.5% ---
      const wicketMultiplier = Math.max(0.45, 1 - wickets * 0.035)

      // --- Phase bonus: death overs (16-20) typically score faster ---
      const deathOversLeft = Math.max(0, 20 - Math.max(15, oversCompleted))
      const middleOversLeft = Math.max(0, Math.min(15, 20 - oversCompleted) - deathOversLeft)
      const deathRR = currentRR * 1.25 * wicketMultiplier
      const middleRR = currentRR * 0.95 * wicketMultiplier

      // --- Last-6-balls momentum: if recent balls are big, expect continuation ---
      const last6 = ballByBall.slice(0, 6)
      const last6Runs = last6.reduce((s, b) => s + b.runs, 0)
      const last6RR = last6.length > 0 ? (last6Runs / last6.length) * 6 : currentRR
      const momentumFactor = last6.length >= 3
        ? Math.min(1.3, Math.max(0.8, (last6RR / Math.max(currentRR, 1)) * 0.3 + 0.7))
        : 1.0

      // --- Projected additional runs ---
      // Note: striker SR intentionally excluded — if they get out prediction breaks
      const additionalRuns = (middleOversLeft * middleRR + deathOversLeft * deathRR)
        * momentumFactor

      // Weight current score + projection vs DB prediction
      const liveProjected = Math.round(currentRuns + additionalRuns)
      const dbPredicted = insights?.predictedScoreA ?? null

      let mid: number
      const factors: string[] = []

      if (dbPredicted) {
        // Blend: 60% live model, 40% historical prediction
        mid = Math.round(liveProjected * 0.6 + dbPredicted * 0.4)
        factors.push(`hist:${dbPredicted}`)
      } else {
        mid = liveProjected
      }

      factors.push(`W:${wickets}`)
      if (deathOversLeft > 0) factors.push(`${Math.round(deathOversLeft)} death ov`)
      if (last6.length >= 3) factors.push(`mom:${last6Runs >= 12 ? '🔥' : last6Runs <= 3 ? '🧊' : '~'}`)

      scorePrediction = { mid, lo: mid - 2, hi: mid + 2, factors }
    }
  }

  const predictedScore = scorePrediction?.mid ?? insights?.predictedScoreA ?? null

  // Required run rate in a chase
  let chaseInfo: { target: number; needed: number; ballsLeft: number; reqRR: number } | null = null
  if (isLive && inn2 && inn1 && inn1.runs !== null && inn2.runs !== null) {
    const target = inn1.runs + 1
    const chaseOvers = parseFloat(String(inn2.overs ?? '0')) || 0
    const ballsDone = Math.floor(chaseOvers) * 6 + Math.round((chaseOvers % 1) * 10)
    const ballsLeft = 120 - ballsDone
    const needed = target - inn2.runs
    if (needed > 0 && ballsLeft > 0) {
      chaseInfo = { target, needed, ballsLeft, reqRR: (needed / ballsLeft) * 6 }
    }
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-emerald-500/30 rounded-2xl p-5 shadow-lg shadow-emerald-500/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              LIVE
            </span>
          )}
          <span className="text-xs text-gray-500">{match.format?.toUpperCase()}</span>
        </div>
        {match.venue && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <MapPin className="w-3 h-3" />
            {match.venue.city || match.venue.name}
          </span>
        )}
      </div>

      <h2 className="text-base font-bold text-white mb-3">
        {match.name}
        {match.subTitle && (
          <span className="text-xs text-gray-500 font-normal ml-2">{match.subTitle}</span>
        )}
      </h2>

      {/* Innings Scores */}
      <div className="space-y-2">
        {match.innings.length > 0 ? (
          match.innings.map((inn, i) => {
            const team = inn.teamSide === 'a' ? teamA : teamB
            const wickets = inn.wickets ?? 0
            const isCurrentInnings = isLive && i === match.innings.length - 1
            const color = i === 0 ? 'text-emerald-400' : 'text-cyan-400'
            const borderColor = i === 0 ? 'border-emerald-500/20' : 'border-cyan-500/20'

            return (
              <div key={inn.key} className={`rounded-xl ${isCurrentInnings ? 'bg-gray-900/70 border ' + borderColor : 'bg-gray-900/40'}`}>
                <div className="flex items-center justify-between px-3 py-2">
                  <div>
                    <span className={`text-sm font-bold ${color}`}>
                      {team?.name || (typeof inn.battingTeam === 'string' ? inn.battingTeam : '')}
                    </span>
                    {inn.overs && (
                      <span className="text-[10px] text-gray-600 ml-2">({inn.overs} ov)</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold font-mono ${color}`}>
                      {(typeof inn.scoreStr === 'string' && inn.scoreStr)
                        || (inn.runs !== null ? `${inn.runs}/${wickets}` : '—')}
                    </span>
                    {inn.runRate !== null && typeof inn.runRate === 'number' && (
                      <p className="text-[10px] text-gray-500">RR: {inn.runRate.toFixed(2)}</p>
                    )}
                  </div>
                </div>

                {/* 1st innings: predicted score progress bar */}
                {isCurrentInnings && i === 0 && scorePrediction && (
                  <div className="px-3 pb-2.5 border-t border-gray-700/30 pt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Brain className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Predicted</span>
                      </div>
                      <span className="text-base font-bold text-purple-300 font-mono">
                        {scorePrediction.lo}–{scorePrediction.hi}
                      </span>
                      <div className="flex items-center gap-1 ml-auto flex-wrap justify-end">
                        {scorePrediction.factors.map((f, fi) => (
                          <span key={fi} className="text-[9px] bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded">
                            {f}
                          </span>
                        ))}
                        {insights?.pitchType && (
                          <span className="text-[9px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">
                            {insights.pitchType}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 relative w-full h-1.5 bg-gray-700/40 rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-emerald-500/60 rounded-full"
                        style={{ width: `${Math.min(100, ((inn1?.runs ?? 0) / Math.max(scorePrediction.hi, 1)) * 100)}%` }}
                      />
                      <div
                        className="absolute top-0 h-full w-0.5 bg-purple-400/80"
                        style={{ left: `${Math.min(98, (scorePrediction.mid / Math.max(scorePrediction.hi + 20, 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-700 mt-0.5">
                      <span>{inn1?.runs ?? 0} now</span>
                      <span className="text-purple-500/70">{scorePrediction.mid} predicted</span>
                    </div>
                  </div>
                )}

                {/* 2nd innings: required runs chase info */}
                {isCurrentInnings && i === 1 && chaseInfo && (
                  <div className="px-3 pb-2.5 border-t border-gray-700/30 pt-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Target */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider">Target</span>
                        <span className="text-base font-bold text-white font-mono">{chaseInfo.target}</span>
                      </div>
                      <div className="w-px h-8 bg-gray-700" />
                      {/* Required */}
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider">Need</span>
                        <span className="text-base font-bold text-yellow-300 font-mono">
                          {chaseInfo.needed} off {chaseInfo.ballsLeft}b
                        </span>
                      </div>
                      <div className="w-px h-8 bg-gray-700" />
                      {/* Required RR */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider">Req RR</span>
                        <span className={`text-base font-bold font-mono ${chaseInfo.reqRR > 12 ? 'text-red-400' : chaseInfo.reqRR < 7 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                          {chaseInfo.reqRR.toFixed(1)}
                        </span>
                      </div>
                      {/* Chase bar */}
                      <div className="flex-1 min-w-[60px]">
                        <div className="relative w-full h-1.5 bg-gray-700/40 rounded-full overflow-hidden">
                          <div
                            className={`absolute left-0 top-0 h-full rounded-full ${chaseInfo.reqRR > 12 ? 'bg-red-500/70' : chaseInfo.reqRR < 7 ? 'bg-emerald-500/70' : 'bg-yellow-500/70'}`}
                            style={{ width: `${Math.min(100, ((inn2?.runs ?? 0) / chaseInfo.target) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                          <span>{inn2?.runs ?? 0}</span>
                          <span>{chaseInfo.target}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-xl">
              <span className="text-sm font-bold text-emerald-400">{teamA?.name || 'Team A'}</span>
              <span className="text-base font-mono text-gray-500">Yet to bat</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-xl">
              <span className="text-sm font-bold text-cyan-400">{teamB?.name || 'Team B'}</span>
              <span className="text-base font-mono text-gray-500">Yet to bat</span>
            </div>
          </>
        )}
      </div>

      {/* Current Players — computed from ball-by-ball data */}
      {isLive && ballByBall.length > 0 && (() => {
        try {
        // Determine current innings scoreboard key (S1 or S2)
        const currentSB = ballByBall[0]?.innings ?? 'S1'

        // Compute batter/bowler stats from current innings balls
        const batterMap: Record<string, { runs: number; balls: number; fours: number; sixes: number; dismissed: boolean }> = {}
        const bowlerMap: Record<string, { runs: number; balls: number; wickets: number }> = {}

        const inningsBalls = [...ballByBall].filter(x => x.innings === currentSB).reverse()
        for (const b of inningsBalls) {
          const bat  = b.batsman  || ''
          const bowl = b.bowler   || ''
          if (!bat) continue

          if (!batterMap[bat]) batterMap[bat] = { runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false }
          const isWide = (b.extras ?? 0) > 0 && (b.batsmanRuns ?? 0) === 0 && !(b.commentary ?? '').toLowerCase().includes('no ball')
          if (!isWide) batterMap[bat].balls++
          batterMap[bat].runs  += (b.batsmanRuns ?? 0)
          if (b.isFour) batterMap[bat].fours++
          if (b.isSix)  batterMap[bat].sixes++
          if (b.isWicket && b.dismissedPlayer === bat) batterMap[bat].dismissed = true

          if (bowl) {
            if (!bowlerMap[bowl]) bowlerMap[bowl] = { runs: 0, balls: 0, wickets: 0 }
            if (!isWide) bowlerMap[bowl].balls++
            bowlerMap[bowl].runs += (b.runs ?? 0)
            if (b.isWicket) bowlerMap[bowl].wickets++
          }
        }

        // Current batters = last 2 undismissed names from recent balls
        const seen = new Set<string>()
        const recentBatters: string[] = []
        for (const b of ballByBall.filter(x => x.innings === currentSB).slice(0, 24)) {
          const n = b.batsman || ''
          if (n && !seen.has(n) && !batterMap[n]?.dismissed) {
            seen.add(n)
            recentBatters.push(n)
            if (recentBatters.length === 2) break
          }
        }

        // Current bowler = most recent ball's bowler
        const currentBowler = ballByBall.find(b => b.innings === currentSB && b.bowler)?.bowler ?? null

        const findCareer = (name: string): any[] | undefined => {
          if (!matchStats?.playerCareer || !name) return undefined
          const fw = name.split(' ')[0].toLowerCase()
          const batStat = matchStats.batting.find(b => (b.name ?? '').toLowerCase().includes(fw))
          if (batStat?.playerId) return matchStats.playerCareer[String(batStat.playerId)]
          const bowlStat = matchStats.bowling.find(b => (b.name ?? '').toLowerCase().includes(fw))
          if (bowlStat?.playerId) return matchStats.playerCareer[String(bowlStat.playerId)]
          return undefined
        }

        if (recentBatters.length === 0 && !currentBowler) return <></>

        return (
          <div className="mt-3 space-y-1.5">
            <p className="text-[9px] text-gray-600 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              At the Crease
            </p>

            {recentBatters.map((name, idx) => {
              const s = batterMap[name] ?? { runs: 0, balls: 0, fours: 0, sixes: 0 }
              const sr = s.balls > 0 ? (s.runs / s.balls) * 100 : 0
              return (
                <PlayerLiveCard
                  key={name}
                  name={name}
                  matchRuns={s.runs}
                  matchBalls={s.balls}
                  matchFours={s.fours}
                  matchSixes={s.sixes}
                  matchSR={sr}
                  career={findCareer(name)}
                  type="bat"
                  color={idx === 0 ? 'border-emerald-500/25' : 'border-gray-700/40'}
                />
              )
            })}

            {currentBowler && (() => {
              const bw = bowlerMap[currentBowler] ?? { runs: 0, balls: 0, wickets: 0 }
              const fullOvers = Math.floor(bw.balls / 6)
              const remBalls  = bw.balls % 6
              const oversStr  = remBalls > 0 ? `${fullOvers}.${remBalls}` : `${fullOvers}`
              const eco = bw.balls > 0 ? ((bw.runs / bw.balls) * 6).toFixed(2) : '0.00'
              return (
                <PlayerLiveCard
                  name={currentBowler}
                  matchRuns={bw.runs}
                  matchBalls={bw.wickets}
                  matchFours={Number(oversStr)}
                  matchSixes={Number(eco)}
                  career={findCareer(currentBowler)}
                  type="bowl"
                  color="border-red-500/20"
                />
              )
            })()}
          </div>
        )
        } catch (e) { return <></> }
      })()}

      {/* Last 30 balls strip */}
      {ballByBall.length > 0 && <Last30BallsStrip balls={ballByBall} />}

      {/* Chase info */}
      {chaseInfo && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-900/60 rounded-lg px-2 py-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Target</p>
            <p className="text-lg font-bold text-white font-mono">{chaseInfo.target}</p>
          </div>
          <div className="bg-gray-900/60 rounded-lg px-2 py-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Need</p>
            <p className="text-sm font-bold text-yellow-400 font-mono">{chaseInfo.needed} off {chaseInfo.ballsLeft}b</p>
          </div>
          <div className={`rounded-lg px-2 py-2 ${chaseInfo.reqRR > 12 ? 'bg-red-500/20' : chaseInfo.reqRR < 7 ? 'bg-emerald-500/20' : 'bg-gray-900/60'}`}>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Req RR</p>
            <p className={`text-lg font-bold font-mono ${chaseInfo.reqRR > 12 ? 'text-red-400' : chaseInfo.reqRR < 7 ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {chaseInfo.reqRR.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Status note */}
      {typeof match.statusNote === 'string' && match.statusNote && !match.statusNote.startsWith('NS') && (
        <p className="mt-3 text-sm text-emerald-400 font-medium bg-emerald-500/10 px-3 py-2 rounded-lg">
          {match.statusNote}
        </p>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Current Over Mini Strip
// ──────────────────────────────────────────────

function CurrentOverStrip({ balls }: { balls: BallEvent[] }) {
  if (balls.length === 0) return null

  // Current over = most recent over number in the sorted (descending) ball list
  const currentOver = balls[0].over
  const overBalls = balls
    .filter(b => b.over === currentOver)
    .sort((a, b) => a.ball - b.ball) // ascending for display

  const getBallColor = (b: BallEvent) => {
    if (b.isWicket) return { bg: 'bg-red-500', text: 'text-white', label: 'W' }
    if (b.isSix) return { bg: 'bg-purple-500', text: 'text-white', label: '6' }
    if (b.isFour) return { bg: 'bg-blue-500', text: 'text-white', label: '4' }
    if (b.runs === 0) return { bg: 'bg-gray-700', text: 'text-gray-400', label: '•' }
    return { bg: 'bg-emerald-600', text: 'text-white', label: String(b.runs) }
  }

  // Upcoming empty slots to reach 6 balls
  const emptySlots = Math.max(0, 6 - overBalls.length)

  return (
    <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium whitespace-nowrap">
        Over {currentOver}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {overBalls.map((b, i) => {
          const { bg, text, label } = getBallColor(b)
          return (
            <span
              key={i}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${bg} ${text}`}
              title={`${b.bowler} → ${b.batsman}: ${b.commentary || label}`}
            >
              {label}
            </span>
          )
        })}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <span
            key={`empty-${i}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-gray-700 text-gray-700 text-xs"
          >
            ·
          </span>
        ))}
      </div>
      {overBalls.length > 0 && (
        <span className="ml-auto text-xs text-gray-500 font-mono whitespace-nowrap">
          {overBalls.reduce((s, b) => s + b.runs, 0)} runs
        </span>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Ball-by-Ball Commentary Component
// ──────────────────────────────────────────────

function BallByBallCommentary({ balls }: { balls: BallEvent[] }) {
  const [expanded, setExpanded] = useState(false)
  const displayBalls = expanded ? balls : balls.slice(0, 30)

  if (balls.length === 0) {
    return (
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-emerald-400" />
          Ball-by-Ball Commentary
        </h3>
        <p className="text-gray-500 text-sm">
          Commentary will appear here once the match begins. Ball-by-ball updates refresh every 10 seconds.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Ball-by-Ball Commentary
        </h3>
        <span className="text-[10px] text-gray-500">{balls.length} deliveries</span>
      </div>

      <CurrentOverStrip balls={balls} />

      <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
        {displayBalls.map((ball, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 py-2 px-3 rounded-lg transition-colors ${
              ball.isWicket
                ? 'bg-red-500/10 border border-red-500/20'
                : ball.isSix
                ? 'bg-purple-500/10 border border-purple-500/20'
                : ball.isFour
                ? 'bg-blue-500/10 border border-blue-500/20'
                : 'bg-gray-900/30 hover:bg-gray-900/50'
            }`}
          >
            {/* Over.Ball badge */}
            <span className="flex-shrink-0 w-12 text-center text-[11px] font-mono font-bold text-gray-400 bg-gray-700/50 rounded px-1.5 py-0.5 mt-0.5">
              {ball.over}.{ball.ball}
            </span>

            {/* Event icon */}
            <span className="flex-shrink-0 mt-0.5">
              {ball.isWicket ? (
                <span className="text-red-400 text-sm font-bold">W</span>
              ) : ball.isSix ? (
                <span className="text-purple-400 text-sm font-bold">6</span>
              ) : ball.isFour ? (
                <span className="text-blue-400 text-sm font-bold">4</span>
              ) : ball.batsmanRuns === 0 && ball.extras === 0 ? (
                <span className="text-gray-600 text-sm">•</span>
              ) : (
                <span className="text-emerald-400 text-sm font-bold">{ball.runs}</span>
              )}
            </span>

            {/* Commentary */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-300 font-medium">{ball.bowler}</span>
                <span className="text-gray-600">→</span>
                <span className="text-xs text-white font-medium">{ball.batsman}</span>
                {ball.isWicket && (
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">
                    {ball.wicketType || 'OUT'}
                  </span>
                )}
                {ball.isSix && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">
                    SIX! 🏏
                  </span>
                )}
                {ball.isFour && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">
                    FOUR!
                  </span>
                )}
                {ball.milestone && (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold uppercase">
                    🏆 {ball.milestone.replace(/-/g, ' ')}
                  </span>
                )}
              </div>
              {ball.commentary && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {ball.commentary}
                </p>
              )}
              {ball.isWicket && ball.dismissedPlayer && (
                <p className="text-xs text-red-400/80 mt-0.5">
                  {ball.dismissedPlayer} dismissed — {ball.wicketType}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {balls.length > 30 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 py-2 bg-gray-900/30 rounded-lg transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show All {balls.length} Deliveries
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Worm Chart Component
// ──────────────────────────────────────────────

function WormChart({ data, teams }: { data: any; teams: { a: TeamInfo | null; b: TeamInfo | null } }) {
  if (!data) {
    return (
      <ChartPlaceholder
        title="Worm Chart"
        icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
        message="Worm data will appear as the match progresses."
      />
    )
  }

  // Parse worm data from Roanuz response
  const chartData: any[] = []
  try {
    const innings = data.innings || data.match?.innings || data
    const teamEntries = Object.entries(innings) as any[]

    // Build over-by-over cumulative data
    const maxOvers = 20
    for (let over = 0; over <= maxOvers; over++) {
      const point: any = { over }
      for (const [inningsKey, inningsVal] of teamEntries) {
        const overs = inningsVal?.overs || inningsVal?.graph || []
        if (Array.isArray(overs) && overs[over] !== undefined) {
          const teamSide = inningsKey.includes('a') ? 'a' : 'b'
          const raw = typeof overs[over] === 'object' ? overs[over].runs : overs[over]
          const n = Number(raw); if (Number.isFinite(n)) point[teamSide] = n
        } else if (typeof overs === 'object' && !Array.isArray(overs)) {
          // Object with over keys
          const overData = overs[over] || overs[`${over}`]
          if (overData !== undefined) {
            const teamSide = inningsKey.includes('a') ? 'a' : 'b'
            const raw = typeof overData === 'object' ? overData.runs || overData.cumulative_runs : overData
            const n = Number(raw); if (Number.isFinite(n)) point[teamSide] = n
          }
        }
      }
      if (point.a !== undefined || point.b !== undefined) {
        chartData.push(point)
      }
    }
  } catch {
    // If parsing fails, show raw data message
  }

  if (chartData.length === 0) {
    return (
      <ChartPlaceholder
        title="Worm Chart"
        icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
        message="Worm data will populate as overs complete."
      />
    )
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        Worm Chart
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="over"
            stroke="#6b7280"
            fontSize={11}
            label={{ value: 'Overs', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 10 }}
          />
          <YAxis stroke="#6b7280" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: 12,
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="a"
            name={teams.a?.name || 'Team A'}
            stroke="#10b981"
            fill="url(#gradA)"
            strokeWidth={2}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="b"
            name={teams.b?.name || 'Team B'}
            stroke="#06b6d4"
            fill="url(#gradB)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ──────────────────────────────────────────────
// Manhattan Chart Component
// ──────────────────────────────────────────────

function ManhattanChart({ data, teams }: { data: any; teams: { a: TeamInfo | null; b: TeamInfo | null } }) {
  if (!data) {
    return (
      <ChartPlaceholder
        title="Manhattan Chart"
        icon={<BarChart3 className="w-4 h-4 text-purple-400" />}
        message="Runs per over data will appear as the match progresses."
      />
    )
  }

  const chartData: any[] = []
  try {
    const innings = data.innings || data.match?.innings || data
    const teamEntries = Object.entries(innings) as any[]
    const maxOvers = 20

    for (let over = 1; over <= maxOvers; over++) {
      const point: any = { over }
      for (const [inningsKey, inningsVal] of teamEntries) {
        const overs = inningsVal?.overs || inningsVal?.graph || []
        const teamSide = inningsKey.includes('a') ? 'a' : 'b'
        if (Array.isArray(overs)) {
          const overData = overs[over - 1] || overs[over]
          if (overData !== undefined) {
            const raw = typeof overData === 'object' ? overData.runs : overData
            const n = Number(raw); if (Number.isFinite(n)) point[teamSide] = n
          }
        } else if (typeof overs === 'object') {
          const overData = overs[over] || overs[`${over}`] || overs[over - 1]
          if (overData !== undefined) {
            const raw = typeof overData === 'object' ? overData.runs : overData
            const n = Number(raw); if (Number.isFinite(n)) point[teamSide] = n
          }
        }
      }
      if (point.a !== undefined || point.b !== undefined) {
        chartData.push(point)
      }
    }
  } catch {
    // Parse error
  }

  if (chartData.length === 0) {
    return (
      <ChartPlaceholder
        title="Manhattan Chart"
        icon={<BarChart3 className="w-4 h-4 text-purple-400" />}
        message="Manhattan data will populate as overs complete."
      />
    )
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-purple-400" />
        Manhattan Chart
        <span className="text-[10px] text-gray-600 font-normal">(Runs per Over)</span>
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="over"
            stroke="#6b7280"
            fontSize={11}
            label={{ value: 'Overs', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 10 }}
          />
          <YAxis stroke="#6b7280" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: 12,
            }}
          />
          <Legend />
          <Bar
            dataKey="a"
            name={teams.a?.name || 'Team A'}
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            opacity={0.8}
          />
          <Bar
            dataKey="b"
            name={teams.b?.name || 'Team B'}
            fill="#06b6d4"
            radius={[4, 4, 0, 0]}
            opacity={0.8}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ──────────────────────────────────────────────
// Run Rate Chart Component
// ──────────────────────────────────────────────

function RunRateChart({ data, teams }: { data: any; teams: { a: TeamInfo | null; b: TeamInfo | null } }) {
  if (!data) {
    return (
      <ChartPlaceholder
        title="Run Rate"
        icon={<Zap className="w-4 h-4 text-yellow-400" />}
        message="Run rate data will appear as the match progresses."
      />
    )
  }

  const chartData: any[] = []
  try {
    const innings = data.innings || data.match?.innings || data
    const teamEntries = Object.entries(innings) as any[]
    const maxOvers = 20

    for (let over = 1; over <= maxOvers; over++) {
      const point: any = { over }
      for (const [inningsKey, inningsVal] of teamEntries) {
        const overs = inningsVal?.overs || inningsVal?.graph || []
        const teamSide = inningsKey.includes('a') ? 'a' : 'b'
        if (Array.isArray(overs)) {
          const overData = overs[over - 1] || overs[over]
          if (overData !== undefined) {
            const raw = typeof overData === 'object'
              ? overData.run_rate || overData.cumulative_run_rate
              : overData
            const n = Number(raw); if (Number.isFinite(n)) point[teamSide] = n
          }
        } else if (typeof overs === 'object') {
          const overData = overs[over] || overs[`${over}`]
          if (overData !== undefined) {
            const raw = typeof overData === 'object'
              ? overData.run_rate || overData.cumulative_run_rate
              : overData
            const n = Number(raw); if (Number.isFinite(n)) point[teamSide] = n
          }
        }
      }
      if (point.a !== undefined || point.b !== undefined) {
        chartData.push(point)
      }
    }
  } catch {
    // Parse error
  }

  if (chartData.length === 0) {
    return (
      <ChartPlaceholder
        title="Run Rate"
        icon={<Zap className="w-4 h-4 text-yellow-400" />}
        message="Run rate data will populate as overs complete."
      />
    )
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-yellow-400" />
        Run Rate Progression
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="over"
            stroke="#6b7280"
            fontSize={11}
            label={{ value: 'Overs', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 10 }}
          />
          <YAxis stroke="#6b7280" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: 12,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="a"
            name={teams.a?.name || 'Team A'}
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ fill: '#10b981', r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="b"
            name={teams.b?.name || 'Team B'}
            stroke="#06b6d4"
            strokeWidth={2.5}
            dot={{ fill: '#06b6d4', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ──────────────────────────────────────────────
// Chart Placeholder
// ──────────────────────────────────────────────

function ChartPlaceholder({
  title,
  icon,
  message,
}: {
  title: string
  icon: React.ReactNode
  message: string
}) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        {icon}
        {title}
      </h3>
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-gray-500 text-sm text-center">{message}</p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Current Players at the Crease
// ──────────────────────────────────────────────

function CurrentPlayersPanel({ players }: { players: CurrentPlayers }) {
  const { striker, nonStriker, bowler } = players

  if (!striker && !nonStriker && !bowler) return null

  const fmt = (v: number | null, dp = 0) =>
    v !== null ? (dp ? v.toFixed(dp) : String(v)) : '—'

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3">
      {/* Single row: batsmen + bowler */}
      <div className="flex items-center gap-2">
        {/* Striker */}
        {striker && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-bold text-xs leading-tight truncate">{striker.name || '—'}</p>
              <p className="text-[10px] text-gray-500">
                <span className="text-emerald-400 font-mono font-bold text-sm">{fmt(striker.runs)}</span>
                <span className="text-gray-600">({fmt(striker.balls)})</span>
                <span className="ml-1.5 text-gray-500">SR {fmt(striker.strikeRate, 0)}</span>
                {striker.fours !== null && <span className="ml-1 text-gray-500">4s:{striker.fours}</span>}
                {striker.sixes !== null && <span className="ml-1 text-gray-500">6s:{striker.sixes}</span>}
              </p>
            </div>
          </div>
        )}

        {/* Divider */}
        {striker && nonStriker && <div className="w-px h-8 bg-gray-700 flex-shrink-0" />}

        {/* Non-striker */}
        {nonStriker && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-gray-200 font-semibold text-xs leading-tight truncate">{nonStriker.name || '—'}</p>
              <p className="text-[10px] text-gray-500">
                <span className="text-gray-300 font-mono font-bold text-sm">{fmt(nonStriker.runs)}</span>
                <span className="text-gray-600">({fmt(nonStriker.balls)})</span>
                <span className="ml-1.5 text-gray-500">SR {fmt(nonStriker.strikeRate, 0)}</span>
                {nonStriker.fours !== null && <span className="ml-1 text-gray-500">4s:{nonStriker.fours}</span>}
                {nonStriker.sixes !== null && <span className="ml-1 text-gray-500">6s:{nonStriker.sixes}</span>}
              </p>
            </div>
          </div>
        )}

        {/* Bowler */}
        {bowler && (
          <>
            <div className="w-px h-8 bg-gray-700 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-red-400 text-xs flex-shrink-0">⚡</span>
              <div>
                <p className="text-white font-bold text-xs leading-tight">{bowler.name || '—'}</p>
                <p className="text-[10px] text-gray-500">
                  <span className="text-red-400 font-mono font-bold text-sm">{fmt(bowler.wickets)}/{fmt(bowler.runs)}</span>
                  <span className="ml-1.5">{fmt(bowler.overs)} ov</span>
                  {bowler.economy !== null && <span className="ml-1">Eco {fmt(bowler.economy, 1)}</span>}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Live Match Insights
// ──────────────────────────────────────────────

function MatchInsights({ match, probability }: { match: MatchData; probability: Probability }) {
  const isLive = match.status === 'started' || match.status === 'live' || match.playStatus === 'in_play'
  const innings = match.innings

  // Generate dynamic insights based on match state
  const insights: string[] = []

  if (innings.length >= 1 && innings[0].runs !== null) {
    const firstInnings = innings[0]
    const oversNum = firstInnings.overs !== null ? parseFloat(String(firstInnings.overs)) : 0
    const rr = firstInnings.runRate || (firstInnings.runs && oversNum ? firstInnings.runs / oversNum : 0)
    if (rr > 10) insights.push(`Explosive start! Run rate of ${typeof rr === 'number' ? rr.toFixed(1) : rr} in the ${firstInnings.battingTeam === match.teams.a?.key ? match.teams.a?.name : match.teams.b?.name} innings`)
    if (firstInnings.wickets !== null && firstInnings.wickets >= 3 && oversNum > 0 && oversNum <= 6) {
      insights.push(`Early wickets falling! ${firstInnings.wickets} wickets in the powerplay`)
    }
    if (firstInnings.runs !== null && firstInnings.runs > 180) {
      insights.push(`Massive total of ${firstInnings.runs} — tough chase ahead`)
    }
  }

  if (innings.length >= 2 && innings[1].runs !== null && innings[0].runs !== null) {
    const target = innings[0].runs + 1
    const chaseRuns = innings[1].runs
    const chaseOvers = innings[1].overs !== null ? parseFloat(String(innings[1].overs)) : 0
    const remaining = target - chaseRuns
    const oversLeft = 20 - chaseOvers
    const reqRR = oversLeft > 0 ? remaining / oversLeft : 0

    if (reqRR > 12) insights.push(`Required rate of ${reqRR.toFixed(1)} — chase getting difficult`)
    else if (reqRR < 6) insights.push(`Only ${reqRR.toFixed(1)} runs per over needed — comfortable chase`)

    if (remaining <= 30 && oversLeft >= 3) {
      insights.push(`${remaining} runs needed from ${(oversLeft * 6).toFixed(0)} balls — game in the balance!`)
    }
  }

  if (probability.data) {
    const diff = Math.abs(probability.data.teamA.pct - probability.data.teamB.pct)
    if (diff <= 10) insights.push('This is a neck-and-neck contest! Either team can win')
    else if (diff >= 30) {
      const fav = probability.data.teamA.pct > probability.data.teamB.pct
        ? probability.data.teamA.name
        : probability.data.teamB.name
      insights.push(`${fav} are in a commanding position`)
    }
  }

  if (match.toss) {
    const tossWinner = match.toss.winner === 'a' ? match.teams.a?.name : match.teams.b?.name
    insights.push(`${tossWinner} won the toss and chose to ${match.toss.decision}`)
  }

  if (insights.length === 0) {
    insights.push('Match analysis will update as the game progresses')
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-orange-400" />
        AI Match Insights
        {isLive && <span className="text-[10px] text-red-400 animate-pulse">LIVE</span>}
      </h3>
      <div className="space-y-2">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm">
            <span className="text-yellow-400 mt-0.5 flex-shrink-0">▸</span>
            <span className="text-gray-300">{insight}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Stats Types
// ──────────────────────────────────────────────

interface BattingStat {
  name: string
  playerId: number
  runs: number
  balls: number
  fours: number
  sixes: number
  strikeRate: number
  dismissed: boolean
  dismissalType: string | null
  teamSide: 'a' | 'b'
  scoreboard: string
}

interface BowlingStat {
  name: string
  playerId: number
  overs: number
  balls: number
  runs: number
  wickets: number
  economy: number
  maidens: number
  teamSide: 'a' | 'b'
  scoreboard: string
}

interface TeamFormMatch {
  matchId: string
  opponent: string
  result: 'won' | 'lost' | 'nr'
  score: string
  date: string
}

interface MatchStatsData {
  batting: BattingStat[]
  bowling: BowlingStat[]
  overByOver: any[]
  playerCareer: Record<string, any>
  teamLastFive: { a: TeamFormMatch[]; b: TeamFormMatch[] }
  scoreTotals: Record<string, { total: number; wickets: number; overs: string; extras: number }>
  teams: { a: { id: number; name: string; code: string }; b: { id: number; name: string; code: string } }
  prediction?: any
  livePrediction?: any
}

// ──────────────────────────────────────────────
// Scorecard Tab
// ──────────────────────────────────────────────

function ScorecardTab({ stats }: { stats: MatchStatsData }) {
  const innings = ['S1', 'S2']
  return (
    <div className="space-y-6">
      {innings.map((sb) => {
        const bat = stats.batting.filter((b) => b.scoreboard === sb)
        const bowl = stats.bowling.filter((b) => b.scoreboard === sb)
        const totals = stats.scoreTotals[sb]
        if (bat.length === 0 && bowl.length === 0) return null

        const battingTeamSide = bat[0]?.teamSide ?? 'a'
        const battingTeam = stats.teams[battingTeamSide]
        const bowlingTeam = stats.teams[battingTeamSide === 'a' ? 'b' : 'a']

        return (
          <div key={sb} className="bg-gray-800/60 border border-gray-700/50 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-700/40 border-b border-gray-700/50 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                {battingTeam?.name || ''} Innings
              </span>
              {totals && (
                <span className="text-emerald-400 font-mono text-sm font-bold">
                  {totals.total}/{totals.wickets} ({totals.overs} ov)
                </span>
              )}
            </div>

            {bat.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700/40">
                      <th className="text-left px-4 py-2 text-gray-400 font-medium w-1/3">Batter</th>
                      <th className="px-2 py-2 text-gray-400 font-medium text-right">R</th>
                      <th className="px-2 py-2 text-gray-400 font-medium text-right">B</th>
                      <th className="px-2 py-2 text-gray-400 font-medium text-right">4s</th>
                      <th className="px-2 py-2 text-gray-400 font-medium text-right">6s</th>
                      <th className="px-2 py-2 text-gray-400 font-medium text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bat.map((b) => (
                      <tr key={b.playerId} className="border-b border-gray-700/20 hover:bg-gray-700/20 transition-colors">
                        <td className="px-4 py-2">
                          <p className="text-white font-medium">{b.name}</p>
                          {b.dismissed && b.dismissalType && (
                            <p className="text-gray-500 text-[10px] mt-0.5 capitalize">{b.dismissalType}</p>
                          )}
                          {!b.dismissed && <p className="text-emerald-400 text-[10px] mt-0.5">not out</p>}
                        </td>
                        <td className="px-2 py-2 text-right text-white font-bold">{b.runs}</td>
                        <td className="px-2 py-2 text-right text-gray-300">{b.balls}</td>
                        <td className="px-2 py-2 text-right text-gray-300">{b.fours}</td>
                        <td className="px-2 py-2 text-right text-gray-300">{b.sixes}</td>
                        <td className="px-2 py-2 text-right text-cyan-400">{b.strikeRate.toFixed(1)}</td>
                      </tr>
                    ))}
                    {totals && (
                      <tr className="bg-gray-700/20">
                        <td className="px-4 py-2 text-gray-400 text-[11px]">
                          Extras: {totals.extras ?? 0}
                        </td>
                        <td colSpan={5} className="px-2 py-2 text-right text-white font-bold text-sm">
                          Total: {totals.total}/{totals.wickets} ({totals.overs} ov)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {bowl.length > 0 && (
              <div className="overflow-x-auto border-t border-gray-700/40 mt-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider px-4 py-2 font-medium">
                  {bowlingTeam?.name || ''} — Bowling
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700/40">
                      <th className="text-left px-4 py-2 text-gray-400 font-medium w-1/3">Bowler</th>
                      <th className="px-2 py-2 text-gray-400 font-medium text-right">O</th>
                      <th className="px-2 py-2 text-gray-400 font-medium text-right">M</th>
                      <th className="px-2 py-2 text-gray-400 font-medium text-right">R</th>
                      <th className="px-2 py-2 text-gray-400 font-medium text-right">W</th>
                      <th className="px-2 py-2 text-gray-400 font-medium text-right">Eco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bowl.map((b) => (
                      <tr key={b.playerId} className="border-b border-gray-700/20 hover:bg-gray-700/20 transition-colors">
                        <td className="px-4 py-2 text-white font-medium">{b.name}</td>
                        <td className="px-2 py-2 text-right text-gray-300">{b.overs.toFixed(1)}</td>
                        <td className="px-2 py-2 text-right text-gray-300">{b.maidens}</td>
                        <td className="px-2 py-2 text-right text-gray-300">{b.runs}</td>
                        <td className="px-2 py-2 text-right text-white font-bold">{b.wickets}</td>
                        <td className="px-2 py-2 text-right text-purple-400">{b.economy.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────
// Players Tab
// ──────────────────────────────────────────────

function PlayerCard({ batter, career }: { batter: BattingStat; career?: any }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
          {batter.name.charAt(0)}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{batter.name}</p>
          <p className="text-gray-500 text-[10px]">Batter</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3 bg-gray-900/40 rounded-lg p-2">
        <div className="text-center">
          <p className="text-emerald-400 font-bold text-lg">{batter.runs}</p>
          <p className="text-gray-500 text-[10px]">Runs</p>
        </div>
        <div className="text-center">
          <p className="text-white font-semibold">{batter.balls}</p>
          <p className="text-gray-500 text-[10px]">Balls</p>
        </div>
        <div className="text-center">
          <p className="text-cyan-400 font-semibold">{batter.strikeRate.toFixed(0)}</p>
          <p className="text-gray-500 text-[10px]">SR</p>
        </div>
      </div>
      <div className="flex gap-3 text-xs text-gray-400 mb-3">
        <span>{batter.fours} fours</span>
        <span>{batter.sixes} sixes</span>
        {!batter.dismissed && <span className="text-emerald-400">not out</span>}
      </div>
      {career && (
        <div className="border-t border-gray-700/40 pt-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">T20 Career</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div><p className="text-white font-medium">{career.t20Matches}</p><p className="text-gray-600 text-[10px]">Matches</p></div>
            <div><p className="text-white font-medium">{career.t20Average ?? '—'}</p><p className="text-gray-600 text-[10px]">Avg</p></div>
            <div><p className="text-white font-medium">{career.t20StrikeRate ?? '—'}</p><p className="text-gray-600 text-[10px]">SR</p></div>
            <div><p className="text-white font-medium">{career.t20HighScore ?? '—'}</p><p className="text-gray-600 text-[10px]">HS</p></div>
            <div><p className="text-white font-medium">{career.t20Fifties}</p><p className="text-gray-600 text-[10px]">50s</p></div>
            <div><p className="text-white font-medium">{career.t20Hundreds}</p><p className="text-gray-600 text-[10px]">100s</p></div>
          </div>
        </div>
      )}
    </div>
  )
}

function BowlerCard({ bowler, career }: { bowler: BowlingStat; career?: any }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
          {bowler.name.charAt(0)}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{bowler.name}</p>
          <p className="text-gray-500 text-[10px]">Bowler</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3 bg-gray-900/40 rounded-lg p-2">
        <div className="text-center">
          <p className="text-purple-400 font-bold text-lg">{bowler.wickets}</p>
          <p className="text-gray-500 text-[10px]">Wickets</p>
        </div>
        <div className="text-center">
          <p className="text-white font-semibold">{bowler.runs}</p>
          <p className="text-gray-500 text-[10px]">Runs</p>
        </div>
        <div className="text-center">
          <p className="text-yellow-400 font-semibold">{bowler.economy.toFixed(1)}</p>
          <p className="text-gray-500 text-[10px]">Eco</p>
        </div>
      </div>
      <div className="text-xs text-gray-400 mb-3">{bowler.overs.toFixed(1)} overs</div>
      {career && (
        <div className="border-t border-gray-700/40 pt-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">T20 Career</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div><p className="text-white font-medium">{career.t20Matches}</p><p className="text-gray-600 text-[10px]">Matches</p></div>
            <div><p className="text-white font-medium">{career.t20Wickets}</p><p className="text-gray-600 text-[10px]">Wkts</p></div>
            <div><p className="text-white font-medium">{career.t20Economy ?? '—'}</p><p className="text-gray-600 text-[10px]">Eco</p></div>
            <div><p className="text-white font-medium">{career.t20BowlAvg ?? '—'}</p><p className="text-gray-600 text-[10px]">Avg</p></div>
            <div><p className="text-white font-medium">{career.t20BowlSR ?? '—'}</p><p className="text-gray-600 text-[10px]">SR</p></div>
            <div><p className="text-white font-medium">{career.t20FiveWickets}</p><p className="text-gray-600 text-[10px]">5W</p></div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayersTab({ stats }: { stats: MatchStatsData }) {
  const topBattersA = [...stats.batting].filter((b) => b.teamSide === 'a').sort((a, b) => b.runs - a.runs).slice(0, 3)
  const topBattersB = [...stats.batting].filter((b) => b.teamSide === 'b').sort((a, b) => b.runs - a.runs).slice(0, 3)
  const topBowlersA = [...stats.bowling].filter((b) => b.teamSide === 'a').sort((a, b) => b.wickets - a.wickets || a.economy - b.economy).slice(0, 2)
  const topBowlersB = [...stats.bowling].filter((b) => b.teamSide === 'b').sort((a, b) => b.wickets - a.wickets || a.economy - b.economy).slice(0, 2)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Batters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-xs text-emerald-400 font-medium">{stats.teams.a.name}</p>
            {topBattersA.map((b) => <PlayerCard key={b.playerId} batter={b} career={stats.playerCareer[String(b.playerId)]} />)}
            {topBattersA.length === 0 && <p className="text-gray-500 text-sm">No batting data yet</p>}
          </div>
          <div className="space-y-3">
            <p className="text-xs text-cyan-400 font-medium">{stats.teams.b.name}</p>
            {topBattersB.map((b) => <PlayerCard key={b.playerId} batter={b} career={stats.playerCareer[String(b.playerId)]} />)}
            {topBattersB.length === 0 && <p className="text-gray-500 text-sm">No batting data yet</p>}
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Bowlers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-xs text-emerald-400 font-medium">{stats.teams.a.name}</p>
            {topBowlersA.map((b) => <BowlerCard key={b.playerId} bowler={b} career={stats.playerCareer[String(b.playerId)]} />)}
            {topBowlersA.length === 0 && <p className="text-gray-500 text-sm">No bowling data yet</p>}
          </div>
          <div className="space-y-3">
            <p className="text-xs text-cyan-400 font-medium">{stats.teams.b.name}</p>
            {topBowlersB.map((b) => <BowlerCard key={b.playerId} bowler={b} career={stats.playerCareer[String(b.playerId)]} />)}
            {topBowlersB.length === 0 && <p className="text-gray-500 text-sm">No bowling data yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Teams Tab
// ──────────────────────────────────────────────

function TeamFormRow({ match }: { match: TeamFormMatch }) {
  const resultColor =
    match.result === 'won' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : match.result === 'lost' ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : 'bg-gray-700/40 text-gray-400 border-gray-600/30'

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-700/30 last:border-0">
      <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${resultColor}`}>
        {match.result === 'won' ? 'W' : match.result === 'lost' ? 'L' : 'N'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">vs {match.opponent}</p>
        <p className="text-gray-500 text-[10px]">{match.date}</p>
      </div>
      <p className="text-gray-400 text-[10px] font-mono flex-shrink-0">{match.score}</p>
    </div>
  )
}

function TeamsTab({ stats }: { stats: MatchStatsData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(['a', 'b'] as const).map((side) => {
        const team = stats.teams[side]
        const form = stats.teamLastFive[side]
        const wins = form.filter((m) => m.result === 'won').length
        const losses = form.filter((m) => m.result === 'lost').length
        const summary = form.map((m) => m.result === 'won' ? 'W' : m.result === 'lost' ? 'L' : 'N').join('-')

        return (
          <div key={side} className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold text-sm ${side === 'a' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {team.name}
              </h3>
              {summary && (
                <span className="text-[10px] text-gray-500 font-mono bg-gray-700/40 px-2 py-1 rounded">
                  {summary}
                </span>
              )}
            </div>
            {form.length > 0 ? (
              <>
                <div className="flex gap-1.5 mb-4">
                  {form.map((m, i) => (
                    <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
                      m.result === 'won' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : m.result === 'lost' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-gray-700/40 text-gray-400 border-gray-600/30'
                    }`}>
                      {m.result === 'won' ? 'W' : m.result === 'lost' ? 'L' : 'N'}
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mb-4 text-xs">
                  <span className="text-emerald-400">{wins} wins</span>
                  <span className="text-red-400">{losses} losses</span>
                  <span className="text-gray-500">{form.length - wins - losses} N/R</span>
                </div>
                {form.map((m) => <TeamFormRow key={m.matchId} match={m} />)}
              </>
            ) : (
              <p className="text-gray-500 text-sm">No recent match data available</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────
// Prediction Tab
// ──────────────────────────────────────────────

function PredictionTab({ stats, match, isLive }: { stats: MatchStatsData | null; match: MatchData; isLive: boolean }) {
  const prediction = stats?.prediction as any
  const livePrediction = stats?.livePrediction as any
  const teamAName = match?.teams?.a?.name || 'Team A'
  const teamBName = match?.teams?.b?.name || 'Team B'

  return (
    <div className="space-y-4">
      {/* Live projected score */}
      {isLive && livePrediction && (
        <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 animate-pulse" />
            Live Match Projection
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="bg-gray-900/60 rounded-xl p-3">
              <p className="text-2xl font-bold font-mono text-white">{livePrediction.currentScore}</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Current</p>
            </div>
            <div className="bg-gray-900/60 rounded-xl p-3">
              <p className="text-2xl font-bold font-mono text-yellow-400">{livePrediction.currentRR}</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Run Rate</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <p className="text-2xl font-bold font-mono text-emerald-400">{livePrediction.projectedTotal}</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Projected</p>
            </div>
            <div className="bg-gray-900/60 rounded-xl p-3">
              <p className="text-2xl font-bold font-mono text-cyan-400">{livePrediction.oversCompleted}/20</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Overs</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Win Prediction */}
      {prediction ? (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-5">
            <Brain className="w-4 h-4 text-purple-400" />
            AI Win Prediction
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${
              prediction.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : prediction.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              : 'bg-gray-700/50 text-gray-400 border-gray-600/30'
            }`}>
              {prediction.confidence} confidence
            </span>
          </h3>

          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <p className="text-4xl font-bold text-emerald-400 font-mono">{prediction.winProbabilityA}%</p>
              <p className="text-sm text-gray-300 mt-2 font-medium">{prediction.teamA}</p>
            </div>
            <div className="flex flex-col items-center gap-1 px-4">
              <span className="text-gray-600 text-lg font-bold">VS</span>
              {prediction.winProbabilityA > prediction.winProbabilityB
                ? <span className="text-[10px] text-emerald-400">← favoured</span>
                : <span className="text-[10px] text-cyan-400">favoured →</span>}
            </div>
            <div className="text-center flex-1">
              <p className="text-4xl font-bold text-cyan-400 font-mono">{prediction.winProbabilityB}%</p>
              <p className="text-sm text-gray-300 mt-2 font-medium">{prediction.teamB}</p>
            </div>
          </div>

          <div className="relative w-full h-6 rounded-full overflow-hidden bg-gray-700/50 flex mb-6">
            <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
              style={{ width: `${prediction.winProbabilityA}%` }} />
            <div className="w-0.5 h-full bg-gray-900 flex-shrink-0" />
            <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 flex-1" />
          </div>

          {Array.isArray(prediction.tips) && prediction.tips.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Star className="w-3 h-3" /> Betting Tips
              </p>
              <div className="space-y-2">
                {(prediction.tips as string[]).map((tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-gray-900/50 px-4 py-2.5 rounded-xl">
                    <span className="text-yellow-400 flex-shrink-0 mt-0.5">▸</span>
                    <span className="text-gray-300">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {prediction.reasoning && (
            <div className="bg-gray-900/40 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">AI Reasoning</p>
              <p className="text-sm text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: prediction.reasoning.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-10 text-center">
          <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-sm mb-1">No AI prediction available for this match.</p>
          <p className="text-gray-600 text-xs mb-5">Generate one from the analysis page.</p>
          <Link
            href={`/analysis?match=${match?.key}`}
            className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl transition-colors font-medium"
          >
            Generate AI Prediction
          </Link>
        </div>
      )}

      {prediction?.conditions && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-orange-400" />
            Match Conditions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([
              { label: 'Venue', value: (prediction.conditions as any)?.venue },
              { label: 'Pitch Type', value: (prediction.conditions as any)?.pitchType },
              { label: 'Weather', value: (prediction.conditions as any)?.weatherImpact },
              { label: 'Toss Advice', value: (prediction.conditions as any)?.tossAdvice },
            ]).filter(c => c.value).map(({ label, value }) => (
              <div key={label} className="bg-gray-900/50 rounded-xl px-4 py-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm text-gray-300">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Main Live Match Page
// ──────────────────────────────────────────────

export default function LiveMatchPage() {
  const params = useParams()
  const router = useRouter()
  const matchKey = (params?.matchKey ?? '') as string

  const [liveData, setLiveData] = useState<LiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<'commentary' | 'graphs' | 'scorecard' | 'players' | 'teams' | 'prediction'>('commentary')
  const [matchStats, setMatchStats] = useState<MatchStatsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const statsLoadedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/cricket/match/${matchKey}/full-live?t=${Date.now()}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (data.success) {
        setLiveData(data)
        setError(null)
      } else {
        setError(data.error || 'Failed to load match data')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
      setLastRefresh(Date.now())
    }
  }, [matchKey])

  // Lazy stats loader
  const loadStats = useCallback(async () => {
    if (statsLoadedRef.current || !matchKey) return
    statsLoadedRef.current = true
    setStatsLoading(true)
    setStatsError(null)
    try {
      const res = await fetch(`/api/cricket/match/${matchKey}/stats`)
      if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`)
      const data = await res.json()
      setMatchStats(data)
    } catch (e: any) {
      setStatsError(e.message || 'Failed to load stats')
      statsLoadedRef.current = false // allow retry
    } finally {
      setStatsLoading(false)
    }
  }, [matchKey])

  // Trigger stats load when user switches to stats tabs
  useEffect(() => {
    if (activeTab === 'scorecard' || activeTab === 'players' || activeTab === 'teams' || activeTab === 'prediction') {
      loadStats()
    }
  }, [activeTab, loadStats])

  // Auto-load stats 4s after initial data arrives (for scorecard player cards)
  useEffect(() => {
    if (!liveData) return
    const t = setTimeout(() => loadStats(), 4000)
    return () => clearTimeout(t)
  }, [!!liveData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchData()

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 5_000) // Every 5 seconds
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchData, autoRefresh])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading live match data...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !liveData) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
          <Link href="/" className="block mt-3 text-sm text-gray-500 hover:text-gray-300">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!liveData) return null

  const { match, currentPlayers, ballByBall, probability, predictionInsights, graphs } = liveData
  const isLive =
    match.status === 'started' ||
    match.status === 'live' ||
    match.playStatus === 'in_play'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">{match.shortName || match.name}</h1>
              {match.subTitle && <p className="text-[10px] text-gray-500">{String(match.subTitle)}</p>}
            </div>
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-gray-800 text-gray-500 border border-gray-700'
              }`}
            >
              <Wifi className="w-3 h-3" />
              {autoRefresh ? 'Auto (5s)' : 'Paused'}
            </button>

            {/* Manual refresh */}
            <button
              onClick={fetchData}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Refresh now"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>

            {/* Link to AI analysis */}
            <Link
              href={`/analysis?match=${matchKey}`}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20"
            >
              AI Analysis
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Score + Probability Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <Scorecard
              match={match}
              isLive={isLive}
              currentPlayers={currentPlayers}
              ballByBall={ballByBall}
              insights={predictionInsights}
              matchStats={matchStats}
            />
          </div>
          <div>
            <WinProbabilitySection probability={probability} insights={predictionInsights} />
          </div>
        </div>

        {/* YouTube Live Player — shown when a broadcast is active */}
        <div className="mb-6">
          <YouTubePlayer
            matchKey={matchKey}
            teamA={match.teams.a?.name}
            teamB={match.teams.b?.name}
          />
        </div>

        {/* AI Insights */}
        <div className="mb-6">
          <MatchInsights match={match} probability={probability} />
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('commentary')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'commentary'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            Ball-by-Ball
            {ballByBall.length > 0 && (
              <span className="text-[10px] bg-gray-700/50 px-1.5 py-0.5 rounded">
                {ballByBall.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('graphs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'graphs'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Graphs & Charts
          </button>
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'scorecard'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
            }`}
          >
            <Target className="w-4 h-4" />
            Scorecard
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'players'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            Players
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'teams'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Teams
          </button>
          <button
            onClick={() => setActiveTab('prediction')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'prediction'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
            }`}
          >
            <Brain className="w-4 h-4" />
            Prediction
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'commentary' && (
          <BallByBallCommentary balls={ballByBall} />
        )}

        {activeTab === 'graphs' && (
          <div className="space-y-4">
            {/* Worm Chart */}
            <WormChart data={graphs.worm} teams={match.teams} />

            {/* Manhattan + Run Rate side by side on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ManhattanChart data={graphs.manhattan} teams={match.teams} />
              <RunRateChart data={graphs.runRate} teams={match.teams} />
            </div>
          </div>
        )}

        {/* Stats Tabs (Scorecard / Players / Teams / Prediction) */}
        {(activeTab === 'scorecard' || activeTab === 'players' || activeTab === 'teams' || activeTab === 'prediction') && (
          <div>
            {statsLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-gray-400 text-sm">Loading detailed statistics...</p>
                <p className="text-gray-600 text-xs">Fetching player careers & team history</p>
              </div>
            )}
            {statsError && !statsLoading && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                <p className="text-red-400 text-sm font-medium mb-2">Failed to load stats</p>
                <p className="text-gray-500 text-xs mb-4">{statsError}</p>
                <button
                  onClick={() => { statsLoadedRef.current = false; loadStats() }}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            {matchStats && !statsLoading && (
              <>
                {activeTab === 'scorecard' && <ScorecardTab stats={matchStats} />}
                {activeTab === 'players' && <PlayersTab stats={matchStats} />}
                {activeTab === 'teams' && <TeamsTab stats={matchStats} />}
                {activeTab === 'prediction' && <PredictionTab stats={matchStats} match={match} isLive={isLive} />}
              </>
            )}
          </div>
        )}

        {/* Affiliate Banner */}
        <AffiliateBanner />

        {/* Match Info Footer */}
        <div className="mt-8 bg-gray-800/30 border border-gray-700/30 rounded-2xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Format</p>
              <p className="text-sm text-gray-300 font-medium">{match.format?.toUpperCase() || 'T20'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Venue</p>
              <p className="text-sm text-gray-300 font-medium">{match.venue?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Status</p>
              <p className={`text-sm font-medium ${isLive ? 'text-red-400' : 'text-gray-300'}`}>
                {isLive ? 'In Progress' : match.status}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-sm text-gray-300 font-medium">
                {lastRefresh ? new Date(lastRefresh).toLocaleTimeString() : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
