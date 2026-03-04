'use client'

/**
 * /dashboard/admin/stream
 *
 * YouTube Live streaming control panel.
 *
 * AUTO MODE (recommended):
 *   Toggle once → service watches Roanuz every 60s → when a match starts,
 *   it auto-creates a YouTube broadcast and starts streaming. No manual action.
 *
 * MANUAL MODE:
 *   Pick a live match → click "Go Live" → stream starts immediately.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Youtube, Radio, Square, RefreshCw, ExternalLink,
  Wifi, WifiOff, Zap, ZapOff, Clock, Megaphone, Leaf, X,
} from 'lucide-react'

interface LiveMatch {
  key: string
  name: string
  teamA?: string | null
  teamB?: string | null
  scoreA?: string | null
  scoreB?: string | null
}

interface AutoMode {
  enabled: boolean
  streamingKey: string | null
  broadcastId: string | null
  watchUrl: string | null
  pollIntervalSeconds: number
  stoppedMatchKeys: string[]
}

interface StreamStatus {
  streaming: boolean
  matchKey: string | null
  broadcastId: string | null
  watchUrl: string | null
  ballsCommented: number
  uptime: string | null
  autoMode?: AutoMode
  error?: string
}

export default function StreamAdminPage() {
  const [liveMatches, setLiveMatches]           = useState<LiveMatch[]>([])
  const [streamStatus, setStreamStatus]         = useState<StreamStatus | null>(null)
  const [selectedMatch, setSelectedMatch]       = useState<LiveMatch | null>(null)
  const [customTitle, setCustomTitle]           = useState('')
  const [loading, setLoading]                   = useState(false)
  const [message, setMessage]                   = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [serviceReachable, setServiceReachable] = useState<boolean | null>(null)

  // Live stream controls
  const [announceText, setAnnounceText]   = useState('')
  const [pitchText, setPitchText]         = useState('')
  const [ctrlLoading, setCtrlLoading]     = useState<string | null>(null)
  const [ctrlMsg, setCtrlMsg]             = useState<string | null>(null)

  // ── Fetch status ──────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stream', { cache: 'no-store' })
      const data = await res.json()
      setStreamStatus(data)
      setServiceReachable(res.status !== 503)
    } catch {
      setServiceReachable(false)
    }
  }, [])

  const fetchLiveMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/cricket/ticker', { cache: 'no-store' })
      const data = await res.json()
      setLiveMatches(data.live || [])
    } catch {
      setLiveMatches([])
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchLiveMatches()
    const interval = setInterval(fetchStatus, streamStatus?.streaming ? 5000 : 10000)
    return () => clearInterval(interval)
  }, [fetchStatus, fetchLiveMatches, streamStatus?.streaming])

  // ── Actions ───────────────────────────────────────────────────────────────

  async function postAction(body: object, successMsg: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success || data.enabled !== undefined) {
        setMessage({ text: successMsg, type: 'success' })
      } else {
        setMessage({ text: data.error || 'Something went wrong', type: 'error' })
      }
      await fetchStatus()
    } catch (err: any) {
      setMessage({ text: err.message || 'Network error', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const toggleAutoMode = () => {
    const isOn = streamStatus?.autoMode?.enabled
    if (isOn) {
      postAction({ action: 'auto-off' }, 'Auto-mode disabled.')
    } else {
      postAction({ action: 'auto-on' },
        'Auto-mode enabled! Service will automatically start a YouTube stream when any match goes live.')
    }
  }

  const startStream = async () => {
    if (!selectedMatch) return
    setLoading(true)
    setMessage({ text: 'Creating YouTube Live broadcast…', type: 'info' })
    try {
      const res = await fetch('/api/admin/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          matchKey: selectedMatch.key,
          teamA: selectedMatch.teamA || 'Team A',
          teamB: selectedMatch.teamB || 'Team B',
          title: customTitle || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ text: `Stream started! Going live in ~20 seconds. ${data.watchUrl}`, type: 'success' })
        await fetchStatus()
      } else {
        setMessage({ text: data.error || 'Failed to start', type: 'error' })
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const stopStream = () => postAction({ action: 'stop' }, 'Stream stopped.')

  async function sendControl(action: string, extra?: object) {
    setCtrlLoading(action)
    setCtrlMsg(null)
    try {
      const res = await fetch('/api/admin/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (data.success) {
        setCtrlMsg(`Done: ${action.replace('-', ' ')}`)
      } else {
        setCtrlMsg(`Error: ${data.error || 'Failed'}`)
      }
    } catch (err: any) {
      setCtrlMsg(`Error: ${err.message}`)
    } finally {
      setCtrlLoading(null)
    }
  }

  const sendAnnouncement = () => {
    if (!announceText.trim()) return
    sendControl('announce', { text: announceText.trim() }).then(() => setAnnounceText(''))
  }

  const clearAnnouncement = () => sendControl('announce-clear')

  const setPitchReport = () => {
    if (!pitchText.trim()) return
    sendControl('pitch-report', { text: pitchText.trim() })
  }

  const clearPitchReport = () => sendControl('pitch-report-clear')

  // ── Derived ───────────────────────────────────────────────────────────────

  const isStreaming = streamStatus?.streaming ?? false
  const autoEnabled = streamStatus?.autoMode?.enabled ?? false
  const watchUrl    = streamStatus?.watchUrl || streamStatus?.autoMode?.watchUrl

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Youtube className="text-red-500 w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">YouTube Live Stream</h1>
              <p className="text-sm text-gray-400">AI-powered cricket commentary</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {serviceReachable === null ? null : serviceReachable ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                <Wifi className="w-3 h-3" /> Service online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                <WifiOff className="w-3 h-3" /> Service offline
              </span>
            )}
            <button
              onClick={() => { fetchStatus(); fetchLiveMatches() }}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* ══ AUTO MODE CARD ═══════════════════════════════════════════════════ */}
        <div className={`mb-6 rounded-2xl p-5 border transition-all ${
          autoEnabled
            ? 'bg-emerald-950/40 border-emerald-500/30'
            : 'bg-gray-900 border-gray-700/50'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {autoEnabled
                  ? <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  : <ZapOff className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                <span className="font-bold text-lg">Auto-Stream Mode</span>
                {autoEnabled && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">ON</span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-2">
                {autoEnabled
                  ? `Watching Roanuz every ${streamStatus?.autoMode?.pollIntervalSeconds ?? 60}s — stream starts automatically when a match goes live.`
                  : 'Enable once → no more manual action. Automatically streams whenever a live match is detected on Roanuz.'}
              </p>
              {autoEnabled && streamStatus?.autoMode?.stoppedMatchKeys && streamStatus.autoMode.stoppedMatchKeys.length > 0 && (
                <p className="text-xs text-gray-500">
                  Streamed this session: {streamStatus.autoMode.stoppedMatchKeys.join(', ')}
                </p>
              )}
            </div>

            {/* Toggle switch */}
            <button
              onClick={toggleAutoMode}
              disabled={loading || serviceReachable === false}
              aria-label="Toggle auto-stream mode"
              className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 mt-1 disabled:opacity-40 ${
                autoEnabled ? 'bg-emerald-500' : 'bg-gray-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                autoEnabled ? 'translate-x-7' : ''
              }`} />
            </button>
          </div>
        </div>

        {/* ══ LIVE STREAM STATUS ═══════════════════════════════════════════════ */}
        {isStreaming && streamStatus && (
          <div className="mb-6 bg-red-950/40 border border-red-500/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 font-bold text-lg">STREAMING LIVE</span>
                {autoEnabled && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Auto</span>
                )}
              </div>
              <span className="text-xs text-gray-400">{streamStatus.uptime} uptime</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Match</p>
                <p className="font-mono text-emerald-400 text-sm truncate">{streamStatus.matchKey}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">AI Balls Commented</p>
                <p className="font-bold text-2xl">{streamStatus.ballsCommented}</p>
              </div>
            </div>

            {watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors mb-4 truncate"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                {watchUrl}
              </a>
            )}

            <button
              onClick={stopStream}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
            >
              <Square className="w-5 h-5" />
              Stop Stream
            </button>
          </div>
        )}

        {/* ══ LIVE CONTROLS (shown when streaming) ═════════════════════════════ */}
        {isStreaming && (
          <div className="mt-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              Live Stream Controls
            </h2>

            {/* Announcement */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-amber-300 text-sm">Custom Announcement</span>
                <span className="text-xs text-gray-500">(shows on screen + spoken aloud, auto-clears in 30s)</span>
              </div>
              <textarea
                value={announceText}
                onChange={(e) => setAnnounceText(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="e.g. NZ need 45 runs from 30 balls! This is getting tense!"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={sendAnnouncement}
                  disabled={!announceText.trim() || ctrlLoading === 'announce'}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-semibold py-2 rounded-xl text-sm transition-colors"
                >
                  {ctrlLoading === 'announce'
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                    : <><Megaphone className="w-4 h-4" /> Send & Speak</>}
                </button>
                <button
                  onClick={clearAnnouncement}
                  disabled={ctrlLoading === 'announce-clear'}
                  className="px-4 flex items-center gap-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 font-semibold py-2 rounded-xl text-sm transition-colors"
                >
                  <X className="w-4 h-4" /> Clear
                </button>
              </div>
            </div>

            {/* Pitch Report */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Leaf className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-blue-300 text-sm">Pitch Report</span>
                <span className="text-xs text-gray-500">(stays on screen until cleared or replaced)</span>
              </div>
              <textarea
                value={pitchText}
                onChange={(e) => setPitchText(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="e.g. Good batting track. Pacers will get movement early, spinners expected in second half."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={setPitchReport}
                  disabled={!pitchText.trim() || ctrlLoading === 'pitch-report'}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-2 rounded-xl text-sm transition-colors"
                >
                  {ctrlLoading === 'pitch-report'
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                    : <><Leaf className="w-4 h-4" /> Set Pitch Report</>}
                </button>
                <button
                  onClick={clearPitchReport}
                  disabled={ctrlLoading === 'pitch-report-clear'}
                  className="px-4 flex items-center gap-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 font-semibold py-2 rounded-xl text-sm transition-colors"
                >
                  <X className="w-4 h-4" /> Clear
                </button>
              </div>
            </div>

            {/* Control feedback */}
            {ctrlMsg && (
              <div className={`text-sm rounded-xl p-3 ${
                ctrlMsg.startsWith('Error')
                  ? 'bg-red-900/40 text-red-300 border border-red-500/30'
                  : 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30'
              }`}>
                {ctrlMsg}
              </div>
            )}
          </div>
        )}

        {/* ══ MANUAL START ═════════════════════════════════════════════════════ */}
        {!isStreaming && (
          <div className="space-y-5">
            <div className="bg-gray-900 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Manual Override — Start Now
                </h2>
              </div>
              <p className="text-xs text-gray-600 mb-4">
                Pick a live match below to stream immediately (bypasses auto-mode timing).
              </p>

              {liveMatches.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">No live matches right now.</p>
              ) : (
                <div className="space-y-2">
                  {liveMatches.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => {
                        setSelectedMatch(m)
                        setCustomTitle(
                          `${m.teamA || 'Team A'} vs ${m.teamB || 'Team B'} | LIVE Cricket — CricketTips.ai`
                        )
                      }}
                      className={`w-full text-left rounded-xl p-4 border transition-all ${
                        selectedMatch?.key === m.key
                          ? 'bg-emerald-900/30 border-emerald-500/50'
                          : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{m.name || m.key}</p>
                          {(m.scoreA || m.scoreB) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {m.teamA}: {m.scoreA || 'yet to bat'} &nbsp;|&nbsp; {m.teamB}: {m.scoreB || 'yet to bat'}
                            </p>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> LIVE
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedMatch && (
              <div className="bg-gray-900 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Broadcast Title
                </h2>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  maxLength={100}
                  placeholder="Enter YouTube broadcast title…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-gray-600 mt-1">{customTitle.length}/100</p>
              </div>
            )}

            <button
              onClick={startStream}
              disabled={!selectedMatch || loading || serviceReachable === false}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors text-lg"
            >
              {loading
                ? <><RefreshCw className="w-5 h-5 animate-spin" /> Starting…</>
                : <><Radio className="w-5 h-5" /> Go Live Now</>}
            </button>
          </div>
        )}

        {/* Message banner */}
        {message && (
          <div className={`mt-5 rounded-xl p-4 text-sm ${
            message.type === 'success' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30' :
            message.type === 'error'   ? 'bg-red-900/40 text-red-300 border border-red-500/30' :
                                         'bg-blue-900/40 text-blue-300 border border-blue-500/30'
          }`}>
            {message.text}
          </div>
        )}

        {/* Setup env vars */}
        <div className="mt-8 bg-gray-900 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Streaming Service — Env Vars
          </h2>
          <ul className="space-y-2 text-sm">
            {[
              { key: 'AUTO_STREAM', label: 'Set to "true" to enable auto-mode on startup (no toggle needed)' },
              { key: 'AUTO_STREAM_POLL_SECONDS', label: 'How often to check for live matches (default: 60)' },
              { key: 'YOUTUBE_CLIENT_ID', label: 'Google OAuth Client ID' },
              { key: 'YOUTUBE_CLIENT_SECRET', label: 'Google OAuth Client Secret' },
              { key: 'YOUTUBE_REFRESH_TOKEN', label: 'YouTube Refresh Token' },
              { key: 'OPENAI_API_KEY', label: 'OpenAI API Key (AI commentary)' },
              { key: 'ROANUZ_API_KEY', label: 'Roanuz API Key (live ball-by-ball)' },
              { key: 'GOOGLE_TTS_API_KEY', label: 'Google TTS API Key (optional — Indian accent voice)' },
            ].map((item) => (
              <li key={item.key} className="flex items-start gap-2 text-gray-400">
                <code className="text-xs bg-gray-800 px-2 py-0.5 rounded text-amber-400 flex-shrink-0 mt-0.5">
                  {item.key}
                </code>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
