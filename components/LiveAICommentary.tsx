'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Radio, RefreshCw, Zap, BookOpen, Laugh, ChevronRight } from 'lucide-react'

type Mode = 'excited' | 'expert' | 'funny'

interface CommentaryData {
  matchKey: string
  teamA: string
  teamB: string
  mode: Mode
  snippets: string[]
  matchSummary: string
  probA: number
  probB: number
  generatedAt: string
}

const MODES: { key: Mode; label: string; icon: React.ReactNode; desc: string; color: string; bg: string }[] = [
  { key: 'excited', label: 'Excited', icon: <Zap className="w-3.5 h-3.5" />,     desc: 'HYPED UP',  color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30 text-red-300' },
  { key: 'expert',  label: 'Expert',  icon: <BookOpen className="w-3.5 h-3.5" />, desc: 'ANALYST',   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300' },
  { key: 'funny',   label: 'Funny',   icon: <Laugh className="w-3.5 h-3.5" />,   desc: 'COMEDIAN',  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
]

const REFRESH_INTERVAL = 30000 // 30 seconds

function TypingText({ text, speed = 18 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const ref = useRef(0)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    ref.current = 0
    const interval = setInterval(() => {
      ref.current++
      setDisplayed(text.slice(0, ref.current))
      if (ref.current >= text.length) { clearInterval(interval); setDone(true) }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return <span>{displayed}{!done && <span className="inline-block w-0.5 h-3.5 bg-current animate-pulse ml-0.5 align-middle" />}</span>
}

export default function LiveAICommentary({ matchKey }: { matchKey?: string }) {
  const [mode, setMode] = useState<Mode>('excited')
  const [data, setData] = useState<CommentaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000)
  const [activeSnippet, setActiveSnippet] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCommentary = useCallback(async (m: Mode) => {
    setLoading(true)
    try {
      const key = matchKey || 'any'
      const res = await fetch(`/api/ai/commentary?mode=${m}&matchKey=${key}`)
      const json = await res.json()
      if (json.success) { setData(json); setActiveSnippet(0) }
    } catch {}
    finally { setLoading(false); setCountdown(REFRESH_INTERVAL / 1000) }
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    fetchCommentary(mode)
    timerRef.current = setInterval(() => fetchCommentary(mode), REFRESH_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [mode, fetchCommentary])

  // Countdown ticker
  useEffect(() => {
    countRef.current = setInterval(() => setCountdown(c => c > 0 ? c - 1 : REFRESH_INTERVAL / 1000), 1000)
    return () => { if (countRef.current) clearInterval(countRef.current) }
  }, [])

  // Cycle through snippets every 7s
  useEffect(() => {
    if (!data?.snippets?.length) return
    const t = setInterval(() => setActiveSnippet(i => (i + 1) % data.snippets.length), 7000)
    return () => clearInterval(t)
  }, [data?.snippets?.length])

  const currentMode = MODES.find(m => m.key === mode)!

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Live AI Commentary</p>
            <p className="text-[10px] text-gray-500">Refreshes every 30s · GPT-4o powered</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 tabular-nums">{countdown}s</span>
          <button onClick={() => fetchCommentary(mode)} disabled={loading}
            className="text-gray-500 hover:text-gray-300 disabled:opacity-40 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="px-4 pt-3 flex gap-2">
        {MODES.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              mode === m.key ? m.bg : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white'
            }`}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Match label */}
      {data && (
        <div className="px-4 pt-2.5 pb-0">
          <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {data.teamA} vs {data.teamB}
            <span className="ml-auto">{data.matchSummary}</span>
          </p>
        </div>
      )}

      {/* Commentary box */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-2.5 py-2">
            {[1, 2, 3].map(i => <div key={i} className="h-3 bg-gray-800 rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />)}
          </div>
        ) : data?.snippets?.length ? (
          <div className="space-y-3">
            {/* Active snippet — typing effect */}
            <div className={`rounded-xl p-3.5 border ${currentMode.bg} min-h-[80px]`}>
              <div className={`flex items-center gap-1.5 mb-2 text-[10px] font-extrabold uppercase tracking-wider ${currentMode.color}`}>
                {currentMode.icon} {currentMode.label} Mode
              </div>
              <p className="text-sm text-white leading-relaxed">
                <TypingText key={`${activeSnippet}-${data.generatedAt}`} text={data.snippets[activeSnippet]} speed={12} />
              </p>
            </div>

            {/* Snippet dots */}
            <div className="flex items-center justify-center gap-1.5">
              {data.snippets.map((_, i) => (
                <button key={i} onClick={() => setActiveSnippet(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeSnippet ? 'bg-emerald-400 scale-125' : 'bg-gray-600 hover:bg-gray-500'}`} />
              ))}
            </div>

            {/* Other snippets preview */}
            <div className="space-y-1.5">
              {data.snippets.map((s, i) => i !== activeSnippet && (
                <button key={i} onClick={() => setActiveSnippet(i)}
                  className="w-full text-left text-[11px] text-gray-500 hover:text-gray-300 py-1.5 px-3 rounded-lg hover:bg-gray-800/50 transition-colors line-clamp-1">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">No match commentary available</p>
        )}
      </div>

      {/* Footer */}
      {data && (
        <div className="px-4 pb-3 border-t border-gray-800/50 pt-2 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-gray-600">
            <span>{data.teamA} {data.probA}%</span>
            <div className="flex h-1 w-20 rounded-full overflow-hidden">
              <div className="bg-emerald-600 rounded-l-full" style={{ width: `${data.probA}%` }} />
              <div className="bg-gray-600 rounded-r-full" style={{ width: `${data.probB}%` }} />
            </div>
            <span>{data.teamB} {data.probB}%</span>
          </div>
          <p className="text-[9px] text-gray-700">AI-generated · not real commentary</p>
        </div>
      )}
    </div>
  )
}
