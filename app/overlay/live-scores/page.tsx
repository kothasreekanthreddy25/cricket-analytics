'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveMatch {
  key: string
  id: string
  teamA: string
  teamB: string
  scoreA: string | null
  scoreB: string | null
  statusNote: string
  matchType: string
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

interface BallEvent {
  over: number
  ball: number
  runs: number
  batsmanRuns: number
  batsman: string
  bowler: string
  commentary: string
  isWicket: boolean
  isFour: boolean
  isSix: boolean
  innings: string
}

interface FullLiveData {
  success: boolean
  match: {
    name: string
    status: string
    playStatus: string
    format: string
    statusNote: string
    teams: {
      a: { key: string; name: string; code: string } | null
      b: { key: string; name: string; code: string } | null
    }
    innings: InningsData[]
    venue: { name: string; city: string } | null
    winner: string | null
  }
  currentPlayers: {
    striker: { name: string; runs: number | null; balls: number | null; fours: number | null; sixes: number | null; strikeRate: number | null } | null
    nonStriker: { name: string; runs: number | null; balls: number | null } | null
    bowler: { name: string; overs: number | null; runs: number | null; wickets: number | null; economy: number | null } | null
  } | null
  ballByBall: BallEvent[]
  probability: {
    data: {
      teamA: { name: string; code: string; pct: number }
      teamB: { name: string; code: string; pct: number }
    } | null
    source: string
  }
}

// ── Ball dot ─────────────────────────────────────────────────────────────────

function BallDot({ b }: { b: BallEvent }) {
  const label = b.isWicket ? 'W' : b.isSix ? '6' : b.isFour ? '4' : b.batsmanRuns === 0 ? '·' : String(b.batsmanRuns)
  const style: React.CSSProperties = b.isWicket
    ? { background: '#ef4444', border: '1px solid #f87171', color: '#fff' }
    : b.isSix
    ? { background: '#7c3aed', border: '1px solid #a78bfa', color: '#fff' }
    : b.isFour
    ? { background: '#2563eb', border: '1px solid #60a5fa', color: '#fff' }
    : b.batsmanRuns === 0
    ? { background: 'rgba(55,65,81,0.8)', border: '1px solid #4b5563', color: '#6b7280' }
    : { background: 'rgba(5,150,105,0.7)', border: '1px solid #34d399', color: '#fff' }

  return (
    <span
      title={`${b.over}.${b.ball} • ${b.batsman} • ${b.commentary || label}`}
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: '50%',
        fontSize: 10,
        fontWeight: 800,
        flexShrink: 0,
        fontFamily: 'monospace',
      }}
    >
      {label}
    </span>
  )
}

// ── Win probability pill ──────────────────────────────────────────────────────

function ProbPill({
  data,
  source,
}: {
  data: { teamA: { name: string; code: string; pct: number }; teamB: { name: string; code: string; pct: number } }
  source: string
}) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 400); return () => clearTimeout(t) }, [])
  const pA = Math.max(4, Math.min(96, data.teamA.pct))
  const pB = 100 - pA
  const fav = pA >= pB ? data.teamA : data.teamB

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, color: 'rgba(156,163,175,0.9)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          Win Probability
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
          background: source === 'live' ? 'rgba(239,68,68,0.2)' : 'rgba(167,139,250,0.2)',
          color: source === 'live' ? '#f87171' : '#a78bfa',
          border: source === 'live' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(167,139,250,0.3)',
        }}>
          {source === 'live' ? '● LIVE' : source === 'ai' ? 'AI' : 'Pre-match'}
        </span>
      </div>

      {/* Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: pA >= pB ? '#34d399' : '#9ca3af', fontFamily: 'monospace', minWidth: 32 }}>
          {pA}%
        </span>
        <div style={{ flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', background: 'rgba(17,24,39,0.8)', display: 'flex' }}>
          <div style={{
            height: '100%',
            width: animated ? `${pA}%` : '50%',
            background: pA >= pB ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#374151,#6b7280)',
            transition: 'width 1.2s ease-out',
            borderRadius: '4px 0 0 4px',
          }} />
          <div style={{ width: 1, height: '100%', background: 'rgba(17,24,39,0.9)' }} />
          <div style={{
            height: '100%',
            flex: 1,
            background: pB > pA ? 'linear-gradient(90deg,#22d3ee,#0e7490)' : 'linear-gradient(90deg,#374151,#6b7280)',
            borderRadius: '0 4px 4px 0',
          }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: pB > pA ? '#22d3ee' : '#9ca3af', fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
          {pB}%
        </span>
      </div>

      {/* Favourite */}
      {Math.abs(pA - pB) >= 10 && (
        <p style={{ fontSize: 9, color: 'rgba(156,163,175,0.8)', textAlign: 'center' }}>
          <span style={{ color: pA >= pB ? '#34d399' : '#22d3ee', fontWeight: 700 }}>{fav.code || fav.name}</span> favoured
        </p>
      )}
    </div>
  )
}

// ── Main overlay page ─────────────────────────────────────────────────────────

export default function LiveScoreOverlay() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [matchIndex, setMatchIndex] = useState(0)
  const [fullData, setFullData] = useState<FullLiveData | null>(null)
  const [tick, setTick] = useState(0)
  const [visible, setVisible] = useState(true)

  // URL param: ?match=matchKey to pin to specific match
  const [pinnedKey, setPinnedKey] = useState<string | null>(null)
  const [style, setStyle] = useState<'ticker' | 'corner'>('ticker')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const m = params.get('match')
    if (m) setPinnedKey(m)
    const s = params.get('style')
    if (s === 'corner') setStyle('corner')
  }, [])

  // Fetch ticker
  const fetchTicker = useCallback(async () => {
    try {
      const res = await fetch('/api/cricket/ticker')
      const data = await res.json()
      const live: LiveMatch[] = data.live || []
      setLiveMatches(live)
      if (live.length === 0) setFullData(null)
    } catch { /* silent */ }
  }, [])

  // Fetch full live data
  const fetchFull = useCallback(async (key: string) => {
    try {
      const res = await fetch(`/api/cricket/match/${key}/full-live`)
      const data = await res.json()
      if (data.success) setFullData(data)
    } catch { /* silent */ }
  }, [])

  // Tick every second for "X seconds ago" counter
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Ticker poll: every 5 min
  useEffect(() => {
    fetchTicker()
    const t = setInterval(fetchTicker, 300_000)
    return () => clearInterval(t)
  }, [fetchTicker])

  // Full data poll: every 30s
  useEffect(() => {
    const key = pinnedKey || liveMatches[matchIndex]?.key || liveMatches[matchIndex]?.id
    if (!key) return
    fetchFull(key)
    const t = setInterval(() => fetchFull(key), 30_000)
    return () => clearInterval(t)
  }, [liveMatches, matchIndex, pinnedKey, fetchFull])

  // Rotate through matches every 45s when multiple live
  useEffect(() => {
    if (liveMatches.length <= 1 || pinnedKey) return
    const t = setInterval(() => {
      setMatchIndex(i => (i + 1) % liveMatches.length)
      setFullData(null)
    }, 45_000)
    return () => clearInterval(t)
  }, [liveMatches.length, pinnedKey])

  // Hide overlay when no live matches
  useEffect(() => {
    setVisible(liveMatches.length > 0 || !!fullData)
  }, [liveMatches.length, fullData])

  if (!visible || !fullData?.match) {
    return (
      <div style={{ padding: '0 0 0 0', background: 'transparent' }}>
        {/* Invisible — nothing to show */}
      </div>
    )
  }

  const match = fullData.match
  const isLive = match.playStatus === 'in_play' || match.status === 'live'
  const teamA = match.teams.a
  const teamB = match.teams.b
  const inn1 = match.innings[0] ?? null
  const inn2 = match.innings[1] ?? null

  const balls = fullData.ballByBall ?? []
  const currentOver = balls[0]?.over
  const overBalls = balls.filter(b => b.over === currentOver).sort((a, b) => a.ball - b.ball)

  const striker = fullData.currentPlayers?.striker
  const bowler = fullData.currentPlayers?.bowler

  // Chase
  const chaseInfo = isLive && inn2 && inn1 && inn1.runs !== null && inn2.runs !== null
    ? (() => {
        const target = inn1.runs! + 1
        const oversRaw = parseFloat(String(inn2.overs ?? '0')) || 0
        const ballsDone = Math.floor(oversRaw) * 6 + Math.round((oversRaw % 1) * 10)
        const ballsLeft = Math.max(0, 120 - ballsDone)
        const needed = target - inn2.runs!
        if (needed > 0 && ballsLeft > 0) return { target, needed, ballsLeft, reqRR: (needed / ballsLeft) * 6 }
        return null
      })()
    : null

  const prob = fullData.probability

  // ── Shared styles ──────────────────────────────────────────────────────────
  const glass: React.CSSProperties = {
    background: 'rgba(10, 14, 20, 0.82)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
  }

  const liveTag = (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 9, fontWeight: 800, color: '#f87171',
      textTransform: 'uppercase', letterSpacing: '0.1em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite', display: 'inline-block' }} />
      LIVE
    </span>
  )

  // ── CORNER STYLE ───────────────────────────────────────────────────────────
  if (style === 'corner') {
    return (
      <>
        <style>{`
          @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
          @keyframes fadeIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
        `}</style>
        <div style={{
          position: 'fixed', top: 20, right: 20,
          width: 280,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          animation: 'fadeIn 0.6s ease-out',
        }}>
          <div style={{ ...glass, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {liveTag}
              <span style={{ fontSize: 9, color: 'rgba(156,163,175,0.7)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
                {match.format || 'T20'}
              </span>
            </div>

            {/* Scores */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {match.innings.length > 0 ? match.innings.map((inn, i) => {
                const team = inn.teamSide === 'a' ? teamA : teamB
                const isCurrent = isLive && i === match.innings.length - 1
                const color = i === 0 ? '#34d399' : '#22d3ee'
                return (
                  <div key={inn.key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px', borderRadius: 8,
                    background: isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: isCurrent ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {team?.code || team?.name || inn.battingTeam}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color, fontFamily: 'monospace' }}>
                        {inn.scoreStr || (inn.runs !== null ? `${inn.runs}/${inn.wickets ?? 0}` : '—')}
                      </span>
                      {inn.overs && (
                        <span style={{ fontSize: 9, color: 'rgba(156,163,175,0.6)', marginLeft: 4 }}>({inn.overs} ov)</span>
                      )}
                    </div>
                  </div>
                )
              }) : (
                <div style={{ color: 'rgba(156,163,175,0.5)', fontSize: 12, textAlign: 'center', padding: 8 }}>
                  {match.name}
                </div>
              )}
            </div>

            {/* Current over */}
            {isLive && overBalls.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 9, color: 'rgba(156,163,175,0.6)', minWidth: 36 }}>Ov {currentOver}</span>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {overBalls.map((b, i) => <BallDot key={i} b={b} />)}
                  {Array.from({ length: Math.max(0, 6 - overBalls.length) }).map((_, i) => (
                    <span key={i} style={{ width: 26, height: 26, borderRadius: '50%', border: '1px dashed rgba(75,85,99,0.6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'rgba(75,85,99,0.6)' }}>·</span>
                  ))}
                </div>
              </div>
            )}

            {/* Striker */}
            {isLive && striker && (
              <div style={{ paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{striker.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                    {striker.runs ?? '—'}
                    <span style={{ fontSize: 9, color: 'rgba(156,163,175,0.6)', fontWeight: 400 }}> ({striker.balls ?? '—'}b)</span>
                  </span>
                </div>
                {bowler && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: '#f87171' }}>⚡</span>
                      <span style={{ fontSize: 10, color: 'rgba(209,213,219,0.8)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bowler.name}</span>
                    </div>
                    <span style={{ fontSize: 10, color: '#f87171', fontFamily: 'monospace', fontWeight: 700 }}>
                      {bowler.wickets ?? 0}/{bowler.runs ?? 0}
                      <span style={{ fontSize: 9, color: 'rgba(156,163,175,0.6)', fontWeight: 400 }}> ({bowler.overs} ov)</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Win probability */}
            {prob?.data && (
              <div style={{ paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <ProbPill data={prob.data} source={prob.source} />
              </div>
            )}

            {/* Chase */}
            {chaseInfo && (
              <div style={{ display: 'flex', gap: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { label: 'Need', value: `${chaseInfo.needed} off ${chaseInfo.ballsLeft}b`, color: '#fbbf24' },
                  { label: 'Req RR', value: chaseInfo.reqRR.toFixed(1), color: chaseInfo.reqRR > 12 ? '#f87171' : chaseInfo.reqRR < 7 ? '#34d399' : '#fbbf24' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
                    <p style={{ fontSize: 8, color: 'rgba(156,163,175,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                    <p style={{ fontSize: 11, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Status note */}
            {match.statusNote && !match.statusNote.startsWith('NS') && (
              <p style={{ fontSize: 10, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '4px 8px', borderRadius: 6, borderLeft: '2px solid rgba(52,211,153,0.4)' }}>
                {match.statusNote}
              </p>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
              <span style={{ fontSize: 8, color: 'rgba(107,114,128,0.7)' }}>
                CricketTips.ai · auto-updates 30s
              </span>
              {match.venue && (
                <span style={{ fontSize: 8, color: 'rgba(107,114,128,0.7)' }}>{match.venue.city || match.venue.name}</span>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── LOWER-THIRD TICKER (default) ───────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.35 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shimmer { 0%,100% { opacity:0.6 } 50% { opacity:1 } }
      `}</style>

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        animation: 'slideUp 0.7s ease-out',
      }}>
        {/* ── Status note banner (above main bar) ── */}
        {isLive && match.statusNote && !match.statusNote.startsWith('NS') && (
          <div style={{
            background: 'rgba(5,150,105,0.9)',
            backdropFilter: 'blur(8px)',
            padding: '4px 16px',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            textAlign: 'center',
            letterSpacing: '0.03em',
          }}>
            {match.statusNote}
          </div>
        )}

        {/* ── Main lower-third bar ── */}
        <div style={{
          background: 'rgba(8,12,18,0.90)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'stretch',
          minHeight: 72,
        }}>

          {/* Left block: LIVE badge + match format */}
          <div style={{
            background: '#dc2626',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 14px',
            gap: 2,
            minWidth: 64,
          }}>
            <span style={{ fontSize: 8, fontWeight: 900, color: '#fff', letterSpacing: '0.15em', textTransform: 'uppercase' }}>LIVE</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{match.format || 'T20'}</span>
          </div>

          {/* Innings scores */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 14px', borderRight: '1px solid rgba(255,255,255,0.07)', minWidth: 200 }}>
            {match.innings.length > 0 ? match.innings.map((inn, i) => {
              const team = inn.teamSide === 'a' ? teamA : teamB
              const isCurrent = isLive && i === match.innings.length - 1
              const nameColor = i === 0 ? '#34d399' : '#22d3ee'
              const scoreColor = isCurrent ? '#fff' : 'rgba(255,255,255,0.5)'
              return (
                <div key={inn.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: nameColor, whiteSpace: 'nowrap' }}>
                    {team?.code || (team?.name ? team.name.slice(0, 3).toUpperCase() : (inn.battingTeam?.slice(0, 3).toUpperCase() || '???'))}
                  </span>
                  <span style={{ fontSize: isCurrent ? 20 : 14, fontWeight: 900, color: scoreColor, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {inn.scoreStr || (inn.runs !== null ? `${inn.runs}/${inn.wickets ?? 0}` : '—')}
                  </span>
                  {inn.overs && (
                    <span style={{ fontSize: 9, color: 'rgba(156,163,175,0.5)' }}>({inn.overs})</span>
                  )}
                </div>
              )
            }) : (
              <span style={{ fontSize: 12, color: 'rgba(156,163,175,0.7)' }}>{teamA?.name} vs {teamB?.name}</span>
            )}
          </div>

          {/* Current over balls */}
          {isLive && overBalls.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 12px', borderRight: '1px solid rgba(255,255,255,0.07)', gap: 4 }}>
              <span style={{ fontSize: 8, color: 'rgba(156,163,175,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Over {currentOver}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {overBalls.map((b, i) => <BallDot key={i} b={b} />)}
                {Array.from({ length: Math.max(0, 6 - overBalls.length) }).map((_, i) => (
                  <span key={i} style={{ width: 26, height: 26, borderRadius: '50%', border: '1px dashed rgba(75,85,99,0.5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'rgba(75,85,99,0.5)' }}>·</span>
                ))}
              </div>
            </div>
          )}

          {/* Current players */}
          {isLive && (striker || bowler) && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 12px', borderRight: '1px solid rgba(255,255,255,0.07)', gap: 5, minWidth: 200 }}>
              {striker && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{striker.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#34d399', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {striker.runs ?? '—'}<span style={{ fontSize: 9, color: 'rgba(156,163,175,0.6)', fontWeight: 400 }}>({striker.balls ?? '—'}b)</span>
                  </span>
                  {striker.fours != null && striker.fours > 0 && (
                    <span style={{ fontSize: 9, color: '#60a5fa', fontFamily: 'monospace' }}>{striker.fours}×4</span>
                  )}
                  {striker.sixes != null && striker.sixes > 0 && (
                    <span style={{ fontSize: 9, color: '#c084fc', fontFamily: 'monospace' }}>{striker.sixes}×6</span>
                  )}
                </div>
              )}
              {bowler && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, color: '#f87171' }}>⚡</span>
                  <span style={{ fontSize: 10, color: 'rgba(209,213,219,0.8)', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{bowler.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#f87171', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {bowler.wickets ?? 0}/{bowler.runs ?? 0}
                    <span style={{ fontSize: 9, color: 'rgba(156,163,175,0.6)', fontWeight: 400 }}> Eco:{bowler.economy ?? '—'}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Win probability */}
          {prob?.data && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 14px', borderRight: '1px solid rgba(255,255,255,0.07)', minWidth: 200 }}>
              <ProbPill data={prob.data} source={prob.source} />
            </div>
          )}

          {/* Chase info */}
          {chaseInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 8, color: 'rgba(156,163,175,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Target</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{chaseInfo.target}</p>
              </div>
              <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 8, color: 'rgba(156,163,175,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Need</p>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{chaseInfo.needed} off {chaseInfo.ballsLeft}b</p>
              </div>
              <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 8, color: 'rgba(156,163,175,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Req RR</p>
                <p style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: chaseInfo.reqRR > 12 ? '#f87171' : chaseInfo.reqRR < 7 ? '#34d399' : '#fbbf24' }}>
                  {chaseInfo.reqRR.toFixed(1)}
                </p>
              </div>
            </div>
          )}

          {/* Branding / spacer */}
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 14px', textAlign: 'right', gap: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '-0.01em' }}>
              CricketTips<span style={{ color: '#34d399' }}>.ai</span>
            </span>
            <span style={{ fontSize: 8, color: 'rgba(107,114,128,0.6)' }}>
              auto-updates every 30s
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
