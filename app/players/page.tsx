'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Search, User, ArrowLeft, Loader2, Trophy, Target, TrendingUp,
  Zap, Star, Globe, Info, BarChart2, Activity, ChevronRight, X,
  Shield, Brain,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormatStats {
  matches: number; innings: number; runs: number; avg: number; sr: number
  hs: number; hundreds: number; fifties: number; fours: number; sixes: number; notOuts: number
}
interface BowlingStats {
  matches: number; innings: number; wickets: number; avg: number; econ: number
  sr: number; bestFigures: string; fiveWickets: number
}
interface PlayerData {
  player: {
    name: string; country: string; born: string; age: number; role: string
    battingStyle: string; bowlingStyle: string | null; teams: string[]
    caps: { test: number; odi: number; t20i: number }
    debut: { test: string | null; odi: string | null; t20i: string | null }
  }
  batting: { test: FormatStats; odi: FormatStats; t20i: FormatStats; ipl: FormatStats }
  bowling: { test: BowlingStats; odi: BowlingStats; t20i: BowlingStats; ipl: BowlingStats }
  recentForm: Array<{ match: string; format: string; runs: number; wickets: number; sr: number; result: string }>
  careerHighlights: string[]
  dismissalTypes: Record<string, number>
  runsPerYear: Array<{ year: number; runs: number }>
  analysis: string
  sources: { profile: string; analysis: string }
}

// ── Chart colours ─────────────────────────────────────────────────────────────

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const FORMAT_COLORS: Record<string, string> = {
  Test: '#f59e0b', ODI: '#3b82f6', T20I: '#10b981', IPL: '#8b5cf6',
}

// ── Suggested players ─────────────────────────────────────────────────────────

const SUGGESTED = [
  'Virat Kohli', 'Rohit Sharma', 'MS Dhoni', 'Sachin Tendulkar',
  'Jasprit Bumrah', 'Babar Azam', 'Steve Smith', 'Kane Williamson',
  'AB de Villiers', 'Ben Stokes', 'Pat Cummins', 'Ravindra Jadeja',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-extrabold text-white">{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">{icon}</div>
      <h2 className="text-sm font-bold text-white">{title}</h2>
    </div>
  )
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PlayersPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PlayerData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeFormat, setActiveFormat] = useState<'test' | 'odi' | 't20i' | 'ipl'>('odi')
  const inputRef = useRef<HTMLInputElement>(null)

  const search = async (name: string) => {
    if (!name.trim()) return
    setQuery(name)
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch(`/api/players/search?name=${encodeURIComponent(name)}`)
      const json = await res.json()
      if (json.success) {
        setData(json)
        setActiveFormat('odi')
      } else {
        setError(json.error || 'Player not found')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const bat = data?.batting?.[activeFormat]
  const bowl = data?.bowling?.[activeFormat]
  const isBowler = data?.player?.role?.toLowerCase().includes('bowl')
  const isAllRounder = data?.player?.role?.toLowerCase().includes('all')

  // Chart datasets
  const battingFormatData = data ? [
    { format: 'Test', avg: data.batting.test.avg, sr: data.batting.test.sr, runs: data.batting.test.runs },
    { format: 'ODI',  avg: data.batting.odi.avg,  sr: data.batting.odi.sr,  runs: data.batting.odi.runs },
    { format: 'T20I', avg: data.batting.t20i.avg, sr: data.batting.t20i.sr, runs: data.batting.t20i.runs },
    { format: 'IPL',  avg: data.batting.ipl.avg,  sr: data.batting.ipl.sr,  runs: data.batting.ipl.runs },
  ].filter(d => d.runs > 0) : []

  const bowlingFormatData = data ? [
    { format: 'Test', wickets: data.bowling.test.wickets, econ: data.bowling.test.econ, avg: data.bowling.test.avg },
    { format: 'ODI',  wickets: data.bowling.odi.wickets,  econ: data.bowling.odi.econ,  avg: data.bowling.odi.avg },
    { format: 'T20I', wickets: data.bowling.t20i.wickets, econ: data.bowling.t20i.econ, avg: data.bowling.t20i.avg },
    { format: 'IPL',  wickets: data.bowling.ipl.wickets,  econ: data.bowling.ipl.econ,  avg: data.bowling.ipl.avg },
  ].filter(d => d.wickets > 0) : []

  const dismissalData = data ? Object.entries(data.dismissalTypes)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v })) : []

  const recentFormData = data?.recentForm?.slice(0, 8).map(f => ({
    match: f.match,
    runs: f.runs || 0,
    wickets: f.wickets || 0,
    fill: f.result === 'W' ? '#10b981' : f.result === 'L' ? '#ef4444' : '#f59e0b',
  })) || []

  const radarData = data ? [
    { subject: 'Avg', Test: data.batting.test.avg, ODI: data.batting.odi.avg, T20I: data.batting.t20i.avg },
    { subject: 'SR/10', Test: data.batting.test.sr / 10, ODI: data.batting.odi.sr / 10, T20I: data.batting.t20i.sr / 10 },
    { subject: 'Hundreds', Test: data.batting.test.hundreds, ODI: data.batting.odi.hundreds, T20I: data.batting.t20i.hundreds },
    { subject: 'Fifties', Test: Math.min(data.batting.test.fifties, 99), ODI: Math.min(data.batting.odi.fifties, 99), T20I: Math.min(data.batting.t20i.fifties, 99) },
    { subject: 'HS/10', Test: data.batting.test.hs / 10, ODI: data.batting.odi.hs / 10, T20I: data.batting.t20i.hs / 10 },
  ] : []

  return (
    <div className="min-h-screen bg-gray-950 pb-16">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-5 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <User className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">Player Search</h1>
              <p className="text-gray-500 text-xs">AI-powered stats · OpenAI + Gemini</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(query)}
              placeholder="Search any cricket player — e.g. Virat Kohli, Babar Azam…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-24 py-3 text-white text-sm placeholder-gray-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
            {query && !loading && (
              <button onClick={() => { setQuery(''); setData(null); setError(null); inputRef.current?.focus() }}
                className="absolute right-20 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => search(query)}
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-6">

        {/* Suggestions */}
        {!data && !loading && !error && (
          <div>
            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" /> Popular players
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map(name => (
                <button key={name} onClick={() => search(name)}
                  className="bg-gray-900 border border-gray-800 hover:border-emerald-500/40 hover:text-emerald-400 text-gray-300 text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                  {name} <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-300 font-medium">Fetching stats for "{query}"</p>
            <p className="text-gray-500 text-xs mt-1">Querying OpenAI + Gemini AI…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-gray-900 border border-red-500/20 rounded-2xl py-12 text-center px-6">
            <X className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 font-medium">{error}</p>
            <p className="text-gray-500 text-xs mt-1">Try searching a well-known international cricketer</p>
          </div>
        )}

        {/* Player Profile */}
        {data && !loading && (
          <>
            {/* ── Profile Card ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-900/30 to-gray-900 px-6 py-5 border-b border-gray-800">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-gray-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-extrabold text-white">{data.player.name}</h2>
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">{data.player.role}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{data.player.country}</span>
                      <span className="flex items-center gap-1"><Info className="w-3 h-3" />Born {data.player.born} · Age {data.player.age}</span>
                      <span>{data.player.battingStyle}</span>
                      {data.player.bowlingStyle && <span>{data.player.bowlingStyle}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {data.player.teams.map(t => (
                        <span key={t} className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-center flex-shrink-0">
                    {(['test', 'odi', 't20i'] as const).map(f => (
                      data.player.caps[f] > 0 && (
                        <div key={f} className="text-center">
                          <p className="text-[10px] text-gray-500 uppercase">{f}</p>
                          <p className="text-white font-bold text-sm">{data.player.caps[f]}</p>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>

              {/* Career highlights */}
              <div className="px-6 py-4">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-400" /> Career Highlights</p>
                <ul className="space-y-1">
                  {data.careerHighlights.map((h, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 flex-shrink-0">·</span> {h}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Format selector + Stats ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-800 flex items-center gap-2">
                <SectionHeader icon={<BarChart2 className="w-3.5 h-3.5 text-emerald-400" />} title="Career Statistics" />
                <div className="ml-auto flex gap-1">
                  {(['test', 'odi', 't20i', 'ipl'] as const).map(f => (
                    <button key={f} onClick={() => setActiveFormat(f)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors ${activeFormat === f ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Batting stats */}
                {bat && bat.innings > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-3">Batting — {activeFormat.toUpperCase()}</p>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      <StatBox label="Matches" value={bat.matches} />
                      <StatBox label="Runs" value={bat.runs.toLocaleString()} />
                      <StatBox label="Average" value={bat.avg.toFixed(1)} />
                      <StatBox label="Strike Rate" value={bat.sr.toFixed(1)} />
                      <StatBox label="Highest" value={bat.hs} />
                      <StatBox label="100s" value={bat.hundreds} />
                      <StatBox label="50s" value={bat.fifties} />
                    </div>
                  </div>
                )}

                {/* Bowling stats */}
                {(isBowler || isAllRounder) && bowl && bowl.wickets > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-3">Bowling — {activeFormat.toUpperCase()}</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      <StatBox label="Wickets" value={bowl.wickets} />
                      <StatBox label="Average" value={bowl.avg.toFixed(1)} />
                      <StatBox label="Economy" value={bowl.econ.toFixed(2)} />
                      <StatBox label="Strike Rate" value={bowl.sr.toFixed(1)} />
                      <StatBox label="Best" value={bowl.bestFigures} />
                      <StatBox label="5-fers" value={bowl.fiveWickets} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Charts grid ── */}
            <div className="grid md:grid-cols-2 gap-6">

              {/* Batting Average by Format */}
              {battingFormatData.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <SectionHeader icon={<BarChart2 className="w-3.5 h-3.5 text-blue-400" />} title="Batting Average by Format" />
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={battingFormatData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="format" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="avg" name="Average" radius={[6, 6, 0, 0]}>
                        {battingFormatData.map((d, i) => (
                          <Cell key={i} fill={FORMAT_COLORS[d.format] || '#10b981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Strike Rate comparison */}
              {battingFormatData.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <SectionHeader icon={<Zap className="w-3.5 h-3.5 text-amber-400" />} title="Strike Rate by Format" />
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={battingFormatData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="format" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="sr" name="Strike Rate" radius={[6, 6, 0, 0]}>
                        {battingFormatData.map((d, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Runs per Year (Line chart) */}
              {data.runsPerYear && data.runsPerYear.some(r => r.runs > 0) && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <SectionHeader icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />} title="Career Runs — Year on Year" />
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.runsPerYear}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone" dataKey="runs" name="Runs"
                        stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }}
                        activeDot={{ r: 6, fill: '#34d399' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Dismissal Pie */}
              {dismissalData.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <SectionHeader icon={<Target className="w-3.5 h-3.5 text-red-400" />} title="Dismissal Types" />
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie data={dismissalData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                          dataKey="value" nameKey="name" paddingAngle={3}>
                          {dismissalData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {dismissalData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-gray-300 flex-1">{d.name}</span>
                          <span className="text-xs font-bold text-white">{d.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Radar — batting across formats */}
              {radarData.length > 0 && battingFormatData.length >= 2 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <SectionHeader icon={<Activity className="w-3.5 h-3.5 text-purple-400" />} title="Format Comparison — Radar" />
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#1f2937" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10 }} />
                      <PolarRadiusAxis tick={{ fill: '#4b5563', fontSize: 9 }} />
                      <Radar name="Test" dataKey="Test" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                      <Radar name="ODI"  dataKey="ODI"  stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                      <Radar name="T20I" dataKey="T20I" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Bowling Economy & Wickets */}
              {bowlingFormatData.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <SectionHeader icon={<Shield className="w-3.5 h-3.5 text-emerald-400" />} title="Bowling Wickets by Format" />
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={bowlingFormatData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="format" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="wickets" name="Wickets" radius={[6, 6, 0, 0]}>
                        {bowlingFormatData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent Form */}
              {recentFormData.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:col-span-2">
                  <SectionHeader icon={<Activity className="w-3.5 h-3.5 text-blue-400" />} title="Recent Match Form — Runs Scored" />
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={recentFormData} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="match" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="runs" name="Runs" radius={[4, 4, 0, 0]}>
                        {recentFormData.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2 justify-center">
                    {[['#10b981', 'Win'], ['#ef4444', 'Loss'], ['#f59e0b', 'Draw/No Result']].map(([c, l]) => (
                      <span key={l} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: c as string }} /> {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── AI Analysis ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <SectionHeader icon={<Brain className="w-3.5 h-3.5 text-purple-400" />} title="AI Expert Analysis" />
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{data.analysis}</div>
              <div className="mt-4 pt-3 border-t border-gray-800 flex flex-wrap gap-2">
                <span className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-800/60 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Profile: {data.sources.profile}
                </span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-800/60 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Analysis: {data.sources.analysis}
                </span>
                <span className="text-[10px] text-gray-500 ml-auto">Stats are AI-generated estimates · verify with official sources</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
