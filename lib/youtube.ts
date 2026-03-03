/**
 * YouTube Live Integration — lib/youtube.ts
 *
 * Handles:
 *  - OAuth 2.0 token management
 *  - Creating live broadcasts
 *  - Creating RTMP streams
 *  - Binding streams to broadcasts
 *  - Transitioning broadcast status (live / complete)
 *  - Fetching active broadcasts
 */

import { google, youtube_v3 } from 'googleapis'

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/auth/youtube/callback'
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || ''

// ─── OAuth Client ─────────────────────────────────────────────────────────────

export function getOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ],
  })
}

export async function getAuthenticatedClient() {
  const oauth2Client = getOAuthClient()
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN
  if (!refreshToken) {
    throw new Error('YOUTUBE_REFRESH_TOKEN not set. Visit /api/auth/youtube to authenticate.')
  }
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  // Auto-refresh access token when needed
  const { credentials } = await oauth2Client.refreshAccessToken()
  oauth2Client.setCredentials(credentials)
  return oauth2Client
}

function getYouTube(auth: any): youtube_v3.Youtube {
  return google.youtube({ version: 'v3', auth })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BroadcastInfo {
  broadcastId: string
  streamId: string
  rtmpUrl: string
  streamKey: string
  watchUrl: string
  videoId: string
  title: string
  status: string
}

// ─── Broadcast Management ─────────────────────────────────────────────────────

/**
 * Creates a new YouTube Live broadcast + RTMP stream for a match.
 * Returns the RTMP URL, stream key, and YouTube watch URL.
 */
export async function createMatchBroadcast(opts: {
  matchKey: string
  title: string
  description: string
  scheduledStartTime: string // ISO 8601
  thumbnailUrl?: string
}): Promise<BroadcastInfo> {
  const auth = await getAuthenticatedClient()
  const yt = getYouTube(auth)

  // 1. Create the broadcast
  const broadcastRes = await yt.liveBroadcasts.insert({
    part: ['snippet', 'status', 'contentDetails'],
    requestBody: {
      snippet: {
        title: opts.title,
        description: opts.description,
        scheduledStartTime: opts.scheduledStartTime,
        channelId: CHANNEL_ID,
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
      contentDetails: {
        enableAutoStart: true,
        enableAutoStop: true,
        enableDvr: true,
        enableEmbed: true,
        recordFromStart: true,
        latencyPreference: 'ultraLow',
      },
    },
  })

  const broadcastId = broadcastRes.data.id!
  const videoId = broadcastRes.data.id!

  // 2. Create the RTMP stream
  const streamRes = await yt.liveStreams.insert({
    part: ['snippet', 'cdn'],
    requestBody: {
      snippet: {
        title: `${opts.matchKey}-stream`,
        channelId: CHANNEL_ID,
      },
      cdn: {
        frameRate: 'variable',
        ingestionType: 'rtmp',
        resolution: 'variable',
      },
    },
  })

  const streamId = streamRes.data.id!
  const ingestion = streamRes.data.cdn?.ingestionInfo
  const rtmpUrl = ingestion?.ingestionAddress || ''
  const streamKey = ingestion?.streamName || ''

  // 3. Bind stream to broadcast
  await yt.liveBroadcasts.bind({
    id: broadcastId,
    part: ['id', 'snippet'],
    streamId,
  })

  return {
    broadcastId,
    streamId,
    rtmpUrl,
    streamKey,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
    title: opts.title,
    status: 'ready',
  }
}

/**
 * Transitions a broadcast to 'live' status.
 * Call this once RTMP stream is detected as active.
 */
export async function goLive(broadcastId: string): Promise<void> {
  const auth = await getAuthenticatedClient()
  const yt = getYouTube(auth)
  await yt.liveBroadcasts.transition({
    broadcastStatus: 'live',
    id: broadcastId,
    part: ['status'],
  })
}

/**
 * Ends a live broadcast.
 */
export async function endBroadcast(broadcastId: string): Promise<void> {
  const auth = await getAuthenticatedClient()
  const yt = getYouTube(auth)
  await yt.liveBroadcasts.transition({
    broadcastStatus: 'complete',
    id: broadcastId,
    part: ['status'],
  })
}

/**
 * Fetches active/upcoming broadcasts from the channel.
 */
export async function getActiveBroadcasts(): Promise<youtube_v3.Schema$LiveBroadcast[]> {
  const auth = await getAuthenticatedClient()
  const yt = getYouTube(auth)
  const res = await yt.liveBroadcasts.list({
    part: ['id', 'snippet', 'status', 'contentDetails'],
    broadcastStatus: 'active',
    maxResults: 10,
  })
  return res.data.items || []
}

/**
 * Fetches a broadcast by ID.
 */
export async function getBroadcast(broadcastId: string): Promise<youtube_v3.Schema$LiveBroadcast | null> {
  const auth = await getAuthenticatedClient()
  const yt = getYouTube(auth)
  const res = await yt.liveBroadcasts.list({
    part: ['id', 'snippet', 'status', 'contentDetails'],
    id: [broadcastId],
  })
  return res.data.items?.[0] || null
}

/**
 * Checks if a live stream is healthy (RTMP connected).
 */
export async function getStreamStatus(streamId: string): Promise<string> {
  const auth = await getAuthenticatedClient()
  const yt = getYouTube(auth)
  const res = await yt.liveStreams.list({
    part: ['id', 'status'],
    id: [streamId],
  })
  return res.data.items?.[0]?.status?.streamStatus || 'inactive'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a broadcast title for a cricket match.
 */
export function buildBroadcastTitle(teamA: string, teamB: string, matchType: string): string {
  return `🏏 ${teamA} vs ${teamB} LIVE | ${matchType.toUpperCase()} | AI Commentary | CricketTips.ai`
}

/**
 * Build a broadcast description.
 */
export function buildBroadcastDescription(teamA: string, teamB: string, matchType: string, venue: string): string {
  return `Watch ${teamA} vs ${teamB} live with real-time AI commentary powered by CricketTips.ai.

📊 Live scores, ball-by-ball updates, win probability & AI predictions.
🎙️ AI-generated commentary in real time.

🌐 Visit: https://crickettips.ai
📱 Get match tips & predictions at CricketTips.ai

#Cricket #Live #${teamA.replace(/\s/g, '')} #${teamB.replace(/\s/g, '')} #${matchType.toUpperCase()} #CricketTips`
}
