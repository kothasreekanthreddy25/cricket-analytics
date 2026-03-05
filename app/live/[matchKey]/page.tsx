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
} from 'lucide-react'
import YouTubePlayer from '@/components/YouTubePlayer'
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

interface LiveData {
  success: boolean
  match: MatchData
  currentPlayers: CurrentPlayers
  ballByBall: BallEvent[]
  probability: Probability
  graphs: {
    worm: any
    manhattan: any
    runRate: any
  }
  errors: Record<string, string | null>
  timestamp: string
}

// ──────────────────────────────────────────────
// Win Probability Bar Component
// ──────────────────────────────────────────────

function WinProbabilitySection({ probability }: { probability: Probability }) {
  if (!probability.data) {
    return (
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-yellow-400" />
          Win Probability
        </h3>
        <p className="text-gray-500 text-sm">Probability data will appear when the match starts.</p>
      </div>
    )
  }

  const { teamA, teamB } = probability.data
  const pctA = Math.max(1, Math.min(99, teamA.pct))
  const pctB = Math.max(1, Math.min(99, teamB.pct))

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-yellow-400" />
          Win Probability
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700/50 text-gray-400">
          {probability.source === 'live' ? '🔴 Live' : '📊 Pre-match'}
        </span>
      </div>

      {/* Large probability display */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-center">
          <p className="text-3xl font-bold text-emerald-400 font-mono">{pctA}%</p>
          <p className="text-sm text-gray-400 mt-1">{teamA.name}</p>
        </div>
        <div className="text-gray-600 text-lg font-bold">VS</div>
        <div className="text-center">
          <p className="text-3xl font-bold text-cyan-400 font-mono">{pctB}%</p>
          <p className="text-sm text-gray-400 mt-1">{teamB.name}</p>
        </div>
      </div>

      {/* Bar */}
      <div className="relative w-full h-5 rounded-full overflow-hidden bg-gray-700/50 flex">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out"
          style={{ width: `${pctA}%` }}
        />
        <div className="w-[3px] h-full bg-gray-900 flex-shrink-0" />
        <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-1000 ease-out flex-1" />
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>{teamA.code}</span>
        <span>{teamB.code}</span>
      </div>

      {Math.abs(pctA - pctB) >= 15 && (
        <p className="text-center text-xs text-yellow-500/80 mt-3">
          ⭐ {pctA > pctB ? teamA.name : teamB.name} strongly favoured
        </p>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Scorecard Component
// ──────────────────────────────────────────────

function Scorecard({
  match,
  isLive,
}: {
  match: MatchData
  isLive: boolean
}) {
  const teamA = match.teams.a
  const teamB = match.teams.b

  return (
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-emerald-500/30 rounded-2xl p-6 shadow-lg shadow-emerald-500/5">
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
            {match.venue.city}
          </span>
        )}
      </div>

      <h2 className="text-lg font-bold text-white mb-4">
        {match.name}
        {match.subTitle && (
          <span className="text-sm text-gray-500 font-normal ml-2">{match.subTitle}</span>
        )}
      </h2>

      {/* Scores */}
      <div className="space-y-3">
        {match.innings.length > 0 ? (
          match.innings.map((inn, i) => {
            // Use teamSide ('a'/'b') for reliable team lookup
            const team = inn.teamSide === 'a' ? teamA : teamB
            const wickets = inn.wickets ?? 0
            return (
              <div
                key={inn.key}
                className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${i === 0 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    {team?.name || (typeof inn.battingTeam === 'string' ? inn.battingTeam : '')}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-bold font-mono ${i === 0 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    {(typeof inn.scoreStr === 'string' && inn.scoreStr) || (inn.runs !== null ? `${inn.runs}/${wickets}` : '—')}
                  </span>
                  {inn.runRate !== null && typeof inn.runRate === 'number' && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      RR: {inn.runRate.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-xl">
              <span className="text-lg font-bold text-emerald-400">{teamA?.name || 'Team A'}</span>
              <span className="text-xl font-mono text-gray-500">Yet to bat</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-xl">
              <span className="text-lg font-bold text-cyan-400">{teamB?.name || 'Team B'}</span>
              <span className="text-xl font-mono text-gray-500">Yet to bat</span>
            </div>
          </>
        )}
      </div>

      {/* Status note */}
      {typeof match.statusNote === 'string' && match.statusNote && (
        <p className="mt-4 text-sm text-emerald-400 font-medium bg-emerald-500/10 px-3 py-2 rounded-lg">
          {match.statusNote}
        </p>
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
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <span className="text-lg leading-none">🏏</span>
        At the Crease
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Batsmen */}
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Batting</p>

          {/* Striker */}
          {striker && (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                {/* On strike indicator */}
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" title="On strike" />
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{striker.name || '—'}</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">On Strike</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-mono font-bold text-xl leading-tight">
                  {fmt(striker.runs)}<span className="text-gray-500 text-sm font-normal">({fmt(striker.balls)})</span>
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  SR: {fmt(striker.strikeRate, 1)}
                  {striker.fours !== null && <span className="ml-2">4s: {striker.fours}</span>}
                  {striker.sixes !== null && <span className="ml-1.5">6s: {striker.sixes}</span>}
                </p>
              </div>
            </div>
          )}

          {/* Non-striker */}
          {nonStriker && (
            <div className="flex items-center justify-between bg-gray-900/50 border border-gray-700/40 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                <div>
                  <p className="text-gray-200 font-semibold text-sm leading-tight">{nonStriker.name || '—'}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Non-striker</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-300 font-mono font-bold text-xl leading-tight">
                  {fmt(nonStriker.runs)}<span className="text-gray-600 text-sm font-normal">({fmt(nonStriker.balls)})</span>
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  SR: {fmt(nonStriker.strikeRate, 1)}
                  {nonStriker.fours !== null && <span className="ml-2">4s: {nonStriker.fours}</span>}
                  {nonStriker.sixes !== null && <span className="ml-1.5">6s: {nonStriker.sixes}</span>}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bowler */}
        {bowler && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Bowling</p>
            <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 h-[calc(100%-24px)]">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-lg leading-none flex-shrink-0">⚡</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{bowler.name || '—'}</p>
                  <p className="text-[10px] text-red-400 mt-0.5">Current Bowler</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-red-400 font-mono font-bold text-xl leading-tight">
                  {fmt(bowler.wickets)}/<span className="text-gray-300">{fmt(bowler.runs)}</span>
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {fmt(bowler.overs)} ov
                  {bowler.economy !== null && <span className="ml-2">Eco: {fmt(bowler.economy, 1)}</span>}
                </p>
              </div>
            </div>
          </div>
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
  const [activeTab, setActiveTab] = useState<'commentary' | 'graphs'>('commentary')
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

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchData()

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 10_000) // Every 10 seconds
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

  const { match, currentPlayers, ballByBall, probability, graphs } = liveData
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
              {autoRefresh ? 'Auto (10s)' : 'Paused'}
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
            <Scorecard match={match} isLive={isLive} />
          </div>
          <div>
            <WinProbabilitySection probability={probability} />
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

        {/* Current Players at the Crease */}
        {currentPlayers && (
          <div className="mb-6">
            <CurrentPlayersPanel players={currentPlayers} />
          </div>
        )}

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
