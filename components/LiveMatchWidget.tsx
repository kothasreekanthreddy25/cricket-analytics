'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Radio, RefreshCw, TrendingUp, Brain, ChevronDown, ChevronUp,
  Users, BarChart3, Trophy, Wifi, WifiOff, Zap, Target,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveMatch { key: string; id: string; teamA: string; teamB: string; scoreA: string | null; scoreB: string | null; statusNote: string; matchType: string }
interface TeamInfo { key: string; name: string; code: string }
interface InningsData { key: string; teamSide: 'a' | 'b'; battingTeam: string; runs: number | null; wickets: number | null; overs: string | number | null; scoreStr: string | null; runRate: number | null }
interface FullLiveData {
  success: boolean
  match: { name: string; status: string; playStatus: string; format: string; statusNote: string; teams: { a: TeamInfo | null; b: TeamInfo | null }; innings: InningsData[]; venue: { name: string; city: string } | null; winner: string | null }
  currentPlayers: { striker: PlayerInfo | null; nonStriker: PlayerInfo | null; bowler: BowlerInfo | null } | null
  ballByBall: BallEvent[]
  probability: { data: { teamA: { name: string; code: string; pct: number }; teamB: { name: string; code: string; pct: number } } | null; source: string }
  predictionInsights: { confidence: string | null; teamAWinRate: number | null; teamBWinRate: number | null; teamAForm: number | null; teamBForm: number | null; teamALast5: FormEntry[]; teamBLast5: FormEntry[]; reasoning: string | null } | null
}
interface PlayerInfo { name: string; runs: number | null; balls: number | null; fours: number | null; sixes: number | null; strikeRate: number | null }
interface BowlerInfo { name: string; overs: number | null; runs: number | null; wickets: number | null; economy: number | null }
interface BallEvent { over: number; ball: number; runs: number; batsmanRuns: number; batsman: string; bowler: string; commentary: string; isWicket: boolean; isFour: boolean; isSix: boolean; innings: string }
interface FormEntry { result: 'W' | 'L'; opponent: string }
interface StatsData {
  batting: BatEntry[]
  bowling: BowlEntry[]
  teamLastFive: { a: HistMatch[]; b: HistMatch[] }
  playerCareer: Record<string, CareerData>
  teams: { a: { name: string; code: string }; b: { name: string; code: string } }
  livePrediction: { projectedTotal: number; currentRR: number; wicketsRemaining: number } | null
}
interface BatEntry { name: string; playerId: number; runs: number; balls: number; fours: number; sixes: number; strikeRate: number; dismissed: boolean; dismissalType: string | null; teamSide: 'a' | 'b' }
interface BowlEntry { name: string; playerId: number; overs: number; runs: number; wickets: number; economy: number; teamSide: 'a' | 'b' }
interface HistMatch { matchId: string; opponent: string; result: string; score: string; date: string }
interface CareerData { t20Matches: number; t20Runs: number; t20Average: number | null; t20StrikeRate: number | null; t20HighScore: string | null; t20Wickets: number; t20Economy: number | null }

// ── Tab types ─────────────────────────────────────────────────────────────────

type Tab = 'score' | 'prediction' | 'history' | 'players'

// ── Ball dot component ────────────────────────────────────────────────────────

function BallDot({ b }: { b: BallEvent }) {
  const label = b.isWicket ? 'W' : b.isSix ? '6' : b.isFour ? '4' : b.batsmanRuns === 0 ? '·' : String(b.batsmanRuns)
  const cls = b.isWicket ? 'bg-red-500 border-red-400 text-white'
    : b.isSix ? 'bg-purple-600 border-purple-400 text-white'
    : b.isFour ? 'bg-blue-600 border-blue-400 text-white'
    : b.batsmanRuns === 0 ? 'bg-gray-800 border-gray-600 text-gray-500'
    : 'bg-emerald-700/80 border-emerald-500/50 text-white'
  return (
    <span
      title={`${b.over}.${b.ball} • ${b.batsman} • ${b.commentary || label}`}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold border flex-shrink-0 ${cls}`}
    >
      {label}
    </span>
  )
}

// ── Win probability bar ───────────────────────────────────────────────────────

function ProbBar({ teamA, teamB, source }: { teamA: { name: string; code: string; pct: number }; teamB: { name: string; code: string; pct: number }; source: string }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t) }, [])
  const pA = Math.max(4, Math.min(96, teamA.pct))
  const pB = 100 - pA
  const fav = pA >= pB ? teamA.name : teamB.name
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] text-gray-500 uppercase">{teamA.code || teamA.name}</p>
          <p className={`text-2xl font-black font-mono ${pA >= pB ? 'text-emerald-400' : 'text-gray-500'}`}>{pA}%</p>
        </div>
        <div className="text-center px-2">
          <p className="text-[9px] text-gray-700 font-bold">VS</p>
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${source === 'live' ? 'bg-red-500/20 text-red-400' : source === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-500'}`}>
            {source === 'live' ? '🔴 Live' : source === 'ai' ? '🤖 AI' : 'Pre-match'}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 uppercase">{teamB.code || teamB.name}</p>
          <p className={`text-2xl font-black font-mono ${pB > pA ? 'text-cyan-400' : 'text-gray-500'}`}>{pB}%</p>
        </div>
      </div>
      <div className="relative h-6 rounded-xl overflow-hidden bg-gray-900 flex">
        <div
          className="h-full flex items-center justify-end pr-2 transition-all duration-1000 ease-out"
          style={{ width: animated ? `${pA}%` : '50%', background: pA >= pB ? 'linear-gradient(90deg,#064e3b,#10b981)' : 'linear-gradient(90deg,#374151,#6b7280)' }}
        >
          {pA >= 30 && <span className="text-[10px] font-bold text-white">{pA}%</span>}
        </div>
        <div className="w-0.5 h-full bg-gray-950 z-10" />
        <div
          className="h-full flex items-center justify-start pl-2 flex-1 transition-all duration-1000 ease-out"
          style={{ background: pB > pA ? 'linear-gradient(90deg,#22d3ee,#0e7490)' : 'linear-gradient(90deg,#374151,#6b7280)' }}
        >
          {pB >= 30 && <span className="text-[10px] font-bold text-white">{pB}%</span>}
        </div>
      </div>
      {Math.abs(pA - pB) >= 10 && (
        <p className="text-[10px] text-center text-gray-500">
          <span className={pA >= pB ? 'text-emerald-400' : 'text-cyan-400'}>{fav}</span> favoured to win
        </p>
      )}
    </div>
  )
}

// ── Form dots ─────────────────────────────────────────────────────────────────

function FormDots({ form, teamName }: { form: FormEntry[]; teamName: string }) {
  const wins = form.filter(f => f.result === 'W').length
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-20 flex-shrink-0 truncate">{teamName}</span>
      <div className="flex gap-1">
        {form.map((f, i) => (
          <span
            key={i}
            title={`vs ${f.opponent} — ${f.result}`}
            className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold border ${f.result === 'W' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}
          >
            {f.result}
          </span>
        ))}
        {Array.from({ length: Math.max(0, 5 - form.length) }).map((_, i) => (
          <span key={i} className="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-700/50 text-gray-700 text-[9px]">–</span>
        ))}
      </div>
      <span className="text-[9px] text-gray-600 ml-auto">{wins}/{form.length}W</span>
    </div>
  )
}

// ── History table ─────────────────────────────────────────────────────────────

function HistoryTable({ matches, teamName }: { matches: HistMatch[]; teamName: string }) {
  if (matches.length === 0) return <p className="text-[11px] text-gray-600 py-2">No recent match data</p>
  const recent = matches.slice(0, 6)
  return (
    <div className="divide-y divide-gray-800/50">
      {recent.map((m, i) => (
        <div key={i} className="flex items-center gap-3 py-2 px-1">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 ${m.result === 'won' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : m.result === 'lost' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-gray-700 text-gray-500 border border-gray-600'}`}>
            {m.result === 'won' ? 'W' : m.result === 'lost' ? 'L' : 'NR'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white font-semibold truncate">vs {m.opponent}</p>
            <p className="text-[10px] text-gray-500 font-mono">{m.score}</p>
          </div>
          <span className="text-[10px] text-gray-600 flex-shrink-0">{m.date}</span>
        </div>
      ))}
    </div>
  )
}

// ── Player card ───────────────────────────────────────────────────────────────

function PlayerCard({ p, career, type }: { p: BatEntry | BowlEntry; career?: CareerData; type: 'bat' | 'bowl' }) {
  const [open, setOpen] = useState(false)
  const bat = p as BatEntry
  const bowl = p as BowlEntry
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{p.name}</p>
          {type === 'bat' ? (
            <p className="text-[10px] font-mono">
              <span className="text-emerald-400">{bat.runs}</span>
              <span className="text-gray-600"> ({bat.balls}b)</span>
              {bat.fours > 0 && <span className="text-blue-400 ml-1">{bat.fours}×4</span>}
              {bat.sixes > 0 && <span className="text-purple-400 ml-1">{bat.sixes}×6</span>}
              <span className="text-gray-500 ml-1">SR:{bat.strikeRate}</span>
              {bat.dismissed && <span className="text-red-400 ml-1.5 text-[9px]">OUT</span>}
            </p>
          ) : (
            <p className="text-[10px] font-mono">
              <span className="text-red-400">{bowl.wickets}wkt</span>
              <span className="text-gray-500">/{bowl.runs}r</span>
              <span className="text-gray-500 ml-1">({bowl.overs.toFixed(1)}ov)</span>
              <span className="text-yellow-400 ml-1">Eco:{bowl.economy}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {career && (
            <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
              {type === 'bat' ? `T20 avg: ${career.t20Average ?? '—'}` : `T20 eco: ${career.t20Economy ?? '—'}`}
            </span>
          )}
          {open ? <ChevronUp className="w-3 h-3 text-gray-600" /> : <ChevronDown className="w-3 h-3 text-gray-600" />}
        </div>
      </button>
      {open && career && (
        <div className="px-3 pb-3 border-t border-gray-800 pt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          {type === 'bat' ? <>
            <div className="flex justify-between text-[10px]"><span className="text-gray-600">T20 matches</span><span className="text-white">{career.t20Matches}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-gray-600">T20 runs</span><span className="text-emerald-400">{career.t20Runs}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-gray-600">Average</span><span className="text-white">{career.t20Average ?? '—'}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-gray-600">Strike Rate</span><span className="text-yellow-400">{career.t20StrikeRate ?? '—'}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-gray-600">High Score</span><span className="text-white">{career.t20HighScore ?? '—'}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-gray-600">50s / 100s</span><span className="text-white">{career.t20Wickets} / {career.t20Matches > 0 ? Math.floor(career.t20Runs / 100) : 0}</span></div>
          </> : <>
            <div className="flex justify-between text-[10px]"><span className="text-gray-600">T20 matches</span><span className="text-white">{career.t20Matches}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-gray-600">T20 wickets</span><span className="text-red-400">{career.t20Wickets}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-gray-600">Economy</span><span className="text-yellow-400">{career.t20Economy ?? '—'}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-gray-600">Avg</span><span className="text-white">{career.t20Average ?? '—'}</span></div>
          </>}
        </div>
      )}
    </div>
  )
}

// ── Main Widget ───────────────────────────────────────────────────────────────

export default function LiveMatchWidget() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [fullData, setFullData] = useState<FullLiveData | null>(null)
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [loadingFull, setLoadingFull] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [tab, setTab] = useState<Tab>('score')
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())
  const [connected, setConnected] = useState(false)
  const [showBalls, setShowBalls] = useState(false)

  // Fetch ticker to find live matches
  const fetchTicker = useCallback(async () => {
    try {
      const res = await fetch('/api/cricket/ticker')
      const data = await res.json()
      const live: LiveMatch[] = data.live || []
      setLiveMatches(live)
      setConnected(true)
      if (live.length > 0 && !selectedKey) {
        setSelectedKey(live[0].key || live[0].id)
      }
    } catch {
      setConnected(false)
    }
  }, [selectedKey])

  // Fetch full live data for selected match
  const fetchFullData = useCallback(async (matchKey: string) => {
    setLoadingFull(true)
    try {
      const res = await fetch(`/api/cricket/match/${matchKey}/full-live`)
      const data = await res.json()
      if (data.success) {
        setFullData(data)
        setLastUpdated(Date.now())
      }
    } catch { /* silent */ } finally {
      setLoadingFull(false)
    }
  }, [])

  // Fetch stats (batting/bowling/history/career)
  const fetchStats = useCallback(async (matchKey: string) => {
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/cricket/match/${matchKey}/stats`)
      const data = await res.json()
      if (!data.error) setStatsData(data)
    } catch { /* silent */ } finally {
      setLoadingStats(false)
    }
  }, [])

  // Initial ticker fetch + 5min refresh
  useEffect(() => {
    fetchTicker()
    const t = setInterval(fetchTicker, 300_000)
    return () => clearInterval(t)
  }, [fetchTicker])

  // Fetch full + stats when selected match changes
  useEffect(() => {
    if (!selectedKey) return
    fetchFullData(selectedKey)
    fetchStats(selectedKey)
  }, [selectedKey, fetchFullData, fetchStats])

  // Auto-refresh full data every 30s when live
  useEffect(() => {
    if (!selectedKey) return
    const isLive = fullData?.match?.playStatus === 'in_play'
    if (!isLive) return
    const t = setInterval(() => fetchFullData(selectedKey), 30_000)
    return () => clearInterval(t)
  }, [selectedKey, fullData?.match?.playStatus, fetchFullData])

  // ── No live matches ──────────────────────────────────────────────────────────
  if (liveMatches.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center gap-3 py-8">
        <div className="flex items-center gap-2 text-gray-500">
          {connected ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4" />}
          <span className="text-sm">{connected ? 'No matches live right now' : 'Connecting...'}</span>
        </div>
        <p className="text-gray-700 text-xs">Live scores will appear automatically when a match starts.</p>
        <Link href="/matches" className="text-emerald-400 text-xs hover:underline">View schedule →</Link>
      </div>
    )
  }

  const match = fullData?.match
  const isLive = match?.playStatus === 'in_play' || match?.status === 'live'
  const teamA = match?.teams?.a
  const teamB = match?.teams?.b
  const inn1 = match?.innings?.[0] ?? null
  const inn2 = match?.innings?.[1] ?? null
  const prob = fullData?.probability
  const insights = fullData?.predictionInsights

  // Current over balls (most recent over)
  const balls = fullData?.ballByBall ?? []
  const currentOver = balls[0]?.over
  const overBalls = balls.filter(b => b.over === currentOver).sort((a, b) => a.ball - b.ball)

  // Chase info
  const chaseInfo = isLive && inn2 && inn1 && inn1.runs !== null && inn2.runs !== null
    ? (() => {
        const target = inn1.runs! + 1
        const oversRaw = parseFloat(String(inn2.overs ?? '0')) || 0
        const ballsDone = Math.floor(oversRaw) * 6 + Math.round((oversRaw % 1) * 10)
        const ballsLeft = Math.max(0, 120 - ballsDone)
        const needed = target - inn2.runs!
        if (needed > 0 && ballsLeft > 0) return { target, needed, ballsLeft, reqRR: (needed / ballsLeft) * 6 }
        return null
      })()
    : null

  const tabs: { key: Tab; label: string; icon: typeof Radio }[] = [
    { key: 'score', label: 'Live Score', icon: Radio },
    { key: 'prediction', label: 'Prediction', icon: Brain },
    { key: 'history', label: 'History', icon: Trophy },
    { key: 'players', label: 'Players', icon: Users },
  ]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/80">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase">
              <Radio className="w-3.5 h-3.5 animate-pulse" /> LIVE
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Wifi className="w-3.5 h-3.5 text-emerald-500" /> Match
            </span>
          )}
          <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
            {match?.format || 'T20'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Match selector if multiple live */}
          {liveMatches.length > 1 && (
            <select
              value={selectedKey ?? ''}
              onChange={e => { setSelectedKey(e.target.value); setFullData(null); setStatsData(null) }}
              className="text-[10px] bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1"
            >
              {liveMatches.map(m => (
                <option key={m.key || m.id} value={m.key || m.id}>{m.teamA} vs {m.teamB}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => selectedKey && fetchFullData(selectedKey)}
            disabled={loadingFull}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingFull ? 'animate-spin' : ''}`} />
          </button>
          <Link href={`/live/${selectedKey}`} className="text-emerald-400 text-[10px] hover:underline">Full →</Link>
        </div>
      </div>

      {/* ── Match name ── */}
      {match && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-sm font-bold text-white">{match.name}</p>
          {match.venue && <p className="text-[10px] text-gray-600">{match.venue.city || match.venue.name}</p>}
        </div>
      )}

      {/* ── Scoreboard (always visible) ── */}
      {loadingFull && !match ? (
        <div className="px-4 pb-4 flex items-center gap-2 text-gray-600 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : match ? (
        <div className="px-4 pb-3">
          <div className="space-y-1.5">
            {match.innings.length > 0 ? match.innings.map((inn, i) => {
              const team = inn.teamSide === 'a' ? teamA : teamB
              const isCurrent = isLive && i === match.innings.length - 1
              const color = i === 0 ? 'text-emerald-400' : 'text-cyan-400'
              return (
                <div key={inn.key} className={`flex items-center justify-between px-3 py-2 rounded-xl ${isCurrent ? 'bg-gray-800/80 border border-gray-700/50' : 'bg-gray-800/30'}`}>
                  <span className={`text-sm font-bold ${color}`}>{team?.name || inn.battingTeam}</span>
                  <div className="text-right">
                    <span className={`text-xl font-bold font-mono ${color}`}>
                      {inn.scoreStr || (inn.runs !== null ? `${inn.runs}/${inn.wickets ?? 0}` : '—')}
                    </span>
                    {inn.overs && <span className="text-[10px] text-gray-500 ml-1.5">({inn.overs} ov)</span>}
                  </div>
                </div>
              )
            }) : (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-800/30 text-gray-500 text-sm">
                Match yet to begin
              </div>
            )}
          </div>

          {/* Chase info */}
          {chaseInfo && (
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Target', value: String(chaseInfo.target), color: 'text-white' },
                { label: 'Need', value: `${chaseInfo.needed} off ${chaseInfo.ballsLeft}b`, color: 'text-yellow-400' },
                { label: 'Req RR', value: chaseInfo.reqRR.toFixed(1), color: chaseInfo.reqRR > 12 ? 'text-red-400' : chaseInfo.reqRR < 7 ? 'text-emerald-400' : 'text-yellow-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-800/60 rounded-lg py-1.5">
                  <p className="text-[9px] text-gray-500 uppercase">{stat.label}</p>
                  <p className={`text-sm font-bold font-mono ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Status note */}
          {match.statusNote && !match.statusNote.startsWith('NS') && (
            <p className="mt-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg">{match.statusNote}</p>
          )}

          {/* Current over */}
          {isLive && overBalls.length > 0 && (
            <div className="mt-3 bg-gray-800/40 border border-gray-700/50 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Over {currentOver}</span>
                <span className="text-[10px] text-gray-600">{overBalls.reduce((s, b) => s + b.runs, 0)} runs</span>
                <button onClick={() => setShowBalls(s => !s)} className="ml-auto text-[10px] text-emerald-400 hover:underline">
                  {showBalls ? 'Hide balls' : 'Show last 24'}
                </button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {overBalls.map((b, i) => <BallDot key={i} b={b} />)}
                {Array.from({ length: Math.max(0, 6 - overBalls.length) }).map((_, i) => (
                  <span key={i} className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-gray-700 text-gray-700 text-[9px]">·</span>
                ))}
              </div>
              {showBalls && (
                <div className="mt-2 pt-2 border-t border-gray-700/50 flex gap-1 flex-wrap">
                  {balls.slice(0, 24).map((b, i) => <BallDot key={i} b={b} />)}
                </div>
              )}
            </div>
          )}

          {/* Current players */}
          {isLive && fullData?.currentPlayers?.striker && (
            <div className="mt-2 bg-gray-800/40 rounded-xl px-3 py-2 space-y-1.5">
              <p className="text-[9px] text-gray-600 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> At the Crease
              </p>
              {[fullData.currentPlayers.striker, fullData.currentPlayers.nonStriker].filter(Boolean).map((p, i) => p && (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                    <span className="text-xs text-white font-semibold truncate max-w-[120px]">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-emerald-400">{p.runs ?? '—'}</span>
                    <span className="text-gray-600">({p.balls ?? '—'}b)</span>
                    {p.fours != null && p.fours > 0 && <span className="text-blue-400">{p.fours}×4</span>}
                    {p.sixes != null && p.sixes > 0 && <span className="text-purple-400">{p.sixes}×6</span>}
                  </div>
                </div>
              ))}
              {fullData.currentPlayers.bowler && (
                <div className="flex items-center justify-between border-t border-gray-700/30 pt-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <span className="text-xs text-white font-semibold truncate max-w-[120px]">{fullData.currentPlayers.bowler.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-red-400">{fullData.currentPlayers.bowler.wickets ?? 0}/{fullData.currentPlayers.bowler.runs ?? 0}</span>
                    <span className="text-gray-600">{fullData.currentPlayers.bowler.overs} ov</span>
                    {fullData.currentPlayers.bowler.economy != null && <span className="text-yellow-400">Eco:{fullData.currentPlayers.bowler.economy}</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* ── Tabs ── */}
      <div className="flex border-t border-gray-800">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors ${tab === t.key ? 'bg-gray-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="px-4 py-4">

        {/* SCORE TAB — live prediction + stats overview */}
        {tab === 'score' && (
          <div className="space-y-4">
            {statsData?.livePrediction && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Live Score Projection</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase">Projected</p>
                    <p className="text-lg font-bold text-purple-300 font-mono">{statsData.livePrediction.projectedTotal}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase">Curr RR</p>
                    <p className="text-lg font-bold text-yellow-400 font-mono">{statsData.livePrediction.currentRR.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase">Wkts Left</p>
                    <p className="text-lg font-bold text-emerald-400 font-mono">{statsData.livePrediction.wicketsRemaining}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent form from prediction insights */}
            {insights && (insights.teamALast5?.length || insights.teamBLast5?.length) ? (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Recent Form</p>
                {insights.teamALast5?.length ? <FormDots form={insights.teamALast5} teamName={teamA?.name || 'Team A'} /> : null}
                {insights.teamBLast5?.length ? <FormDots form={insights.teamBLast5} teamName={teamB?.name || 'Team B'} /> : null}
              </div>
            ) : null}

            {!statsData?.livePrediction && !insights && (
              <p className="text-gray-600 text-sm text-center py-4">Match data loading...</p>
            )}
          </div>
        )}

        {/* PREDICTION TAB */}
        {tab === 'prediction' && (
          <div className="space-y-4">
            {prob?.data ? (
              <ProbBar teamA={prob.data.teamA} teamB={prob.data.teamB} source={prob.source} />
            ) : (
              <div className="text-gray-600 text-sm text-center py-2">Win probability loading...</div>
            )}

            {insights && (
              <div className="space-y-2 border-t border-gray-800 pt-3">
                {insights.confidence && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 uppercase">Confidence</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${insights.confidence === 'HIGH' || insights.confidence === 'VERY_HIGH' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 'text-gray-400 border-gray-600 bg-gray-800'}`}>
                      {insights.confidence}
                    </span>
                  </div>
                )}

                {/* Factor bars */}
                {insights.teamAWinRate != null && insights.teamBWinRate != null && (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-[9px] text-gray-600 uppercase tracking-wider">Historical Win Rate</p>
                      {[
                        { name: teamA?.name || 'Team A', pct: Math.round(insights.teamAWinRate * 100), color: 'bg-emerald-500/60' },
                        { name: teamB?.name || 'Team B', pct: Math.round(insights.teamBWinRate * 100), color: 'bg-cyan-500/60' },
                      ].map(t => (
                        <div key={t.name} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 w-20 flex-shrink-0 truncate">{t.name}</span>
                          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full ${t.color} rounded-full`} style={{ width: `${t.pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 w-7 text-right font-mono">{t.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {insights.teamAForm != null && insights.teamBForm != null && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">Current Form</p>
                    {[
                      { name: teamA?.name || 'Team A', pct: insights.teamAForm, color: 'bg-emerald-400/60' },
                      { name: teamB?.name || 'Team B', pct: insights.teamBForm, color: 'bg-cyan-400/60' },
                    ].map(t => (
                      <div key={t.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-20 flex-shrink-0 truncate">{t.name}</span>
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${t.color} rounded-full`} style={{ width: `${t.pct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400 w-7 text-right font-mono">{t.pct}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {insights.reasoning && (
                  <div className="bg-gray-800/60 rounded-lg p-2.5 mt-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">AI Analysis</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{insights.reasoning.slice(0, 250)}{insights.reasoning.length > 250 ? '…' : ''}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB — last 6 matches per team */}
        {tab === 'history' && (
          <div className="space-y-5">
            {loadingStats ? (
              <div className="flex items-center gap-2 text-gray-600 text-sm"><RefreshCw className="w-4 h-4 animate-spin" /> Loading history...</div>
            ) : statsData ? (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                    <p className="text-xs font-bold text-white">{statsData.teams.a.name}</p>
                    <span className="text-[9px] text-gray-600">last 6 matches</span>
                  </div>
                  <HistoryTable matches={statsData.teamLastFive.a} teamName={statsData.teams.a.name} />
                </div>
                <div className="border-t border-gray-800 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                    <p className="text-xs font-bold text-white">{statsData.teams.b.name}</p>
                    <span className="text-[9px] text-gray-600">last 6 matches</span>
                  </div>
                  <HistoryTable matches={statsData.teamLastFive.b} teamName={statsData.teams.b.name} />
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-sm text-center py-4">No history data available</p>
            )}
          </div>
        )}

        {/* PLAYERS TAB — batting + bowling with career */}
        {tab === 'players' && (
          <div className="space-y-4">
            {loadingStats ? (
              <div className="flex items-center gap-2 text-gray-600 text-sm"><RefreshCw className="w-4 h-4 animate-spin" /> Loading player data...</div>
            ) : statsData ? (
              <>
                {/* Batting */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Batting</p>
                    <span className="text-[9px] text-gray-600">tap to see career stats</span>
                  </div>
                  <div className="space-y-2">
                    {[...statsData.batting].sort((a, b) => b.runs - a.runs).slice(0, 8).map((p, i) => (
                      <PlayerCard
                        key={`${p.playerId}-${i}`}
                        p={p}
                        career={statsData.playerCareer[String(p.playerId)]}
                        type="bat"
                      />
                    ))}
                  </div>
                </div>

                {/* Bowling */}
                <div className="border-t border-gray-800 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3.5 h-3.5 text-red-400" />
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Bowling</p>
                  </div>
                  <div className="space-y-2">
                    {[...statsData.bowling].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy).slice(0, 6).map((p, i) => (
                      <PlayerCard
                        key={`${p.playerId}-${i}`}
                        p={p}
                        career={statsData.playerCareer[String(p.playerId)]}
                        type="bowl"
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-sm text-center py-4">No player data available yet</p>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 pb-3 flex items-center justify-between border-t border-gray-800 pt-2">
        <span className="text-[10px] text-gray-600">Updated {Math.floor((Date.now() - lastUpdated) / 1000)}s ago · auto-refreshes every 30s</span>
        <Link href={`/live/${selectedKey}`} className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1">
          Full live page <span>→</span>
        </Link>
      </div>
    </div>
  )
}
