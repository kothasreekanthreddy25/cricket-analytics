'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Mic2, ArrowLeft, MapPin, Droplets, Sun, User, TrendingUp,
  History, Brain, Star, RefreshCw, Zap, Shield, Target, AlertTriangle,
  Trophy, Calendar, ChevronLeft, ChevronRight, CheckCircle2, ListChecks, Database,
  Sparkles, Crown, Award,
} from 'lucide-react'
import ShareButtons from '@/components/ShareButtons'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PitchReport { venue: string; surface: string; type: string; avgFirstInnings: number; chaseSuccessRate: number; dew: string; expectedBehavior: string; tossAdvantage: 'BAT' | 'BOWL'; tossReason: string }
interface Player { name: string; team: string; role: string; reason: string; keyStats: string | string[]; threat: 'HIGH' | 'MEDIUM'; impactScore?: number }
interface TeamHistory { totalMeetings: number; teamAWins: number; teamBWins: number; lastResult: string; currentStreak: string; keyRivalryFact: string }
interface RecentForm { teamA: { last5: string; trend: string; avgScore: number }; teamB: { last5: string; trend: string; avgScore: number } }
interface Prediction { winner: string; confidence: string; margin: string; winnerProbPct: number; keyFactor: string; xFactor: string }
interface DataSources { squads: string; playerStats: string; winProbability: string; pitchAndNarrative: string }
interface FantasyPlayer { id: number | null; name: string; team: string; role: 'WK' | 'BAT' | 'AR' | 'BOWL'; value: number; isCaptain: boolean; isViceCaptain: boolean; statLine: string | null }
interface FantasyRecommendation { xi: FantasyPlayer[]; captain: FantasyPlayer; viceCaptain: FantasyPlayer; reasoning: string[]; source: string }
interface Preview {
  matchKey: string; teamA: string; teamB: string; tournament: string; format: string; venue?: string; startAt?: string | null
  probA: number; probB: number; confidence: string; commentatorIntro: string; commentatorSource: string
  pitchReport: PitchReport; playersToWatch: Player[]; teamHistory: TeamHistory; recentForm: RecentForm; prediction: Prediction
  lineupSource?: { teamA: string | null; teamB: string | null }
  lineupConfirmed?: { teamA: boolean; teamB: boolean }
  fantasyXI?: FantasyRecommendation | null
  dataSources?: DataSources
}

// ── Helpers ───────────────────────────────────────────────────────────────────
type Tab = 'pitch' | 'players' | 'fantasy' | 'history' | 'prediction'

const CONF_CLS: Record<string, string> = {
  HIGH: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  LOW: 'text-gray-400 bg-gray-700 border-gray-600',
}
const PITCH_ICON: Record<string, React.ReactNode> = {
  'Spin-friendly': <Sun className="w-4 h-4 text-amber-400" />,
  'Batting paradise': <TrendingUp className="w-4 h-4 text-emerald-400" />,
  'Pace-friendly': <Zap className="w-4 h-4 text-blue-400" />,
  'Balanced': <Shield className="w-4 h-4 text-purple-400" />,
}
function FormBadge({ result }: { result: string }) {
  const cls = result === 'W' ? 'bg-emerald-500 text-white' : result === 'L' ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-300'
  return <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${cls}`}>{result}</span>
}
function ProbBar({ teamA, teamB, probA, probB }: { teamA: string; teamB: string; probA: number; probB: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm text-gray-400">
        <span className="font-bold text-white">{teamA}</span>
        <span className="font-bold text-white">{teamB}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        <div className="bg-emerald-500 rounded-l-full transition-all duration-700" style={{ width: `${probA}%` }} />
        <div className="bg-blue-500 rounded-r-full transition-all duration-700" style={{ width: `${probB}%` }} />
      </div>
      <div className="flex justify-between text-sm font-bold">
        <span className="text-emerald-400">{probA}%</span>
        <span className="text-blue-400">{probB}%</span>
      </div>
    </div>
  )
}

// ── Tab panels ────────────────────────────────────────────────────────────────
function PitchPanel({ p }: { p: PitchReport }) {
  if (!p?.venue) return <p className="text-gray-500 text-sm py-8 text-center">Pitch data unavailable</p>
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-500" /><span className="text-gray-300">{p.venue}</span></div>
        <span className="flex items-center gap-1.5 text-sm font-bold bg-gray-800 border border-gray-700 px-3 py-1 rounded-full">
          {PITCH_ICON[p.type] || <Shield className="w-4 h-4 text-gray-400" />}{p.type}
        </span>
      </div>
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <p className="text-sm text-amber-300 font-semibold mb-1">Surface: {p.surface}</p>
        <p className="text-sm text-gray-300 leading-relaxed">{p.expectedBehavior}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Avg 1st Innings', value: p.avgFirstInnings },
          { label: 'Chase Win %', value: `${p.chaseSuccessRate}%` },
          { label: 'Toss', value: p.tossAdvantage, color: p.tossAdvantage === 'BAT' ? 'text-emerald-400' : 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/60 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-xl font-extrabold ${(s as any).color || 'text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
          <Droplets className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300">{p.dew}</p>
        </div>
        <div className="flex items-start gap-2 bg-gray-800/50 rounded-xl px-4 py-3">
          <Target className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300"><span className="text-amber-300 font-semibold">Toss tip: </span>{p.tossReason}</p>
        </div>
      </div>
    </div>
  )
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

function PlayersPanel({ players, teamA, teamB, lineupSource, lineupConfirmed }: {
  players: Player[]; teamA: string; teamB: string
  lineupSource?: { teamA: string | null; teamB: string | null }
  lineupConfirmed?: { teamA: boolean; teamB: boolean }
}) {
  if (!players?.length) return <p className="text-gray-500 text-sm py-8 text-center">Player data unavailable</p>
  const roleColor: Record<string, string> = {
    BAT: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    BOWL: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    AR: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    WK: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  }
  const teamAPlayers = players.filter(p => p.team === teamA)
  const teamBPlayers = players.filter(p => p.team === teamB)
  function PlayerCard({ p }: { p: Player }) {
    const stats = keyStatsList(p.keyStats)
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-gray-600 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-white">{p.name}</p>
              {p.threat === 'HIGH' && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${roleColor[p.role] || roleColor.BAT}`}>{p.role}</span>
            </div>
            <ImpactScore score={p.impactScore} />
          </div>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">{p.reason}</p>
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
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{teamA}
          </p>
        </div>
        <LineupBadge confirmed={lineupConfirmed?.teamA} hasSource={!!lineupSource?.teamA} />
        <div className="space-y-3">{teamAPlayers.map(p => <PlayerCard key={p.name} p={p} />)}</div>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />{teamB}
        </p>
        <LineupBadge confirmed={lineupConfirmed?.teamB} hasSource={!!lineupSource?.teamB} />
        <div className="space-y-3">{teamBPlayers.map(p => <PlayerCard key={p.name} p={p} />)}</div>
      </div>
    </div>
  )
}

const FANTASY_ROLE_COLOR: Record<string, string> = {
  BAT: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  BOWL: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  AR: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  WK: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
}

function FantasyPanel({ fantasy }: { fantasy?: FantasyRecommendation | null }) {
  if (!fantasy) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500 text-sm">Fantasy XI needs a confirmed or recent lineup for both teams.</p>
        <p className="text-gray-600 text-xs mt-1">Check back closer to match time.</p>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
        <p className="text-xs text-amber-300 leading-relaxed">
          Free advisory content, not affiliated with Dream11, MPL, or any fantasy platform.
          Player values are computed from real career stats for this match only — not real
          money advice.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Captain (2x)', p: fantasy.captain, icon: <Crown className="w-4 h-4 text-amber-400" /> },
          { label: 'Vice-Captain (1.5x)', p: fantasy.viceCaptain, icon: <Award className="w-4 h-4 text-gray-300" /> },
        ].map(({ label, p, icon }) => (
          <div key={label} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
              {icon}{label}
            </div>
            <p className="font-bold text-white text-sm">{p.name}</p>
            <p className="text-xs text-gray-500">{p.team} · {p.role}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Recommended XI</p>
        <div className="space-y-2">
          {fantasy.xi.map((p) => (
            <div key={`${p.team}-${p.name}`} className="flex items-center gap-2.5 bg-gray-800/40 border border-gray-700/40 rounded-lg px-3 py-2">
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${FANTASY_ROLE_COLOR[p.role]}`}>{p.role}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                  {p.isCaptain && <span className="text-[9px] font-extrabold text-amber-400 flex-shrink-0">C</span>}
                  {p.isViceCaptain && <span className="text-[9px] font-extrabold text-gray-300 flex-shrink-0">VC</span>}
                </div>
                <p className="text-[10px] text-gray-500 truncate">{p.team}{p.statLine ? ` · ${p.statLine}` : ''}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-10 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.value}%` }} />
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold w-7 text-right">{p.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {fantasy.reasoning.map((r, i) => (
          <div key={i} className="flex items-start gap-2 bg-gray-800/40 rounded-lg px-3 py-2">
            <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">{r}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] text-gray-600">{fantasy.source}</p>
    </div>
  )
}

function HistoryPanel({ h, form, teamA, teamB }: { h: TeamHistory; form: RecentForm; teamA: string; teamB: string }) {
  if (!h?.totalMeetings) return <p className="text-gray-500 text-sm py-8 text-center">History unavailable</p>
  const aWinPct = Math.round((h.teamAWins / h.totalMeetings) * 100)
  return (
    <div className="space-y-5">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
        <p className="text-xs text-gray-500 uppercase font-bold mb-4">Head to Head · {h.totalMeetings} meetings</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-base font-bold text-white w-8 text-right">{h.teamAWins}</span>
          <div className="flex-1 flex h-4 rounded-full overflow-hidden gap-0.5">
            <div className="bg-emerald-500 rounded-l-full" style={{ width: `${aWinPct}%` }} />
            <div className="bg-blue-500 rounded-r-full" style={{ width: `${100 - aWinPct}%` }} />
          </div>
          <span className="text-base font-bold text-white w-8">{h.teamBWins}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1"><span>{teamA}</span><span>{teamB}</span></div>
      </div>
      <div className="space-y-2">
        {[
          { label: 'Current Streak', value: h.currentStreak },
          { label: 'Last Meeting', value: h.lastResult },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-sm text-white font-semibold">{s.value}</p>
          </div>
        ))}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-400 mb-1">Rivalry Fact</p>
          <p className="text-sm text-gray-300">{h.keyRivalryFact}</p>
        </div>
      </div>
      {form?.teamA && (
        <div>
          <p className="text-xs text-gray-500 uppercase font-bold mb-3">Recent Form (last 5)</p>
          <div className="space-y-3">
            {[{ team: teamA, data: form.teamA }, { team: teamB, data: form.teamB }].map(({ team, data }) => (
              <div key={team} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-32 truncate">{team}</span>
                <div className="flex gap-1.5">{data.last5.split(' ').map((r, i) => <FormBadge key={i} result={r} />)}</div>
                <span className={`text-xs font-bold ml-1 ${data.trend === 'Strong' ? 'text-emerald-400' : data.trend === 'Poor' ? 'text-red-400' : 'text-amber-400'}`}>{data.trend}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PredictionPanel({ pred, teamA, teamB, probA, probB }: { pred: Prediction; teamA: string; teamB: string; probA: number; probB: number }) {
  if (!pred?.winner) return <p className="text-gray-500 text-sm py-8 text-center">Prediction unavailable</p>
  const isTeamA = pred.winner === teamA
  return (
    <div className="space-y-5">
      <div className={`rounded-xl p-5 border text-center ${isTeamA ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
        <p className="text-xs text-gray-400 mb-1">AI Predicts</p>
        <p className={`text-3xl font-extrabold ${isTeamA ? 'text-emerald-400' : 'text-blue-400'}`}>{pred.winner}</p>
        <p className="text-sm text-gray-300 mt-1">to win {pred.margin}</p>
        <span className={`inline-flex mt-2 text-xs font-bold px-3 py-1 rounded-full border ${CONF_CLS[pred.confidence] || CONF_CLS.MEDIUM}`}>
          {pred.confidence} CONFIDENCE
        </span>
      </div>
      <ProbBar teamA={teamA} teamB={teamB} probA={probA} probB={probB} />
      <div className="space-y-2">
        <div className="flex items-start gap-3 bg-gray-800/50 rounded-xl px-4 py-4">
          <Target className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div><p className="text-xs text-gray-500 mb-1">Key Factor</p><p className="text-sm text-gray-200">{pred.keyFactor}</p></div>
        </div>
        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-4">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div><p className="text-xs text-amber-400 mb-1">X-Factor / Wildcard</p><p className="text-sm text-gray-200">{pred.xFactor}</p></div>
        </div>
      </div>
      <p className="text-center text-xs text-gray-600">AI prediction for informational purposes only · 18+ gamble responsibly</p>
    </div>
  )
}

// ── Full Preview Card ─────────────────────────────────────────────────────────
function FullPreviewCard({ preview }: { preview: Preview }) {
  const [tab, setTab] = useState<Tab>('pitch')
  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'pitch', label: 'Pitch Report', icon: <MapPin className="w-4 h-4" /> },
    { key: 'players', label: 'Players to Watch', icon: <User className="w-4 h-4" /> },
    { key: 'fantasy', label: 'Fantasy XI', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'history', label: 'Head-to-Head', icon: <History className="w-4 h-4" /> },
    { key: 'prediction', label: 'AI Prediction', icon: <Brain className="w-4 h-4" /> },
  ]
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Match header */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-900 px-6 py-5 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{preview.tournament}</span>
            <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">{preview.format}</span>
          </div>
          <span className="text-xs text-gray-600">{preview.commentatorSource}</span>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-2xl font-extrabold text-white">
            {preview.teamA} <span className="text-gray-500 font-normal text-xl">vs</span> {preview.teamB}
          </h2>
          <ShareButtons
            source="preview-page"
            text={`${preview.teamA} vs ${preview.teamB} — AI predicts ${preview.probA >= preview.probB ? preview.teamA : preview.teamB} to win (${Math.max(preview.probA, preview.probB)}%)`}
            url={`https://crickettips.ai/analysis?match=${preview.matchKey}`}
          />
        </div>
        {preview.startAt && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(preview.startAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: true })}
          </p>
        )}
        {preview.venue && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />{preview.venue}
          </p>
        )}
        {preview.dataSources && (
          <div className="flex items-center gap-1.5 flex-wrap mt-3">
            <Database className="w-3 h-3 text-gray-600 flex-shrink-0" />
            {[
              ['Squads', preview.dataSources.squads],
              ['Stats', preview.dataSources.playerStats],
              ['Predictions', preview.dataSources.winProbability],
            ].map(([label, source]) => (
              <span key={label} className="text-[10px] text-gray-500 bg-gray-800/80 border border-gray-700/60 px-1.5 py-0.5 rounded">
                {label}: <span className="text-gray-400 font-medium">{source}</span>
              </span>
            ))}
          </div>
        )}
        {/* Prob bar */}
        <div className="mt-4">
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div className="bg-emerald-500 rounded-l-full" style={{ width: `${preview.probA}%` }} />
            <div className="bg-blue-500 rounded-r-full" style={{ width: `${preview.probB}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-emerald-400 font-bold">{preview.teamA.split(' ').slice(-1)} {preview.probA}%</span>
            <span className="text-blue-400 font-bold">{preview.probB}% {preview.teamB.split(' ').slice(-1)}</span>
          </div>
        </div>
      </div>

      {/* Commentator intro */}
      <div className="px-6 py-4 border-b border-gray-800/60 bg-purple-500/5">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Mic2 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-sm text-gray-300 leading-relaxed italic">"{preview.commentatorIntro}"</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
              tab === t.key ? 'text-emerald-400 border-emerald-500 bg-emerald-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6 min-h-[320px]">
        {tab === 'pitch' && <PitchPanel p={preview.pitchReport} />}
        {tab === 'players' && <PlayersPanel players={preview.playersToWatch} teamA={preview.teamA} teamB={preview.teamB} lineupSource={preview.lineupSource} lineupConfirmed={preview.lineupConfirmed} />}
        {tab === 'fantasy' && <FantasyPanel fantasy={preview.fantasyXI} />}
        {tab === 'history' && <HistoryPanel h={preview.teamHistory} form={preview.recentForm} teamA={preview.teamA} teamB={preview.teamB} />}
        {tab === 'prediction' && <PredictionPanel pred={preview.prediction} teamA={preview.teamA} teamB={preview.teamB} probA={preview.probA} probB={preview.probB} />}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
function PreviewPageInner() {
  const searchParams = useSearchParams()
  const selectedKey = searchParams.get('match')

  const [previews, setPreviews] = useState<Preview[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch('/api/ai/match-preview')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.previews.length) {
          setPreviews(d.previews)
          // Jump to the requested match if ?match= is in the URL
          if (selectedKey) {
            const idx = d.previews.findIndex((p: Preview) => p.matchKey === selectedKey)
            if (idx >= 0) setActiveIdx(idx)
          }
        }
      })
      .finally(() => setLoading(false))
  }, [selectedKey])

  const current = previews[activeIdx]

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-5 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Mic2 className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AI Match Preview</h1>
              <p className="text-gray-500 text-xs">Pitch · Players · History · Prediction</p>
            </div>
          </div>
          <button
            onClick={() => { setGenerating(true); fetch('/api/ai/match-preview').then(r => r.json()).then(d => { if (d.success) { setPreviews(d.previews); setActiveIdx(0) } }).finally(() => setGenerating(false)) }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-purple-400 transition-colors border border-gray-800 px-3 py-1.5 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-5">
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 bg-gray-800 rounded-xl w-48 animate-pulse" />
            <div className="h-[600px] bg-gray-800/50 rounded-2xl animate-pulse" />
          </div>
        ) : previews.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl py-20 text-center">
            <Mic2 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">No match previews available right now.</p>
            <p className="text-gray-600 text-xs mt-2">Check back closer to match time.</p>
          </div>
        ) : (
          <>
            {/* Match selector pills */}
            {previews.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {previews.map((p, i) => (
                  <button key={p.matchKey} onClick={() => setActiveIdx(i)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      activeIdx === i ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}>
                    {p.teamA} vs {p.teamB}
                  </button>
                ))}
                <div className="ml-auto flex gap-1 flex-shrink-0">
                  <button onClick={() => setActiveIdx(i => Math.max(0, i - 1))} disabled={activeIdx === 0}
                    className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setActiveIdx(i => Math.min(previews.length - 1, i + 1))} disabled={activeIdx === previews.length - 1}
                    className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Full preview */}
            {current && <FullPreviewCard preview={current} />}
          </>
        )}

        <p className="text-center text-xs text-gray-700 pb-4">
          Powered by OpenAI GPT-4o + Google Gemini · Pre-match analysis only · AI-generated estimates
        </p>
      </div>
    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading match preview...</p>
        </div>
      </div>
    }>
      <PreviewPageInner />
    </Suspense>
  )
}
