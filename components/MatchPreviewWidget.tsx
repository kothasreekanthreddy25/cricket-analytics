'use client'

import { useEffect, useState } from 'react'
import {
  Mic2, MapPin, Droplets, Sun, ChevronLeft, ChevronRight,
  User, TrendingUp, History, Brain, Star, RefreshCw, Zap,
  Shield, Target, AlertTriangle,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PitchReport {
  venue: string; surface: string; type: string; avgFirstInnings: number
  chaseSuccessRate: number; dew: string; expectedBehavior: string
  tossAdvantage: 'BAT' | 'BOWL'; tossReason: string
}
interface Player {
  name: string; team: string; role: string; reason: string
  keyStats: string; threat: 'HIGH' | 'MEDIUM'
}
interface TeamHistory {
  totalMeetings: number; teamAWins: number; teamBWins: number
  lastResult: string; currentStreak: string; keyRivalryFact: string
}
interface RecentForm {
  teamA: { last5: string; trend: string; avgScore: number }
  teamB: { last5: string; trend: string; avgScore: number }
}
interface Prediction {
  winner: string; confidence: string; margin: string
  winnerProbPct: number; keyFactor: string; xFactor: string
}
interface Preview {
  matchKey: string; teamA: string; teamB: string
  tournament: string; format: string
  probA: number; probB: number; confidence: string
  commentatorIntro: string; commentatorSource: string
  pitchReport: PitchReport; playersToWatch: Player[]
  teamHistory: TeamHistory; recentForm: RecentForm; prediction: Prediction
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Tab = 'pitch' | 'players' | 'history' | 'prediction'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'pitch',      label: 'Pitch',      icon: <MapPin className="w-3.5 h-3.5" /> },
  { key: 'players',   label: 'Players',    icon: <User className="w-3.5 h-3.5" /> },
  { key: 'history',   label: 'History',    icon: <History className="w-3.5 h-3.5" /> },
  { key: 'prediction',label: 'Prediction', icon: <Brain className="w-3.5 h-3.5" /> },
]

const CONF_CLS: Record<string, string> = {
  HIGH:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  LOW:    'text-gray-400 bg-gray-700 border-gray-600',
}

const PITCH_ICON: Record<string, React.ReactNode> = {
  'Spin-friendly':   <Sun className="w-4 h-4 text-amber-400" />,
  'Batting paradise':<TrendingUp className="w-4 h-4 text-emerald-400" />,
  'Pace-friendly':   <Zap className="w-4 h-4 text-blue-400" />,
  'Balanced':        <Shield className="w-4 h-4 text-purple-400" />,
}

function FormBadge({ result }: { result: string }) {
  const cls = result === 'W'
    ? 'bg-emerald-500 text-white'
    : result === 'L'
    ? 'bg-red-500 text-white'
    : 'bg-gray-600 text-gray-300'
  return <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold ${cls}`}>{result}</span>
}

function ProbBar({ teamA, teamB, probA, probB }: { teamA: string; teamB: string; probA: number; probB: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] text-gray-400">
        <span className="font-medium text-white">{teamA}</span>
        <span className="font-medium text-white">{teamB}</span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
        <div className="bg-emerald-500 rounded-l-full transition-all duration-700" style={{ width: `${probA}%` }} />
        <div className="bg-blue-500 rounded-r-full transition-all duration-700" style={{ width: `${probB}%` }} />
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-emerald-400 font-bold">{probA}%</span>
        <span className="text-blue-400 font-bold">{probB}%</span>
      </div>
    </div>
  )
}

// ── Tab panels ────────────────────────────────────────────────────────────────

function PitchPanel({ p, teamA, teamB }: { p: PitchReport; teamA: string; teamB: string }) {
  if (!p?.venue) return <p className="text-gray-500 text-sm py-6 text-center">Pitch data loading…</p>
  return (
    <div className="space-y-4">
      {/* Venue + type */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-sm text-gray-300">{p.venue}</span>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-bold bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full">
          {PITCH_ICON[p.type] || <Shield className="w-3.5 h-3.5 text-gray-400" />}
          {p.type}
        </span>
      </div>

      {/* Surface description */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5">
        <p className="text-xs text-amber-300 font-semibold mb-1">Surface: {p.surface}</p>
        <p className="text-xs text-gray-300 leading-relaxed">{p.expectedBehavior}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-gray-800/60 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Avg 1st Innings</p>
          <p className="text-lg font-extrabold text-white">{p.avgFirstInnings}</p>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Chase Win %</p>
          <p className="text-lg font-extrabold text-white">{p.chaseSuccessRate}%</p>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Toss: Bat/Bowl</p>
          <p className={`text-lg font-extrabold ${p.tossAdvantage === 'BAT' ? 'text-emerald-400' : 'text-blue-400'}`}>{p.tossAdvantage}</p>
        </div>
      </div>

      {/* Dew + toss */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-2.5">
          <Droplets className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-300">{p.dew}</p>
        </div>
        <div className="flex items-start gap-2 bg-gray-800/50 rounded-xl px-3 py-2.5">
          <Target className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-300"><span className="text-amber-300 font-semibold">Toss tip: </span>{p.tossReason}</p>
        </div>
      </div>
    </div>
  )
}

function PlayersPanel({ players, teamA, teamB }: { players: Player[]; teamA: string; teamB: string }) {
  if (!players?.length) return <p className="text-gray-500 text-sm py-6 text-center">Player data loading…</p>
  const teamAPlayers = players.filter(p => p.team === teamA)
  const teamBPlayers = players.filter(p => p.team === teamB)

  function PlayerCard({ p }: { p: Player }) {
    const roleColor: Record<string, string> = {
      BAT: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      BOWL: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      AR: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      WK: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    }
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3.5 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-gray-600 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">{p.name}</p>
            {p.threat === 'HIGH' && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${roleColor[p.role] || roleColor.BAT}`}>{p.role}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{p.reason}</p>
          <p className="text-[10px] text-emerald-400 mt-1 font-medium">{p.keyStats}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> {teamA}
        </p>
        <div className="space-y-2">
          {teamAPlayers.map(p => <PlayerCard key={p.name} p={p} />)}
        </div>
      </div>
      <div>
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> {teamB}
        </p>
        <div className="space-y-2">
          {teamBPlayers.map(p => <PlayerCard key={p.name} p={p} />)}
        </div>
      </div>
    </div>
  )
}

function HistoryPanel({ h, form, teamA, teamB }: { h: TeamHistory; form: RecentForm; teamA: string; teamB: string }) {
  if (!h?.totalMeetings) return <p className="text-gray-500 text-sm py-6 text-center">History loading…</p>
  const aWinPct = Math.round((h.teamAWins / h.totalMeetings) * 100)
  const bWinPct = 100 - aWinPct

  return (
    <div className="space-y-4">
      {/* H2H bar */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">Head to Head · {h.totalMeetings} meetings</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-bold text-white w-8 text-right">{h.teamAWins}</span>
          <div className="flex-1 flex h-3 rounded-full overflow-hidden gap-0.5">
            <div className="bg-emerald-500 rounded-l-full" style={{ width: `${aWinPct}%` }} />
            <div className="bg-blue-500 rounded-r-full" style={{ width: `${bWinPct}%` }} />
          </div>
          <span className="text-sm font-bold text-white w-8">{h.teamBWins}</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>{teamA}</span><span>{teamB}</span>
        </div>
      </div>

      {/* Streak + last result */}
      <div className="grid grid-cols-1 gap-2">
        <div className="bg-gray-800/50 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-gray-500 mb-0.5">Current Streak</p>
          <p className="text-xs text-white font-semibold">{h.currentStreak}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-gray-500 mb-0.5">Last Meeting</p>
          <p className="text-xs text-white font-semibold">{h.lastResult}</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-amber-400 mb-0.5">Rivalry Fact</p>
          <p className="text-xs text-gray-300">{h.keyRivalryFact}</p>
        </div>
      </div>

      {/* Recent form */}
      {form?.teamA && (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Recent Form (last 5)</p>
          {[
            { team: teamA, data: form.teamA },
            { team: teamB, data: form.teamB },
          ].map(({ team, data }) => (
            <div key={team} className="flex items-center gap-3">
              <span className="text-[11px] text-gray-400 w-28 truncate">{team}</span>
              <div className="flex gap-1">
                {data.last5.split(' ').map((r, i) => <FormBadge key={i} result={r} />)}
              </div>
              <span className={`text-[10px] ml-1 font-bold ${data.trend === 'Strong' ? 'text-emerald-400' : data.trend === 'Poor' ? 'text-red-400' : 'text-amber-400'}`}>
                {data.trend}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PredictionPanel({ pred, teamA, teamB, probA, probB }: { pred: Prediction; teamA: string; teamB: string; probA: number; probB: number }) {
  if (!pred?.winner) return <p className="text-gray-500 text-sm py-6 text-center">Prediction loading…</p>
  const isTeamA = pred.winner === teamA
  return (
    <div className="space-y-4">
      {/* Winner box */}
      <div className={`rounded-xl p-4 border text-center ${isTeamA ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
        <p className="text-[10px] text-gray-400 mb-1">AI Predicts</p>
        <p className={`text-2xl font-extrabold ${isTeamA ? 'text-emerald-400' : 'text-blue-400'}`}>{pred.winner}</p>
        <p className="text-sm text-gray-300 mt-0.5">to win {pred.margin}</p>
        <span className={`inline-flex mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${CONF_CLS[pred.confidence] || CONF_CLS.MEDIUM}`}>
          {pred.confidence} CONFIDENCE
        </span>
      </div>

      {/* Prob bar */}
      <ProbBar teamA={teamA} teamB={teamB} probA={probA} probB={probB} />

      {/* Key factors */}
      <div className="space-y-2">
        <div className="flex items-start gap-2.5 bg-gray-800/50 rounded-xl px-3.5 py-3">
          <Target className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Key Factor</p>
            <p className="text-xs text-gray-200">{pred.keyFactor}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3.5 py-3">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-amber-400 mb-0.5">X-Factor / Wildcard</p>
            <p className="text-xs text-gray-200">{pred.xFactor}</p>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-600">AI prediction for informational purposes · 18+ gamble responsibly</p>
    </div>
  )
}

// ── Preview Card ──────────────────────────────────────────────────────────────

function PreviewCard({ preview }: { preview: Preview }) {
  const [tab, setTab] = useState<Tab>('pitch')

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex-shrink-0 w-full max-w-md">
      {/* Match header */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-900 px-5 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Pre-Match Preview
          </span>
          <span className="text-[10px] text-gray-500">{preview.commentatorSource}</span>
        </div>

        {preview.tournament && (
          <p className="text-[10px] text-purple-400 font-semibold mb-1 truncate">{preview.tournament} · {preview.format}</p>
        )}

        <h3 className="text-base font-extrabold text-white">
          {preview.teamA} <span className="text-gray-500 font-normal">vs</span> {preview.teamB}
        </h3>

        {/* Prob bar compact */}
        <div className="mt-3">
          <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
            <div className="bg-emerald-500 rounded-l-full" style={{ width: `${preview.probA}%` }} />
            <div className="bg-blue-500 rounded-r-full" style={{ width: `${preview.probB}%` }} />
          </div>
          <div className="flex justify-between text-[10px] mt-1">
            <span className="text-emerald-400 font-bold">{preview.teamA.split(' ').slice(-1)} {preview.probA}%</span>
            <span className="text-blue-400 font-bold">{preview.probB}% {preview.teamB.split(' ').slice(-1)}</span>
          </div>
        </div>
      </div>

      {/* Commentator intro */}
      <div className="px-5 py-3.5 border-b border-gray-800/60 bg-purple-500/5">
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Mic2 className="w-3 h-3 text-purple-400" />
          </div>
          <p className="text-xs text-gray-300 leading-relaxed italic">"{preview.commentatorIntro}"</p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex border-b border-gray-800">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors border-b-2 ${
              tab === t.key
                ? 'text-emerald-400 border-emerald-500 bg-emerald-500/5'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 min-h-[240px]">
        {tab === 'pitch'      && <PitchPanel p={preview.pitchReport} teamA={preview.teamA} teamB={preview.teamB} />}
        {tab === 'players'   && <PlayersPanel players={preview.playersToWatch} teamA={preview.teamA} teamB={preview.teamB} />}
        {tab === 'history'   && <HistoryPanel h={preview.teamHistory} form={preview.recentForm} teamA={preview.teamA} teamB={preview.teamB} />}
        {tab === 'prediction'&& <PredictionPanel pred={preview.prediction} teamA={preview.teamA} teamB={preview.teamB} probA={preview.probA} probB={preview.probB} />}
      </div>
    </div>
  )
}

// ── Main Widget ───────────────────────────────────────────────────────────────

export default function MatchPreviewWidget() {
  const [previews, setPreviews] = useState<Preview[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    fetch('/api/ai/match-preview')
      .then(r => r.json())
      .then(d => { if (d.success && d.previews.length) setPreviews(d.previews) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-800 rounded-xl w-48 animate-pulse" />
      <div className="h-[520px] bg-gray-800/50 rounded-2xl animate-pulse" />
    </div>
  )

  if (!previews.length) return null

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-purple-400" />
            AI Match Preview
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Pitch report · Players to watch · Team history · Prediction
          </p>
        </div>
        <div className="flex items-center gap-2">
          {previews.length > 1 && (
            <>
              <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500">{idx + 1}/{previews.length}</span>
              <button onClick={() => setIdx(i => Math.min(previews.length - 1, i + 1))} disabled={idx === previews.length - 1}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview card */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {previews.map((p, i) => (
          <PreviewCard key={p.matchKey} preview={p} />
        ))}
      </div>

      <p className="text-center text-[11px] text-gray-700 mt-4">
        Powered by OpenAI GPT-4o + Google Gemini · Pre-match analysis only · AI-generated estimates
      </p>
    </div>
  )
}
