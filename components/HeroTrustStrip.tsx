'use client'

import { useEffect, useState } from 'react'
import { Target, BarChart3, RefreshCw } from 'lucide-react'

interface Stats {
  settled: number
  correct: number
  accuracy: number
}

// Live trust indicators under the hero CTAs, backed by the same verified
// track record the results grid uses. Hidden below 10 settled predictions —
// a small sample reads as noise, not proof.
export default function HeroTrustStrip() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/predictions/recent-wins')
      .then(r => r.json())
      .then(d => { if (d.success && d.stats) setStats(d.stats) })
      .catch(() => {})
  }, [])

  if (!stats || stats.settled < 10) return null

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-xs text-gray-500">
      <span className="flex items-center gap-1.5">
        <Target className="w-3.5 h-3.5 text-emerald-400" />
        <strong className="text-white font-bold">{stats.accuracy}%</strong> prediction accuracy
      </span>
      <span className="flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
        <strong className="text-white font-bold">{stats.settled}</strong> settled predictions
      </span>
      <span className="flex items-center gap-1.5">
        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
        Updated hourly
      </span>
    </div>
  )
}
