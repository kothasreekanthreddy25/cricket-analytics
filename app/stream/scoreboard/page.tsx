'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ball {
  over: number
  ball: number
  runs: number
  batsmanRuns: number
  extras: number
  isWicket: boolean
  isFour: boolean
  isSix: boolean
  batsman: string
  bowler: string
  commentary: string
  wicketType?: string | null
}

interface Innings {
  key: string
  teamSide: 'a' | 'b'
  battingTeam: string
  runs: number | null
  wickets: number | null
  overs: string | number | null
  scoreStr: string | null
  runRate: number | null
}

interface Team { key: string; name: string; code: string }

interface Match {
  key: string
  name: string
  shortName: string
  format: string
  status: string
  playStatus: string
  statusNote: string
  venue: { name: string; city: string; country: string } | null
  teams: { a: Team | null; b: Team | null }
  innings: Innings[]
  toss?: any
}

interface Probability {
  data: { teamA: { code: string; name: string; pct: number }; teamB: { code: string; name: string; pct: number } } | null
  source: string
}

interface LivePayload {
  success: boolean
  match: Match
  ballByBall: Ball[]
  probability: Probability
  currentPlayers?: any
}

interface TickerMatch {
  key?: string
  id?: string
  teamA: string
  teamB: string
  status: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed', inset: 0, width: 1920, height: 1080,
    background: 'linear-gradient(160deg, #040d1a 0%, #071428 50%, #060e20 100%)',
    color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden',
  },
  // Grid lines background
  gridBg: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: `
      linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
  },
  // Top glow
  topGlow: {
    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: 1200, height: 3, background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
    boxShadow: '0 0 40px rgba(16,185,129,0.6)',
  },
}

function fmt(n: number | null | undefined, decimals = 0) {
  if (n === null || n === undefined) return '—'
  return Number(n).toFixed(decimals)
}

function BallDot({ b }: { b: Ball }) {
  const style: React.CSSProperties = {
    width: 44, height: 44, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 800, flexShrink: 0,
    border: '2px solid',
    ...(b.isWicket
      ? { background: '#7f1d1d', borderColor: '#ef4444', color: '#fca5a5' }
      : b.isSix
      ? { background: '#4c1d95', borderColor: '#a855f7', color: '#d8b4fe' }
      : b.isFour
      ? { background: '#1e3a8a', borderColor: '#3b82f6', color: '#93c5fd' }
      : b.batsmanRuns === 0 && b.extras === 0
      ? { background: '#1f2937', borderColor: '#374151', color: '#6b7280' }
      : { background: '#064e3b', borderColor: '#10b981', color: '#6ee7b7' }),
  }
  const label = b.isWicket ? 'W' : b.isSix ? '6' : b.isFour ? '4'
    : b.batsmanRuns === 0 && b.extras === 0 ? '·' : String(b.batsmanRuns || b.runs)
  return <div style={style}>{label}</div>
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScoreboardPage() {
  const [liveKey, setLiveKey] = useState<string | null>(null)
  const [data, setData] = useState<LivePayload | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [connecting, setConnecting] = useState(true)
  const pollRef = useRef<NodeJS.Timeout>()

  // Detect live match
  const detectLive = useCallback(async () => {
    try {
      const r = await fetch('/api/cricket/ticker', { cache: 'no-store' })
      const j = await r.json()
      const live: TickerMatch[] = j?.live || []
      if (live.length > 0) {
        const key = live[0].key || live[0].id || null
        setLiveKey(key)
        setConnecting(false)
      }
    } catch { /* retry */ }
  }, [])

  // Fetch full live data
  const fetchLive = useCallback(async (key: string) => {
    try {
      const r = await fetch(`/api/cricket/match/${key}/full-live`, { cache: 'no-store' })
      const j = await r.json()
      if (j?.success) {
        setData(j)
        setLastUpdate(new Date())
      }
    } catch { /* retry */ }
  }, [])

  // Bootstrap: detect match
  useEffect(() => {
    detectLive()
    const t = setInterval(detectLive, 5 * 60_000)
    return () => clearInterval(t)
  }, [detectLive])

  // Once we have a key, poll live data every 15s
  useEffect(() => {
    if (!liveKey) return
    fetchLive(liveKey)
    pollRef.current = setInterval(() => fetchLive(liveKey), 15_000)
    return () => clearInterval(pollRef.current)
  }, [liveKey, fetchLive])

  if (connecting || !data || !data.match) {
    return <WaitingScreen />
  }

  return <Scoreboard data={data} lastUpdate={lastUpdate} />
}

// ─── Waiting Screen ────────────────────────────────────────────────────────────

function WaitingScreen() {
  const [dots, setDots] = useState('')
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={S.root}>
      <div style={S.gridBg} />
      <div style={S.topGlow} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 32,
      }}>
        {/* Logo */}
        <div style={{
          fontSize: 20, fontWeight: 700, letterSpacing: 4,
          color: '#10b981', textTransform: 'uppercase',
          border: '1px solid rgba(16,185,129,0.3)', padding: '10px 32px', borderRadius: 4,
        }}>
          CricketTips.ai
        </div>
        <div style={{
          fontSize: 56, fontWeight: 900, color: '#fff',
          textShadow: '0 0 40px rgba(16,185,129,0.4)',
        }}>
          🏏 Waiting for Match{dots}
        </div>
        <div style={{ fontSize: 22, color: '#6b7280', fontWeight: 500 }}>
          Stream will begin automatically when a match goes live
        </div>
        {/* Animated line */}
        <div style={{
          width: 200, height: 2, background: 'rgba(16,185,129,0.3)',
          borderRadius: 2, overflow: 'hidden', marginTop: 8,
        }}>
          <div style={{
            width: 80, height: '100%', background: '#10b981',
            animation: 'slide 1.5s ease-in-out infinite',
            borderRadius: 2,
          }} />
        </div>
        <style>{`
          @keyframes slide { 0%{transform:translateX(-100px)} 100%{transform:translateX(280px)} }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>
      </div>
    </div>
  )
}

// ─── Main Scoreboard ──────────────────────────────────────────────────────────

function Scoreboard({ data, lastUpdate }: { data: LivePayload; lastUpdate: Date | null }) {
  const { match, ballByBall, probability } = data
  const teamA = match.teams.a
  const teamB = match.teams.b
  const isLive = match.playStatus === 'live' || match.status === 'live'
  const inn1 = match.innings[0] ?? null
  const inn2 = match.innings[1] ?? null
  const batting = match.innings.length > 0 ? match.innings[match.innings.length - 1] : null

  // Compute current batsmen/bowler from ball data
  const currentBalls = ballByBall.slice(0, 6) // last 6 balls of current over
  const currentOver = ballByBall[0]?.over ?? 0
  const overBalls = ballByBall
    .filter(b => b.over === currentOver)
    .sort((a, b) => a.ball - b.ball)

  // Batters: last 2 unique undismissed
  const dismissedSet = new Set<string>()
  for (const b of [...ballByBall].reverse()) {
    if (b.isWicket && b.batsman) dismissedSet.add(b.batsman)
  }
  const seen = new Set<string>()
  const recentBatters: string[] = []
  for (const b of ballByBall.slice(0, 30)) {
    if (b.batsman && !seen.has(b.batsman)) {
      seen.add(b.batsman)
      recentBatters.push(b.batsman)
      if (recentBatters.length === 2) break
    }
  }
  const currentBowler = ballByBall.find(b => b.bowler)?.bowler ?? null

  // Batsman stats
  const batterStats: Record<string, { runs: number; balls: number; fours: number; sixes: number }> = {}
  const bowlerStats: Record<string, { runs: number; balls: number; wickets: number }> = {}
  for (const b of [...ballByBall].reverse()) {
    if (!b.batsman) continue
    if (!batterStats[b.batsman]) batterStats[b.batsman] = { runs: 0, balls: 0, fours: 0, sixes: 0 }
    batterStats[b.batsman].runs += b.batsmanRuns ?? 0
    batterStats[b.batsman].balls++
    if (b.isFour) batterStats[b.batsman].fours++
    if (b.isSix) batterStats[b.batsman].sixes++
    if (b.bowler) {
      if (!bowlerStats[b.bowler]) bowlerStats[b.bowler] = { runs: 0, balls: 0, wickets: 0 }
      bowlerStats[b.bowler].runs += b.runs ?? 0
      bowlerStats[b.bowler].balls++
      if (b.isWicket) bowlerStats[b.bowler].wickets++
    }
  }

  // Probability
  const pctA = probability.data ? Math.max(5, Math.min(95, probability.data.teamA.pct)) : 50
  const pctB = 100 - pctA
  const favA = pctA >= pctB

  // Chase info
  let target: number | null = null
  let needed: number | null = null
  let reqRR: number | null = null
  if (inn2 && inn1 && inn1.runs !== null && inn2.runs !== null) {
    target = inn1.runs + 1
    needed = target - inn2.runs
    const overs2 = parseFloat(String(inn2.overs ?? '0')) || 0
    const balls2 = Math.floor(overs2) * 6 + Math.round((overs2 % 1) * 10)
    const ballsLeft = 120 - balls2
    if (needed > 0 && ballsLeft > 0) reqRR = (needed / ballsLeft) * 6
  }

  const battingTeamName = batting
    ? (batting.teamSide === 'a' ? teamA?.name : teamB?.name) ?? batting.battingTeam
    : null

  return (
    <div style={S.root}>
      <div style={S.gridBg} />
      <div style={S.topGlow} />
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {/* ── Main layout ── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '40px 60px', height: '100%', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Row 1: Header bar ── */}
        <HeaderBar match={match} isLive={isLive} lastUpdate={lastUpdate} />

        {/* ── Row 2: Score cards ── */}
        <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
          <ScoreCard
            teamName={teamA?.name ?? 'Team A'}
            teamCode={teamA?.code ?? 'A'}
            innings={inn1}
            isBatting={batting?.teamSide === 'a'}
            isLive={isLive}
            color="#10b981"
          />
          <VSBlock pctA={pctA} pctB={pctB} favA={favA} match={match} />
          <ScoreCard
            teamName={teamB?.name ?? 'Team B'}
            teamCode={teamB?.code ?? 'B'}
            innings={inn2 ?? (inn1?.teamSide === 'b' ? inn1 : null)}
            isBatting={batting?.teamSide === 'b'}
            isLive={isLive}
            color="#06b6d4"
            flip
          />
        </div>

        {/* ── Row 3: Middle section ── */}
        <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
          {/* Left: Current over + batsmen */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Current over balls */}
            <CurrentOverBlock overBalls={overBalls} overNumber={currentOver} />
            {/* Batsmen */}
            <BatsmenBlock batters={recentBatters} stats={batterStats} />
          </div>

          {/* Right: Bowler + chase + recent balls */}
          <div style={{ width: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Bowler */}
            {currentBowler && <BowlerBlock name={currentBowler} stats={bowlerStats[currentBowler]} />}
            {/* Chase info */}
            {target !== null && needed !== null && (
              <ChaseBlock target={target} needed={needed} reqRR={reqRR} current={inn2?.runs ?? 0} />
            )}
            {/* Recent balls strip */}
            <RecentBallsBlock balls={ballByBall.slice(0, 18)} />
          </div>
        </div>

        {/* ── Row 4: Bottom ticker ── */}
        <BottomTicker match={match} pctA={pctA} pctB={pctB} teamA={teamA} teamB={teamB} />
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeaderBar({ match, isLive, lastUpdate }: { match: Match; isLive: boolean; lastUpdate: Date | null }) {
  const venue = match.venue ? `${match.venue.name}${match.venue.city ? ', ' + match.venue.city : ''}` : ''
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, padding: '14px 28px', flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          fontSize: 13, fontWeight: 800, letterSpacing: 3, color: '#10b981',
          textTransform: 'uppercase',
        }}>CricketTips.ai</div>
        {isLive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, background: '#7f1d1d',
            border: '1px solid #ef4444', borderRadius: 6, padding: '4px 12px',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
              animation: 'pulse 1s infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fca5a5', letterSpacing: 1 }}>LIVE</span>
          </div>
        )}
      </div>

      {/* Match name */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{match.shortName || match.name}</div>
        {venue && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{venue}</div>}
      </div>

      {/* Format + time */}
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: '#374151', background: 'rgba(255,255,255,0.06)',
          padding: '4px 10px', borderRadius: 4, letterSpacing: 2, textTransform: 'uppercase',
        }}>
          {match.format?.toUpperCase() || 'T20'}
        </div>
        {lastUpdate && (
          <div style={{ fontSize: 11, color: '#374151' }}>
            Updated {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreCard({ teamName, teamCode, innings, isBatting, isLive, color, flip }: {
  teamName: string; teamCode: string; innings: Innings | null
  isBatting: boolean; isLive: boolean; color: string; flip?: boolean
}) {
  const score = innings?.scoreStr
    || (innings?.runs !== null && innings?.runs !== undefined
      ? `${innings.runs}/${innings.wickets ?? 0}`
      : null)
  const overs = innings?.overs != null ? `(${innings.overs} ov)` : ''
  const rr = innings?.runRate != null ? innings.runRate.toFixed(2) : null

  return (
    <div style={{
      flex: 1, background: isBatting
        ? `linear-gradient(135deg, rgba(${color === '#10b981' ? '16,185,129' : '6,182,212'},0.12), rgba(${color === '#10b981' ? '16,185,129' : '6,182,212'},0.04))`
        : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isBatting ? color + '40' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 16, padding: '28px 36px',
      display: 'flex', flexDirection: 'column',
      alignItems: flip ? 'flex-end' : 'flex-start', gap: 8,
      position: 'relative', overflow: 'hidden',
    }}>
      {isBatting && (
        <div style={{
          position: 'absolute', top: 0, [flip ? 'right' : 'left']: 0,
          width: 4, height: '100%', background: color,
          boxShadow: `0 0 20px ${color}`,
        }} />
      )}
      {/* Team code pill */}
      <div style={{
        fontSize: 13, fontWeight: 800, color, letterSpacing: 3,
        textTransform: 'uppercase', background: color + '15',
        padding: '4px 14px', borderRadius: 6,
      }}>
        {teamCode}
      </div>
      {/* Team name */}
      <div style={{ fontSize: 18, fontWeight: 700, color: '#d1d5db', textAlign: flip ? 'right' : 'left' }}>
        {teamName}
      </div>
      {/* Score */}
      <div style={{
        fontSize: score ? 72 : 40, fontWeight: 900, color: isBatting ? color : '#6b7280',
        fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
        textShadow: isBatting ? `0 0 40px ${color}50` : 'none',
      }}>
        {score ?? (innings ? '—' : 'Yet to bat')}
      </div>
      {/* Overs + RR */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {overs && <span style={{ fontSize: 16, color: '#9ca3af', fontWeight: 600 }}>{overs}</span>}
        {rr && <span style={{ fontSize: 14, color: '#6b7280' }}>RR: {rr}</span>}
      </div>
      {isBatting && isLive && (
        <div style={{
          fontSize: 12, fontWeight: 700, color, background: color + '20',
          padding: '3px 10px', borderRadius: 4, letterSpacing: 1,
        }}>
          BATTING
        </div>
      )}
    </div>
  )
}

function VSBlock({ pctA, pctB, favA, match }: {
  pctA: number; pctB: number; favA: boolean; match: Match
}) {
  return (
    <div style={{
      width: 200, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 16, padding: '24px 20px',
    }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#374151', letterSpacing: 2 }}>VS</div>

      {/* Win probability mini bar */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
          Win Probability
        </div>
        <div style={{ width: '100%', height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', background: '#1f2937' }}>
          <div style={{
            width: `${pctA}%`, height: '100%',
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            transition: 'width 1s ease',
          }} />
          <div style={{
            flex: 1, height: '100%',
            background: 'linear-gradient(90deg, #0891b2, #06b6d4)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: favA ? '#10b981' : '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
            {pctA}%
          </span>
          <span style={{ fontSize: 20, fontWeight: 900, color: !favA ? '#06b6d4' : '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
            {pctB}%
          </span>
        </div>
        {Math.abs(pctA - pctB) >= 20 && (
          <div style={{
            fontSize: 11, color: favA ? '#10b981' : '#06b6d4',
            fontWeight: 700, textAlign: 'center', letterSpacing: 0.5,
          }}>
            ▲ {favA ? match.teams.a?.code : match.teams.b?.code} FAVOURITE
          </div>
        )}
      </div>
    </div>
  )
}

function CurrentOverBlock({ overBalls, overNumber }: { overBalls: Ball[]; overNumber: number }) {
  const empty = Math.max(0, 6 - overBalls.length)
  const overRuns = overBalls.reduce((s, b) => s + b.runs, 0)
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#4b5563', letterSpacing: 2, textTransform: 'uppercase' }}>
          Over {overNumber}
        </span>
        {overBalls.length > 0 && (
          <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>{overRuns} runs</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {overBalls.map((b, i) => <BallDot key={i} b={b} />)}
        {Array.from({ length: empty }).map((_, i) => (
          <div key={`e${i}`} style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '2px dashed #1f2937', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }} />
        ))}
      </div>
    </div>
  )
}

function BatsmenBlock({ batters, stats }: {
  batters: string[]
  stats: Record<string, { runs: number; balls: number; fours: number; sixes: number }>
}) {
  if (batters.length === 0) return null
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: '20px 24px', flex: 1,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
        At The Crease
      </div>
      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px 60px 80px', gap: 8, marginBottom: 10 }}>
        {['Batsman', 'Runs', 'Balls', '4s', '6s', 'SR'].map(h => (
          <div key={h} style={{ fontSize: 11, color: '#374151', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</div>
        ))}
      </div>
      {batters.map((name, idx) => {
        const s = stats[name] ?? { runs: 0, balls: 0, fours: 0, sixes: 0 }
        const sr = s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(0) : '—'
        return (
          <div key={name} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px 60px 80px',
            gap: 8, padding: '10px 0',
            borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined,
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {idx === 0 && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 1s infinite', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 18, fontWeight: 700, color: idx === 0 ? '#fff' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
              {idx === 0 && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>*</span>}
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{s.runs}</span>
            <span style={{ fontSize: 16, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{s.balls}</span>
            <span style={{ fontSize: 16, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{s.fours}</span>
            <span style={{ fontSize: 16, color: '#a855f7', fontVariantNumeric: 'tabular-nums' }}>{s.sixes}</span>
            <span style={{ fontSize: 16, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{sr}</span>
          </div>
        )
      })}
    </div>
  )
}

function BowlerBlock({ name, stats }: {
  name: string
  stats?: { runs: number; balls: number; wickets: number }
}) {
  const overs = stats ? `${Math.floor(stats.balls / 6)}.${stats.balls % 6}` : '0.0'
  const eco = stats && stats.balls > 0 ? ((stats.runs / stats.balls) * 6).toFixed(2) : '—'
  return (
    <div style={{
      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
      borderRadius: 14, padding: '16px 24px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
        Bowling
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{name}</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Stat label="Ov" value={overs} />
          <Stat label="Runs" value={String(stats?.runs ?? '—')} />
          <Stat label="Wkts" value={String(stats?.wickets ?? '—')} color="#ef4444" />
          <Stat label="Eco" value={eco} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color = '#fff' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

function ChaseBlock({ target, needed, reqRR, current }: {
  target: number; needed: number; reqRR: number | null; current: number
}) {
  const pct = Math.min(100, (current / target) * 100)
  const rrColor = reqRR == null ? '#9ca3af' : reqRR > 12 ? '#ef4444' : reqRR < 7 ? '#10b981' : '#f59e0b'
  return (
    <div style={{
      background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: 14, padding: '16px 24px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
        Chase
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 12 }}>
        <Stat label="Target" value={String(target)} color="#f59e0b" />
        <Stat label="Need" value={String(needed)} color="#fde68a" />
        {reqRR && <Stat label="Req RR" value={reqRR.toFixed(2)} color={rrColor} />}
        <Stat label="Score" value={String(current)} color="#9ca3af" />
      </div>
      <div style={{ width: '100%', height: 8, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: reqRR && reqRR > 12 ? '#ef4444' : reqRR && reqRR < 7 ? '#10b981' : '#f59e0b',
          borderRadius: 4, transition: 'width 1s ease',
        }} />
      </div>
    </div>
  )
}

function RecentBallsBlock({ balls }: { balls: Ball[] }) {
  if (balls.length === 0) return null
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: '16px 24px', flex: 1,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
        Recent Balls
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {balls.map((b, i) => <BallDot key={i} b={b} />)}
      </div>
    </div>
  )
}

function BottomTicker({ match, pctA, pctB, teamA, teamB }: {
  match: Match; pctA: number; pctB: number
  teamA: Team | null; teamB: Team | null
}) {
  const favCode = pctA >= pctB ? teamA?.code : teamB?.code
  const favPct = pctA >= pctB ? pctA : pctB
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
      borderRadius: 12, padding: '14px 28px', flexShrink: 0,
    }}>
      <div style={{ fontSize: 14, color: '#6b7280' }}>
        {match.statusNote && !match.statusNote.startsWith('NS')
          ? match.statusNote
          : `${match.format?.toUpperCase()} · ${match.teams.a?.name ?? ''} vs ${match.teams.b?.name ?? ''}`}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ fontSize: 13, color: '#4b5563' }}>
          <span style={{ color: '#10b981', fontWeight: 700 }}>{teamA?.code}</span>
          <span style={{ margin: '0 8px', color: '#374151' }}>{pctA}%</span>
          <span style={{ color: '#374151', margin: '0 6px' }}>·</span>
          <span style={{ color: '#06b6d4', fontWeight: 700 }}>{teamB?.code}</span>
          <span style={{ margin: '0 8px', color: '#374151' }}>{pctB}%</span>
        </div>
        <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>
          {favCode} favoured ({favPct}%)
        </div>
        <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, letterSpacing: 1 }}>
          crickettips.ai
        </div>
      </div>
    </div>
  )
}
