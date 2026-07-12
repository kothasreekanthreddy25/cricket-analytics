'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Trash2, Search, Crown, Shield, X, Loader2 } from 'lucide-react'

interface Tournament {
  id: string
  name: string
  country: string | null
  series: { id: string }[]
}

interface Series {
  id: string
  tournamentId: string
  name: string
  format: string
  startDate: string
  endDate: string
  squads: { id: string; teamName: string }[]
}

interface Player {
  id: number | null
  name: string
  role: string
  isCaptain: boolean
  isWicketkeeper: boolean
}

interface Squad {
  id: string
  seriesId: string
  teamName: string
  players: Player[]
}

const FORMATS = ['T20', 'T20I', 'ODI', 'TEST']

function toDateInput(iso: string) {
  return iso ? iso.slice(0, 10) : ''
}

function emptyPlayer(): Player {
  return { id: null, name: '', role: 'Player', isCaptain: false, isWicketkeeper: false }
}

export default function SquadsManager() {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Tournaments
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [newTournamentName, setNewTournamentName] = useState('')
  const [newTournamentCountry, setNewTournamentCountry] = useState('')
  const [savingTournament, setSavingTournament] = useState(false)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)

  // Series
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [loadingSeries, setLoadingSeries] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState('')
  const [newSeriesFormat, setNewSeriesFormat] = useState('ODI')
  const [newSeriesStart, setNewSeriesStart] = useState('')
  const [newSeriesEnd, setNewSeriesEnd] = useState('')
  const [savingSeries, setSavingSeries] = useState(false)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)

  // Squads
  const [squads, setSquads] = useState<Squad[]>([])
  const [loadingSquads, setLoadingSquads] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [players, setPlayers] = useState<Player[]>([emptyPlayer()])
  const [savingSquad, setSavingSquad] = useState(false)

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tournaments')
      const data = await res.json()
      setTournaments(data.tournaments || [])
    } catch {
      flash('Failed to load tournaments', 'error')
    }
  }, [])

  useEffect(() => { fetchTournaments() }, [fetchTournaments])

  async function createTournament() {
    if (!newTournamentName.trim()) return
    setSavingTournament(true)
    try {
      const res = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTournamentName.trim(), country: newTournamentCountry.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create tournament')
      setNewTournamentName('')
      setNewTournamentCountry('')
      await fetchTournaments()
      setSelectedTournamentId(data.tournament.id)
      flash('Tournament created', 'success')
    } catch (e: any) {
      flash(e.message, 'error')
    } finally {
      setSavingTournament(false)
    }
  }

  const fetchSeries = useCallback(async (tournamentId: string) => {
    setLoadingSeries(true)
    try {
      const res = await fetch(`/api/admin/series?tournamentId=${tournamentId}`)
      const data = await res.json()
      setSeriesList(data.series || [])
    } catch {
      flash('Failed to load series', 'error')
    } finally {
      setLoadingSeries(false)
    }
  }, [])

  useEffect(() => {
    setSelectedSeriesId(null)
    setSquads([])
    if (selectedTournamentId) fetchSeries(selectedTournamentId)
    else setSeriesList([])
  }, [selectedTournamentId, fetchSeries])

  async function createSeries() {
    if (!selectedTournamentId || !newSeriesName.trim() || !newSeriesStart || !newSeriesEnd) return
    setSavingSeries(true)
    try {
      const res = await fetch('/api/admin/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: selectedTournamentId,
          name: newSeriesName.trim(),
          format: newSeriesFormat,
          startDate: newSeriesStart,
          endDate: newSeriesEnd,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create series')
      setNewSeriesName('')
      setNewSeriesStart('')
      setNewSeriesEnd('')
      await fetchSeries(selectedTournamentId)
      setSelectedSeriesId(data.series.id)
      flash('Series created', 'success')
    } catch (e: any) {
      flash(e.message, 'error')
    } finally {
      setSavingSeries(false)
    }
  }

  const fetchSquads = useCallback(async (seriesId: string) => {
    setLoadingSquads(true)
    try {
      const res = await fetch(`/api/admin/squads?seriesId=${seriesId}`)
      const data = await res.json()
      setSquads(data.squads || [])
    } catch {
      flash('Failed to load squads', 'error')
    } finally {
      setLoadingSquads(false)
    }
  }, [])

  useEffect(() => {
    setTeamName('')
    setPlayers([emptyPlayer()])
    if (selectedSeriesId) fetchSquads(selectedSeriesId)
    else setSquads([])
  }, [selectedSeriesId, fetchSquads])

  function loadSquadForEdit(squad: Squad) {
    setTeamName(squad.teamName)
    setPlayers(squad.players.length > 0 ? squad.players.map(p => ({ ...p })) : [emptyPlayer()])
  }

  async function saveSquad() {
    if (!selectedSeriesId || !teamName.trim()) return
    const cleanPlayers = players.filter(p => p.name.trim())
    if (cleanPlayers.length === 0) {
      flash('Add at least one named player', 'error')
      return
    }
    setSavingSquad(true)
    try {
      const res = await fetch('/api/admin/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seriesId: selectedSeriesId, teamName: teamName.trim(), players: cleanPlayers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save squad')
      await fetchSquads(selectedSeriesId)
      flash(`Squad saved for ${teamName.trim()}`, 'success')
    } catch (e: any) {
      flash(e.message, 'error')
    } finally {
      setSavingSquad(false)
    }
  }

  async function deleteSquad(id: string) {
    if (!selectedSeriesId) return
    try {
      await fetch(`/api/admin/squads?id=${id}`, { method: 'DELETE' })
      await fetchSquads(selectedSeriesId)
      flash('Squad deleted', 'success')
    } catch {
      flash('Failed to delete squad', 'error')
    }
  }

  function updatePlayer(index: number, patch: Partial<Player>) {
    setPlayers(prev => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  function removePlayer(index: number) {
    setPlayers(prev => prev.filter((_, i) => i !== index).length > 0 ? prev.filter((_, i) => i !== index) : [emptyPlayer()])
  }

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId) || null
  const selectedSeries = seriesList.find(s => s.id === selectedSeriesId) || null

  return (
    <div className="space-y-8">
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Section 1 — Tournaments */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-4">1. Tournaments</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {tournaments.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTournamentId(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                selectedTournamentId === t.id
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              {t.name} <span className="opacity-60">({t.series.length})</span>
            </button>
          ))}
          {tournaments.length === 0 && <p className="text-gray-600 text-xs">No tournaments yet — add one below.</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={newTournamentName}
            onChange={e => setNewTournamentName(e.target.value)}
            placeholder="Tournament name, e.g. India tour of England 2026"
            className="flex-1 min-w-[220px] bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
          <input
            value={newTournamentCountry}
            onChange={e => setNewTournamentCountry(e.target.value)}
            placeholder="Country (optional)"
            className="w-40 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={createTournament}
            disabled={savingTournament || !newTournamentName.trim()}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors"
          >
            {savingTournament ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
      </section>

      {/* Section 2 — Series */}
      {selectedTournament && (
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">
            2. Series <span className="text-gray-500 font-normal">— {selectedTournament.name}</span>
          </h2>

          {loadingSeries ? (
            <p className="text-gray-600 text-xs mb-4">Loading…</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              {seriesList.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSeriesId(s.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    selectedSeriesId === s.id
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {s.name} <span className="opacity-70">({s.format})</span>{' '}
                  <span className="opacity-50">{toDateInput(s.startDate)} → {toDateInput(s.endDate)}</span>
                </button>
              ))}
              {seriesList.length === 0 && <p className="text-gray-600 text-xs">No series yet — add one below.</p>}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <input
              value={newSeriesName}
              onChange={e => setNewSeriesName(e.target.value)}
              placeholder="Series name, e.g. ODI Series"
              className="flex-1 min-w-[180px] bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
            <select
              value={newSeriesFormat}
              onChange={e => setNewSeriesFormat(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Start date</label>
              <input
                type="date"
                value={newSeriesStart}
                onChange={e => setNewSeriesStart(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">End date</label>
              <input
                type="date"
                value={newSeriesEnd}
                onChange={e => setNewSeriesEnd(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={createSeries}
              disabled={savingSeries || !newSeriesName.trim() || !newSeriesStart || !newSeriesEnd}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors"
            >
              {savingSeries ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </button>
          </div>
        </section>
      )}

      {/* Section 3 — Squads */}
      {selectedSeries && (
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">
            3. Squads <span className="text-gray-500 font-normal">— {selectedSeries.name} ({selectedSeries.format})</span>
          </h2>

          {loadingSquads ? (
            <p className="text-gray-600 text-xs mb-4">Loading…</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-5">
              {squads.map(sq => (
                <div key={sq.id} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
                  <button onClick={() => loadSquadForEdit(sq)} className="text-xs text-gray-200 hover:text-emerald-400">
                    {sq.teamName} <span className="opacity-50">({sq.players.length})</span>
                  </button>
                  <button onClick={() => deleteSquad(sq.id)} className="text-gray-600 hover:text-red-400 ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {squads.length === 0 && <p className="text-gray-600 text-xs">No squads entered for this series yet.</p>}
            </div>
          )}

          <div className="border-t border-gray-800 pt-4">
            <input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="Team name, e.g. India (must match the site's team name exactly)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 mb-4"
            />

            <div className="space-y-2 mb-3">
              {players.map((p, i) => (
                <PlayerRow
                  key={i}
                  player={p}
                  onChange={patch => updatePlayer(i, patch)}
                  onRemove={() => removePlayer(i)}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setPlayers(prev => [...prev, emptyPlayer()])}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-3 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add player
              </button>
              <button
                onClick={saveSquad}
                disabled={savingSquad || !teamName.trim()}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
              >
                {savingSquad ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save squad
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function PlayerRow({ player, onChange, onRemove }: { player: Player; onChange: (patch: Partial<Player>) => void; onRemove: () => void }) {
  const [query, setQuery] = useState(player.name)
  const [results, setResults] = useState<{ id: number; name: string; role: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setQuery(player.name) }, [player.name])

  function handleQueryChange(value: string) {
    setQuery(value)
    onChange({ name: value, id: null })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/players-search?q=${encodeURIComponent(value.trim())}`)
        const data = await res.json()
        setResults(data.players || [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
  }

  function pick(result: { id: number; name: string; role: string }) {
    onChange({ id: result.id, name: result.name, role: result.role })
    setQuery(result.name)
    setOpen(false)
    setResults([])
  }

  return (
    <div className="flex flex-wrap items-center gap-2 bg-gray-800/50 border border-gray-800 rounded-xl px-3 py-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
        <input
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search player name…"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
        />
        {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 animate-spin" />}
        {open && results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl max-h-48 overflow-y-auto">
            {results.map(r => (
              <button
                key={r.id}
                type="button"
                onMouseDown={() => pick(r)}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-800 flex items-center justify-between"
              >
                <span>{r.name}</span>
                <span className="text-gray-500">{r.role}</span>
              </button>
            ))}
          </div>
        )}
        {player.id === null && query.trim() && (
          <p className="text-[10px] text-yellow-500/80 mt-1 ml-1">No SportMonks ID — name-only entry, won&apos;t get real career stats</p>
        )}
      </div>

      <input
        value={player.role}
        onChange={e => onChange({ role: e.target.value })}
        placeholder="Role"
        className="w-28 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
      />

      <button
        type="button"
        onClick={() => onChange({ isCaptain: !player.isCaptain })}
        title="Captain"
        className={`p-1.5 rounded-lg border transition-colors ${player.isCaptain ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'bg-gray-900 border-gray-700 text-gray-600 hover:text-gray-400'}`}
      >
        <Crown className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange({ isWicketkeeper: !player.isWicketkeeper })}
        title="Wicketkeeper"
        className={`p-1.5 rounded-lg border transition-colors ${player.isWicketkeeper ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-gray-900 border-gray-700 text-gray-600 hover:text-gray-400'}`}
      >
        <Shield className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
