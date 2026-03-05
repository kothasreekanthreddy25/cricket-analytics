// Base URL — points to the Railway-deployed Next.js app
export const BASE_URL = 'https://crickettips.ai'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

// ── Match Endpoints ─────────────────────────────────────────────────────────

export interface MatchSummary {
  key: string
  name: string
  shortName: string
  status: 'live' | 'upcoming' | 'completed'
  statusNote: string
  teamA: string
  teamACode: string
  teamB: string
  teamBCode: string
  scoreA: string | null
  scoreB: string | null
  format: string
  venue: string
  startAt: string | null
  tournament: string
  source: string
}

export async function fetchFeaturedMatches(): Promise<MatchSummary[]> {
  const data = await apiFetch<any>('/api/matches')
  return data.matches || data || []
}

// ── Live Match Full Data ─────────────────────────────────────────────────────

export interface BallEvent {
  innings: string
  over: number
  ball: number
  runs: number
  batsmanRuns: number
  extras: number
  batsman: string
  bowler: string
  commentary: string
  isWicket: boolean
  wicketType: string | null
  dismissedPlayer: string | null
  isFour: boolean
  isSix: boolean
  milestone: string | null
}

export interface LiveMatchData {
  match: {
    key: string
    name: string
    shortName: string
    subTitle: string
    status: string
    playStatus: string
    format: string
    startAt: string | null
    winner: string | null
    venue: { name: string; city: string; country: string } | null
    teams: {
      a: { key: string; name: string; code: string } | null
      b: { key: string; name: string; code: string } | null
    }
    innings: Array<{
      key: string
      teamSide: string
      battingTeam: string
      runs: number | null
      wickets: number | null
      overs: string | null
      scoreStr: string | null
      runRate: number | null
    }>
    statusNote: string
  }
  currentPlayers: {
    liveInningKey: string | null
    striker: { name: string; runs: number | null; balls: number | null; fours: number | null; sixes: number | null; strikeRate: number | null } | null
    nonStriker: { name: string } | null
    bowler: { name: string; overs: string | null; runs: number | null; wickets: number | null; economy: number | null } | null
  }
  ballByBall: BallEvent[]
  probability: {
    data: {
      teamA: { key: string; name: string; code: string; pct: number }
      teamB: { key: string; name: string; code: string; pct: number }
    } | null
    source: string
  }
  graphs: { worm: any; manhattan: any; runRate: any }
}

export async function fetchLiveMatch(matchKey: string): Promise<LiveMatchData> {
  return apiFetch<LiveMatchData>(`/api/cricket/match/${matchKey}/full-live`)
}

// ── Blog / News ─────────────────────────────────────────────────────────────

export interface BlogPost {
  _id: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  mainImage?: string
  categories?: string[]
  author?: string
}

export async function fetchBlogPosts(page = 1): Promise<BlogPost[]> {
  const data = await apiFetch<any>(`/api/blog/posts?page=${page}&limit=20`)
  return data.posts || data || []
}

export async function fetchBlogPost(slug: string): Promise<any> {
  return apiFetch<any>(`/api/blog/posts/${slug}`)
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<{ user: any; token: string }> {
  return apiFetch('/api/auth/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function signOut(): Promise<void> {
  await apiFetch('/api/auth/sign-out', { method: 'POST' })
}

export async function getSession(): Promise<{ user: any } | null> {
  try {
    return await apiFetch<any>('/api/auth/get-session')
  } catch {
    return null
  }
}
