'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, Shield, Users, Radio, Clock, Trophy, ChevronRight,
  ArrowLeft, RefreshCw, User, Star, Zap, X, MapPin, Calendar,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface TeamMatch {
  matchKey: string
  matchName: string
  tournament: string
  format: string
  status: 'live' | 'upcoming' | 'completed'
  startAt: string | null
  venue: string | null
  side: 'a' | 'b'
}

interface Team {
  key: string
  name: string
  code: string
  flag: string | null
  matches: TeamMatch[]
}

interface Player {
  key: string
  name: string
  role: 'WK' | 'BAT' | 'AR' | 'BOWL' | 'Player'
  roleRaw: string
  isCaptain: boolean
  isKeeper: boolean
  battingStyle: string | null
  bowlingStyle: string | null
  nationality: string | null
}

interface Playing11Data {
  team: { name: string; code: string; flag: string | null }
  opponent: { name: string; code: string }
  match: {
    tournament: string; format: string; venue: string | null
    startAt: string | null; status: string; statusNote: string | null
  }
  players: Player[]
  playerCount: number
  source: 'playing11' | 'squad' | 'none'
}

// ── Constants ────────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; cls: string }> = {
  WK:     { label: 'WK',   cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  BAT:    { label: 'BAT',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  AR:     { label: 'AR',   cls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  BOWL:   { label: 'BOWL', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  Player: { label: 'PLY',  cls: 'bg-gray-700 text-gray-400 border-gray-600' },
}

function teamInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TeamAvatar({ team, size = 'md' }: { team: Team; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-14 h-14 text-base' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-gray-700 flex items-center justify-center flex-shrink-0`}>
      <span className="font-extrabold text-white">{teamInitials(team.name)}</span>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  if (status === 'live') return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
    </span>
  )
  if (status === 'upcoming') return (
    <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded-full font-bold">Soon</span>
  )
  return (
    <span className="text-[10px] text-gray-500 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded-full">Done</span>
  )
}

// ── Playing 11 Panel ─────────────────────────────────────────────────────────

function Playing11Panel({
  matchKey, side, teamName, onClose,
}: {
  matchKey: string; side: 'a' | 'b'; teamName: string; onClose: () => void
}) {
  const [data, setData] = useState<Playing11Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null); setData(null)
    fetch(`/api/teams/playing11?matchKey=${matchKey}&side=${side}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d)
        else setError(d.error || 'Failed to load')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [matchKey, side])

  const roleGroups = useMemo(() => {
    if (!data) return {}
    const g: Record<string, Player[]> = { WK: [], BAT: [], AR: [], BOWL: [], Player: [] }
    for (const p of data.players) { g[p.role]?.push(p) }
    return g
  }, [data])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Panel header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">{teamName}</h2>
            {data && (
              <p className="text-xs text-gray-400 mt-0.5">
                vs {data.opponent.name} · {data.match.tournament} · {data.match.format}
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="py-16 text-center">
              <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading squad...</p>
            </div>
          )}

          {error && (
            <div className="py-12 text-center px-6">
              <Shield className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Could not load squad data</p>
              <p className="text-gray-600 text-xs mt-1">Squad data may not be available yet for this match</p>
            </div>
          )}

          {data && (
            <div className="p-5 space-y-5">
              {/* Match info strip */}
              <div className="bg-gray-800/50 rounded-xl px-4 py-3 flex flex-wrap gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" /> {data.match.tournament}
                </span>
                {data.match.venue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {data.match.venue}
                  </span>
                )}
                {data.match.startAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formatDate(data.match.startAt)}
                  </span>
                )}
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  data.match.status === 'live'
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                    : data.match.status === 'upcoming'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                }`}>
                  {data.match.status === 'live' ? '🔴 Live' : data.match.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                </span>
              </div>

              {/* Source label */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  {data.source === 'playing11' ? 'Playing XI' : data.source === 'squad' ? 'Probable XI (Squad)' : 'No Squad Data'}
                </h3>
                <span className="text-xs text-gray-500">{data.playerCount} players</span>
              </div>

              {data.players.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Playing XI not announced yet
                </div>
              )}

              {/* Players by role group */}
              {(['WK', 'BAT', 'AR', 'BOWL'] as const).map(role => {
                const players = roleGroups[role] || []
                if (players.length === 0) return null
                const roleMeta = ROLE_META[role]
                return (
                  <div key={role}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex mb-2 ${roleMeta.cls}`}>
                      {roleMeta.label} · {players.length}
                    </p>
                    <div className="space-y-1.5">
                      {players.map(p => (
                        <div key={p.key} className="flex items-center gap-3 bg-gray-800/40 rounded-xl px-3 py-2.5">
                          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                              {p.isCaptain && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" title="Captain" />}
                              {p.isKeeper && !p.isCaptain && <Zap className="w-3 h-3 text-blue-400 flex-shrink-0" title="Wicket-keeper" />}
                            </div>
                            {(p.battingStyle || p.bowlingStyle) && (
                              <p className="text-[10px] text-gray-500 truncate">
                                {[p.battingStyle, p.bowlingStyle].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${ROLE_META[p.role]?.cls}`}>
                            {ROLE_META[p.role]?.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {data.source === 'unavailable' && (
                <div className="py-8 text-center px-4">
                  <Shield className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-medium">Squad data not available</p>
                  <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                    Live playing XI requires an active Roanuz API subscription.<br />
                    Please check your API plan at roanuz.com.
                  </p>
                </div>
              )}

              {data.source === 'squad' && (
                <p className="text-center text-[11px] text-gray-600">
                  Official playing XI not yet announced · showing full squad
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [panel, setPanel] = useState<{ matchKey: string; side: 'a' | 'b'; teamName: string } | null>(null)

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/teams/search')
      const data = await res.json()
      if (data.success) setTeams(data.teams)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTeams() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return teams
    return teams.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      t.matches.some(m => m.tournament.toLowerCase().includes(q))
    )
  }, [teams, query])

  const liveTeams = filtered.filter(t => t.matches.some(m => m.status === 'live'))
  const upcomingTeams = filtered.filter(t =>
    !t.matches.some(m => m.status === 'live') && t.matches.some(m => m.status === 'upcoming')
  )
  const otherTeams = filtered.filter(t =>
    !t.matches.some(m => m.status === 'live') && !t.matches.some(m => m.status === 'upcoming')
  )

  return (
    <div className="min-h-screen bg-gray-950 pb-16">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-5 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">Cricket Teams</h1>
              <p className="text-gray-500 text-xs">{teams.length} teams across all current tournaments</p>
            </div>
            <button onClick={fetchTeams}
              className="text-gray-400 hover:text-emerald-400 transition-colors border border-gray-800 p-1.5 rounded-lg">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search teams, e.g. India, Mumbai, Rajasthan…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-6">

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading teams from live tournaments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No teams match "{query}"</p>
            <button onClick={() => setQuery('')} className="mt-3 text-emerald-400 text-sm hover:underline">Clear search</button>
          </div>
        ) : (
          <>
            {/* Live section */}
            {liveTeams.length > 0 && (
              <TeamSection
                title="Playing Right Now"
                icon={<Radio className="w-4 h-4 text-red-400" />}
                teams={liveTeams}
                onViewXI={(matchKey, side, teamName) => setPanel({ matchKey, side, teamName })}
              />
            )}

            {/* Upcoming section */}
            {upcomingTeams.length > 0 && (
              <TeamSection
                title="Upcoming Matches"
                icon={<Clock className="w-4 h-4 text-blue-400" />}
                teams={upcomingTeams}
                onViewXI={(matchKey, side, teamName) => setPanel({ matchKey, side, teamName })}
              />
            )}

            {/* Other / completed */}
            {otherTeams.length > 0 && (
              <TeamSection
                title="Recent / Other"
                icon={<Trophy className="w-4 h-4 text-amber-400" />}
                teams={otherTeams}
                onViewXI={(matchKey, side, teamName) => setPanel({ matchKey, side, teamName })}
              />
            )}
          </>
        )}
      </div>

      {/* Playing XI panel */}
      {panel && (
        <Playing11Panel
          matchKey={panel.matchKey}
          side={panel.side}
          teamName={panel.teamName}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  )
}

// ── TeamSection ───────────────────────────────────────────────────────────────

function TeamSection({
  title, icon, teams, onViewXI,
}: {
  title: string
  icon: React.ReactNode
  teams: Team[]
  onViewXI: (matchKey: string, side: 'a' | 'b', teamName: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-bold text-white">{title}</h2>
        <span className="text-xs text-gray-500">{teams.length}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map(team => (
          <TeamCard key={team.key} team={team} onViewXI={onViewXI} />
        ))}
      </div>
    </div>
  )
}

// ── TeamCard ──────────────────────────────────────────────────────────────────

function TeamCard({
  team, onViewXI,
}: {
  team: Team
  onViewXI: (matchKey: string, side: 'a' | 'b', teamName: string) => void
}) {
  const liveMatch = team.matches.find(m => m.status === 'live')
  const nextMatch = liveMatch || team.matches.find(m => m.status === 'upcoming') || team.matches[0]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors">
      {/* Team identity */}
      <div className="flex items-center gap-3 mb-3">
        <TeamAvatar team={team} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-bold text-sm truncate">{team.name}</p>
            {liveMatch && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
          </div>
          <p className="text-gray-500 text-xs">{team.code} · {team.matches.length} match{team.matches.length !== 1 ? 'es' : ''}</p>
        </div>
      </div>

      {/* Matches list */}
      <div className="space-y-2">
        {team.matches.slice(0, 2).map(m => (
          <div key={m.matchKey + m.side} className="bg-gray-800/50 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs text-gray-300 font-medium truncate flex-1">{m.tournament}</p>
              <StatusDot status={m.status} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-gray-500">
                {m.format}
                {m.startAt && <span className="ml-1.5">{formatDate(m.startAt)}</span>}
              </div>
              <button
                onClick={() => onViewXI(m.matchKey, m.side, team.name)}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold transition-colors flex-shrink-0"
              >
                <Users className="w-3 h-3" />
                Playing XI
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {team.matches.length > 2 && (
          <p className="text-[10px] text-gray-600 text-center">+{team.matches.length - 2} more match{team.matches.length - 2 !== 1 ? 'es' : ''}</p>
        )}
      </div>
    </div>
  )
}
