'use client'

import { useState, useEffect } from 'react'
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

export default function YouTubePlayer({ matchKey, teamA, teamB }: Props) {
  const [broadcast, setBroadcast] = useState<BroadcastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

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

  if (loading || dismissed || !broadcast) return null

  const videoId = broadcast.watchUrl.split('v=')[1]?.split('&')[0]
  const isLive = broadcast.status === 'live'

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
