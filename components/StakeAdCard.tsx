'use client'

import { useEffect, useState } from 'react'

const STAKE_URL = 'https://stake.ac/?c=jBxwjgeE'

// Stake is an offshore operator. Advertising unlicensed operators is prohibited
// in GB (UKGC/CAP Code) and AU (Interactive Gambling Act) — hide these ads there.
// Fail closed: nothing renders until geo resolves.
const STAKE_RESTRICTED = ['GB', 'AU']

function useStakeAllowed(): boolean {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    fetch('/api/geo')
      .then(r => r.json())
      .then(({ country }: { country: string }) => setAllowed(!STAKE_RESTRICTED.includes(country)))
      .catch(() => {})
  }, [])
  return allowed
}

const STAKE_LOGO = (
  <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
    <rect width="36" height="36" rx="8" fill="#1a5c38" />
    <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial">S</text>
  </svg>
)

// ── Ticker strip card ─────────────────────────────────────────────────────────
export function StakeAdTicker() {
  const allowed = useStakeAllowed()
  if (!allowed) return null
  return (
    <a
      href={STAKE_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="flex flex-col shrink-0 rounded-lg border border-yellow-500/40 bg-gradient-to-br from-yellow-900/20 to-gray-800/60 hover:border-yellow-400/60 px-2.5 py-1.5 min-w-[155px] max-w-[180px] transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1 text-yellow-400 text-[9px] font-bold uppercase">
          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
          SPONSORED
        </span>
        <span className="text-[9px] text-gray-500 bg-gray-700/40 px-1 rounded">Ad · 18+</span>
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-5 h-5 rounded flex-shrink-0 overflow-hidden">{STAKE_LOGO}</div>
        <span className="text-white text-[11px] font-extrabold">Stake</span>
      </div>
      <p className="text-yellow-300 text-[10px] font-semibold leading-tight">Watch Live Cricket + Real-Time Odds</p>
      <div className="mt-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-[9px] font-extrabold px-2 py-0.5 rounded text-center transition-colors">
        View Odds →
      </div>
    </a>
  )
}

// ── Carousel card ─────────────────────────────────────────────────────────────
export function StakeAdCarousel() {
  const allowed = useStakeAllowed()
  if (!allowed) return null
  return (
    <a
      href={STAKE_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="flex-shrink-0 w-[300px] sm:w-[340px] bg-gradient-to-br from-yellow-900/30 via-gray-900 to-gray-950 border border-yellow-500/30 hover:border-yellow-400/60 rounded-2xl overflow-hidden transition-all"
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-900/40 to-gray-900 px-4 py-2.5 border-b border-yellow-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">{STAKE_LOGO}</div>
          <span className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-wider">Stake · Sponsored</span>
        </div>
        <span className="text-[9px] text-gray-500">Ad · 18+</span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Headline */}
        <div className="text-center">
          <p className="text-white font-extrabold text-lg leading-tight">Watch Cricket Live</p>
          <p className="text-yellow-300 text-sm mt-1 font-semibold">Real-Time Odds on Every Match</p>
          <p className="text-gray-500 text-[10px] mt-1">Exclusive offer for CricketTips fans</p>
        </div>

        {/* Mock odds strip */}
        <div className="bg-gray-800/60 border border-yellow-500/20 rounded-xl px-3 py-2.5 flex justify-between items-center gap-2">
          <div className="text-center flex-1">
            <p className="text-[9px] text-gray-500 uppercase mb-0.5">Home</p>
            <p className="text-yellow-300 font-extrabold font-mono text-base">1.85</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-gray-600 font-bold">VS</p>
            <p className="text-gray-400 font-mono text-sm">—</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[9px] text-gray-500 uppercase mb-0.5">Away</p>
            <p className="text-yellow-300 font-extrabold font-mono text-base">2.10</p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-1.5">
          {['🎥 Live Streaming', '⚡ Live Odds', '📱 Mobile App', '🏆 Cricket Markets'].map(f => (
            <div key={f} className="bg-gray-800/50 rounded-lg px-2 py-1.5 text-[10px] text-gray-300 font-medium">
              {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-extrabold bg-yellow-500 hover:bg-yellow-400 text-black transition-colors">
            Watch Live + View Odds
          </div>
          <p className="text-center text-[9px] text-gray-600">T&Cs apply · 18+ · Play responsibly</p>
        </div>
      </div>
    </a>
  )
}

// ── Grid mini-card ────────────────────────────────────────────────────────────
export function StakeAdGrid() {
  const allowed = useStakeAllowed()
  if (!allowed) return null
  return (
    <a
      href={STAKE_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="bg-gradient-to-br from-yellow-900/25 to-gray-900/80 border border-yellow-500/25 hover:border-yellow-400/50 rounded-xl p-2.5 flex flex-col gap-1.5 transition-colors"
    >
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse flex-shrink-0" />
        <span className="text-[8px] font-bold text-yellow-400 uppercase tracking-wider">Ad</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-4 h-4 rounded overflow-hidden flex-shrink-0">{STAKE_LOGO}</div>
        <p className="text-[11px] font-extrabold text-white leading-tight">Stake.ac</p>
      </div>
      <p className="text-[9px] text-yellow-300 font-semibold leading-tight">Watch Live + View Odds</p>
      <div className="mt-0.5 bg-yellow-500 hover:bg-yellow-400 text-black text-[8px] font-extrabold px-1.5 py-0.5 rounded text-center transition-colors">
        View Odds →
      </div>
    </a>
  )
}
