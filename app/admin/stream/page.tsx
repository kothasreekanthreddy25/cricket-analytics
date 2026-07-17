'use client'

import { useEffect, useState } from 'react'
import { Radio, Tv, Play, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

interface MatchStream {
  matchKey: string
  teamA: string
  teamB: string
  status: string
  scoreboardUrl: string
  broadcastCreated: boolean
  broadcastId?: string
  watchUrl?: string
  rtmpUrl?: string
  streamKey?: string
  error?: string
}

interface DetectResult {
  success: boolean
  live: MatchStream[]
  upcomingSoon: MatchStream[]
  checkedAt: string
  error?: string
}

export default function AdminStreamPage() {
  const [result, setResult] = useState<DetectResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [manualKey, setManualKey] = useState('')
  const [manualTeamA, setManualTeamA] = useState('')
  const [manualTeamB, setManualTeamB] = useState('')
  const [manualResult, setManualResult] = useState<any>(null)
  const [manualLoading, setManualLoading] = useState(false)

  const detect = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/stream/auto-detect')
      const data = await r.json()
      setResult({ live: [], upcomingSoon: [], checkedAt: '', ...data })
    } catch (e: any) {
      setResult({ success: false, live: [], upcomingSoon: [], checkedAt: '', error: e.message })
    } finally {
      setLoading(false)
    }
  }

  const triggerManual = async () => {
    if (!manualKey || !manualTeamA || !manualTeamB) return
    setManualLoading(true)
    try {
      const r = await fetch('/api/stream/auto-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchKey: manualKey, teamA: manualTeamA, teamB: manualTeamB }),
      })
      setManualResult(await r.json())
    } catch (e: any) {
      setManualResult({ success: false, error: e.message })
    } finally {
      setManualLoading(false)
    }
  }

  useEffect(() => { detect() }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Tv className="w-7 h-7 text-emerald-400" />
              YouTube Live Stream Manager
            </h1>
            <p className="text-gray-500 text-sm mt-1">Auto-detect live matches and create YouTube broadcasts</p>
          </div>
          <button
            onClick={detect}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking...' : 'Check for Live Matches'}
          </button>
        </div>

        {/* How it works */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider">How YouTube Streaming Works</h2>
          <ol className="space-y-2 text-sm text-gray-400">
            <li><span className="text-white font-semibold">1.</span> Click "Check for Live Matches" — if a match is live, a YouTube broadcast is auto-created.</li>
            <li><span className="text-white font-semibold">2.</span> Copy the RTMP URL + Stream Key below.</li>
            <li>
              <span className="text-white font-semibold">3. In OBS:</span> Settings → Stream → Custom RTMP → paste the URL + Key.
              Add a Browser Source with URL: <code className="text-emerald-400 bg-gray-900 px-1.5 py-0.5 rounded text-xs">/stream/scoreboard</code> at 1920×1080.
            </li>
            <li><span className="text-white font-semibold">4.</span> Start streaming in OBS — YouTube automatically goes live!</li>
          </ol>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-6">

            {!result.success && result.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Check failed: {result.error}
              </div>
            )}

            {/* Live matches */}
            <section>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                Live Matches
              </h2>
              {result.live.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500">
                  No live matches right now. {result.upcomingSoon.length > 0 ? 'Matches starting soon below.' : ''}
                </div>
              ) : (
                <div className="space-y-4">
                  {result.live.map(m => (
                    <MatchStreamCard key={m.matchKey} m={m} />
                  ))}
                </div>
              )}
            </section>

            {/* Upcoming soon */}
            {result.upcomingSoon.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  Starting Soon (&lt;30 min)
                </h2>
                <div className="space-y-3">
                  {result.upcomingSoon.map(m => (
                    <div key={m.matchKey} className="bg-gray-900 border border-yellow-500/20 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{m.teamA} vs {m.teamB}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{m.matchKey}</p>
                      </div>
                      <a href={m.scoreboardUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                        Scoreboard <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result.checkedAt && (
              <p className="text-xs text-gray-600">Last checked: {new Date(result.checkedAt).toLocaleString()}</p>
            )}
          </div>
        )}

        {/* Manual trigger */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Manual Broadcast Trigger</h2>
          <p className="text-xs text-gray-500">Create a YouTube broadcast for a specific match key manually.</p>
          <div className="grid grid-cols-3 gap-3">
            <input value={manualKey} onChange={e => setManualKey(e.target.value)}
              placeholder="Match Key (e.g. eng-vs-ind-2025)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 col-span-3" />
            <input value={manualTeamA} onChange={e => setManualTeamA(e.target.value)}
              placeholder="Team A (e.g. England)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
            <input value={manualTeamB} onChange={e => setManualTeamB(e.target.value)}
              placeholder="Team B (e.g. India)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
            <button onClick={triggerManual} disabled={manualLoading || !manualKey || !manualTeamA || !manualTeamB}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <Play className="w-4 h-4" />
              {manualLoading ? 'Creating...' : 'Create Broadcast'}
            </button>
          </div>
          {manualResult && (
            <div className={`rounded-lg p-4 text-sm ${manualResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              {manualResult.success ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Broadcast created!
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <p>Watch URL: <a href={manualResult.broadcast?.watchUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{manualResult.broadcast?.watchUrl}</a></p>
                    <p>RTMP URL: <code className="text-emerald-400 bg-gray-900 px-1 py-0.5 rounded">{manualResult.broadcast?.rtmpUrl}</code></p>
                    <p>Stream Key: <code className="text-yellow-400 bg-gray-900 px-1 py-0.5 rounded">{manualResult.broadcast?.streamKey}</code></p>
                    <p>Scoreboard: <a href={manualResult.scoreboardUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">{manualResult.scoreboardUrl}</a></p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {manualResult.error}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Scoreboard preview link */}
        <div className="flex items-center justify-between bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div>
            <p className="font-semibold text-sm">Live Scoreboard Page</p>
            <p className="text-xs text-gray-500">Use as OBS Browser Source (1920×1080). Auto-detects live match.</p>
          </div>
          <a href="/stream/scoreboard" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium">
            Open <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}

function MatchStreamCard({ m }: { m: MatchStream }) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-gray-900 border border-red-500/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-red-900/60 border border-red-500/30 px-3 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-400">LIVE</span>
            </div>
            <span className="font-bold text-lg">{m.teamA} vs {m.teamB}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{m.matchKey}</p>
        </div>
        {m.broadcastCreated ? (
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Broadcast created
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {m.error || 'Not created'}
          </div>
        )}
      </div>

      {m.broadcastCreated && (
        <div className="space-y-2">
          {m.watchUrl && (
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
              <span className="text-xs text-gray-500 w-24 flex-shrink-0">YouTube URL</span>
              <a href={m.watchUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:underline flex-1 truncate">{m.watchUrl}</a>
              <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
            </div>
          )}
          {m.rtmpUrl && (
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
              <span className="text-xs text-gray-500 w-24 flex-shrink-0">RTMP URL</span>
              <code className="text-xs text-emerald-400 flex-1 truncate">{m.rtmpUrl}</code>
              <button onClick={() => copy(m.rtmpUrl!, 'rtmp')}
                className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-700 rounded transition-colors">
                {copied === 'rtmp' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
          {m.streamKey && (
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
              <span className="text-xs text-gray-500 w-24 flex-shrink-0">Stream Key</span>
              <code className="text-xs text-yellow-400 flex-1 truncate">{m.streamKey}</code>
              <button onClick={() => copy(m.streamKey!, 'key')}
                className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-700 rounded transition-colors">
                {copied === 'key' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
            <span className="text-xs text-gray-500 w-24 flex-shrink-0">Scoreboard</span>
            <a href={m.scoreboardUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-emerald-400 hover:underline flex-1 truncate">{m.scoreboardUrl}</a>
            <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
          </div>
        </div>
      )}
    </div>
  )
}
