'use client'

import { useState, useEffect, useCallback } from 'react'
import { Youtube, Radio, ExternalLink } from 'lucide-react'

interface Props {
  matchKey: string
  teamA?: string
  teamB?: string
}

interface BroadcastData {
  id: string
  title: string
  status: string
  watchUrl: string
  thumbnailUrl?: string
}

interface TeamInfo {
  key: string
  name: string
  code: string
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
}

interface FullLiveData {
  success: boolean
  match: {
    playStatus: string
    format: string
    teams: { a: TeamInfo | null; b: TeamInfo | null }
    innings: InningsData[]
  }
  currentPlayers: {
    striker: { name: string; runs: number | null; balls: number | null } | null
    bowler: { name: string; overs: number | null; runs: number | null; wickets: number | null } | null
  } | null
  probability: {
    data: { teamA: { name: string; code: string; pct: number }; teamB: { name: string; code: string; pct: number } } | null
    source: string
  }
}

export default function YouTubePlayer({ matchKey, teamA, teamB }: Props) {
  const [broadcast, setBroadcast] = useState<BroadcastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [live, setLive] = useState<FullLiveData | null>(null)

  useEffect(() => {
    async function fetchBroadcast() {
      try {
        const res = await fetch(`/api/youtube/match/${matchKey}`)
        if (res.ok) {
          const data = await res.json()
          if (data.broadcast) setBroadcast(data.broadcast)
        }
      } catch {
        // No broadcast found — silently skip
      } finally {
        setLoading(false)
      }
    }

    fetchBroadcast()
    // Re-check every 2 minutes in case stream goes live
    const interval = setInterval(fetchBroadcast, 120_000)
    return () => clearInterval(interval)
  }, [matchKey])

  // Poll live score data once a broadcast is showing, so the score can be
  // overlaid on the video and summarized in the panel below it.
  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/cricket/match/${matchKey}/full-live`)
      const data = await res.json()
      if (data.success) setLive(data)
    } catch {
      // silent — video still plays without the score overlay
    }
  }, [matchKey])

  useEffect(() => {
    if (!broadcast) return
    fetchLive()
    const t = setInterval(fetchLive, 30_000)
    return () => clearInterval(t)
  }, [broadcast, fetchLive])

  if (loading || dismissed || !broadcast) return null

  const videoId = broadcast.watchUrl.split('v=')[1]?.split('&')[0]
  const isLive = broadcast.status === 'live'

  const match = live?.match
  const teams = match?.teams
  const innings = match?.innings ?? []
  const currentInnings = innings.length > 0 ? innings[innings.length - 1] : null
  const currentTeam = currentInnings ? (currentInnings.teamSide === 'a' ? teams?.a : teams?.b) : null
  const striker = live?.currentPlayers?.striker
  const bowler = live?.currentPlayers?.bowler
  const prob = live?.probability?.data

  return (
    <div className="bg-gray-800/60 border border-red-500/30 rounded-2xl overflow-hidden shadow-lg shadow-red-500/5">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-red-500/10 border-b border-red-500/20">
        <div className="flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-500" />
          <span className="text-sm font-bold text-white">
            {isLive ? (
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                LIVE on YouTube
              </span>
            ) : (
              'Watch on YouTube'
            )}
          </span>
          {teamA && teamB && (
            <span className="text-xs text-gray-400 hidden sm:block">
              — {teamA} vs {teamB}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={broadcast.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors"
          >
            Open YouTube
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-600 hover:text-gray-400 text-xs px-1.5 ml-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>

      {/* YouTube Embed */}
      {videoId && (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0&modestbranding=1${isLive ? '&live=1' : ''}`}
            title={broadcast.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />

          {/* Live score badge — overlaid on the video, top-right */}
          {currentInnings && (
            <div className="absolute top-3 right-3 pointer-events-none bg-black/75 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 text-right shadow-lg">
              <p className="flex items-center justify-end gap-1 text-[9px] font-bold text-red-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </p>
              <p className="text-sm font-mono font-black text-white leading-tight">
                {currentTeam?.code || currentTeam?.name || currentInnings.battingTeam}{' '}
                {currentInnings.scoreStr || `${currentInnings.runs ?? 0}/${currentInnings.wickets ?? 0}`}
              </p>
              {currentInnings.overs != null && (
                <p className="text-[9px] text-gray-400">({currentInnings.overs} ov)</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Live scoreboard panel — below the video */}
      {match && innings.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-700/40 bg-gray-900/40 space-y-2">
          {/* Innings scores */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {innings.map((inn, i) => {
              const team = inn.teamSide === 'a' ? teams?.a : teams?.b
              return (
                <div key={inn.key} className="flex items-baseline gap-1.5">
                  <span className={`text-xs font-bold ${i === 0 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    {team?.code || team?.name || inn.battingTeam}
                  </span>
                  <span className="text-sm font-mono font-black text-white">
                    {inn.scoreStr || `${inn.runs ?? 0}/${inn.wickets ?? 0}`}
                  </span>
                  {inn.overs != null && <span className="text-[10px] text-gray-500">({inn.overs} ov)</span>}
                </div>
              )
            })}
          </div>

          {/* Striker / bowler */}
          {(striker || bowler) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]">
              {striker && (
                <span className="text-gray-300">
                  <span className="font-semibold text-emerald-400">{striker.name}</span>{' '}
                  {striker.runs ?? '—'} ({striker.balls ?? '—'}b)
                </span>
              )}
              {bowler && (
                <span className="text-gray-300">
                  <span className="font-semibold text-red-400">{bowler.name}</span>{' '}
                  {bowler.wickets ?? 0}/{bowler.runs ?? 0} ({bowler.overs ?? 0} ov)
                </span>
              )}
            </div>
          )}

          {/* Win probability */}
          {prob && (
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[9px] text-gray-500 uppercase tracking-wider w-16 flex-shrink-0">Win %</span>
              <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-gray-800">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.max(4, Math.min(96, prob.teamA.pct))}%` }} />
                <div className="h-full bg-cyan-500 flex-1" />
              </div>
              <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                {prob.teamA.pct}% / {prob.teamB.pct}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-2.5 flex items-center justify-between bg-gray-900/50">
        <p className="text-[10px] text-gray-500">
          AI-powered commentary by CricketTips.ai
        </p>
        <a
          href={`https://www.youtube.com/channel/${process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
        >
          Subscribe ▸
        </a>
      </div>
    </div>
  )
}
