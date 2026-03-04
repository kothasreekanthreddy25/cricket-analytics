/**
 * YouTube Live Streaming — Broadcast + Stream Management
 *
 * Creates a YouTube Live broadcast, binds a stream to it,
 * returns the RTMP ingest URL, and transitions the broadcast
 * to 'live' when ready.
 *
 * Required env vars:
 *   YOUTUBE_CLIENT_ID
 *   YOUTUBE_CLIENT_SECRET
 *   YOUTUBE_REFRESH_TOKEN
 *   YOUTUBE_REDIRECT_URI  (default: http://localhost)
 */

const { google } = require('googleapis')

function getOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || 'http://localhost'
  )
  client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN })
  return client
}

/**
 * Creates a YouTube Live Broadcast + Stream, binds them, and returns the RTMP URL.
 *
 * @param {object} opts
 * @param {string} opts.title        — Broadcast title e.g. "India vs Australia LIVE"
 * @param {string} opts.description  — Broadcast description
 * @param {string} [opts.thumbnail]  — Local path to thumbnail JPG/PNG (optional)
 * @param {Date}   [opts.startTime]  — Scheduled start time (default: now)
 *
 * @returns {Promise<{ broadcastId, streamId, rtmpUrl, streamKey }>}
 */
async function createLiveBroadcast({ title, description, thumbnail, startTime }) {
  const auth = getOAuthClient()
  const youtube = google.youtube({ version: 'v3', auth })

  const scheduledStart = (startTime || new Date()).toISOString()

  // 1. Create the broadcast
  console.log('[YouTube] Creating live broadcast...')
  const broadcastRes = await youtube.liveBroadcasts.insert({
    part: ['snippet', 'status', 'contentDetails'],
    requestBody: {
      snippet: {
        title: title.slice(0, 100),
        description: (description || '').slice(0, 5000),
        scheduledStartTime: scheduledStart,
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
      contentDetails: {
        enableAutoStart: true,
        enableAutoStop: true,
        enableDvr: true,
        recordFromStart: true,
        enableContentEncryption: false,
        latencyPreference: 'ultraLow',
        monitorStream: {
          enableMonitorStream: false,
        },
      },
    },
  })

  const broadcastId = broadcastRes.data.id
  console.log(`[YouTube] Broadcast created: ${broadcastId}`)

  // 2. Create the live stream (gets the RTMP ingest details)
  console.log('[YouTube] Creating live stream...')
  const streamRes = await youtube.liveStreams.insert({
    part: ['snippet', 'cdn'],
    requestBody: {
      snippet: {
        title: `CricketTips-${title.slice(0, 40)}-${Date.now()}`,
      },
      cdn: {
        frameRate: '30fps',
        ingestionType: 'rtmp',
        resolution: '720p',
      },
    },
  })

  const streamId = streamRes.data.id
  const ingestion = streamRes.data.cdn?.ingestionInfo
  const streamKey = ingestion?.streamName || ''
  const rtmpBase = ingestion?.ingestionAddress || 'rtmp://a.rtmp.youtube.com/live2'
  const rtmpUrl = `${rtmpBase}/${streamKey}`

  console.log(`[YouTube] Stream created: ${streamId}`)
  console.log(`[YouTube] RTMP: ${rtmpBase}/***`)

  // 3. Bind stream to broadcast
  await youtube.liveBroadcasts.bind({
    id: broadcastId,
    part: ['id', 'contentDetails'],
    streamId,
  })
  console.log('[YouTube] Stream bound to broadcast')

  // 4. Upload thumbnail if provided
  if (thumbnail) {
    try {
      const fs = require('fs')
      await youtube.thumbnails.set({
        videoId: broadcastId,
        media: {
          mimeType: 'image/jpeg',
          body: fs.createReadStream(thumbnail),
        },
      })
      console.log('[YouTube] Thumbnail uploaded')
    } catch (err) {
      console.warn('[YouTube] Thumbnail upload failed:', err.message)
    }
  }

  // 5. Get the liveChatId from the broadcast (needed for chat polling)
  let liveChatId = null
  try {
    const bcRes = await youtube.liveBroadcasts.list({
      part: ['snippet'],
      id: [broadcastId],
    })
    liveChatId = bcRes.data.items?.[0]?.snippet?.liveChatId || null
    if (liveChatId) console.log(`[YouTube] liveChatId: ${liveChatId}`)
  } catch (err) {
    console.warn('[YouTube] Could not fetch liveChatId:', err.message)
  }

  return { broadcastId, streamId, rtmpUrl, streamKey, liveChatId }
}

/**
 * Transition a broadcast to 'live' status.
 * Call this after FFmpeg has been streaming for ~10-20 seconds.
 */
async function goLive(broadcastId) {
  const auth = getOAuthClient()
  const youtube = google.youtube({ version: 'v3', auth })

  console.log(`[YouTube] Transitioning broadcast ${broadcastId} to live...`)
  await youtube.liveBroadcasts.transition({
    broadcastStatus: 'live',
    id: broadcastId,
    part: ['id', 'status'],
  })
  console.log('[YouTube] Broadcast is now LIVE')
}

/**
 * Transition a broadcast to 'complete' (ends the stream).
 */
async function endLive(broadcastId) {
  const auth = getOAuthClient()
  const youtube = google.youtube({ version: 'v3', auth })

  try {
    await youtube.liveBroadcasts.transition({
      broadcastStatus: 'complete',
      id: broadcastId,
      part: ['id', 'status'],
    })
    console.log(`[YouTube] Broadcast ${broadcastId} ended`)
  } catch (err) {
    console.warn('[YouTube] Could not end broadcast:', err.message)
  }
}

/**
 * Get the watch URL for a broadcast.
 */
function getWatchUrl(broadcastId) {
  return `https://www.youtube.com/watch?v=${broadcastId}`
}

// ─── Live Chat Polling ────────────────────────────────────────────────────────

let chatPollTimer    = null
let chatPageToken    = null
let chatPollInterval = 5000  // YouTube will tell us the right interval

/**
 * Start polling YouTube Live Chat and call onMessages(messages[]) on new messages.
 * @param {string}   liveChatId
 * @param {function} onMessages  — called with Array<{ username, message }>
 */
function startChatPolling(liveChatId, onMessages) {
  if (!liveChatId) {
    console.warn('[Chat] No liveChatId — chat polling disabled')
    return
  }
  console.log(`[Chat] Starting chat polling for ${liveChatId}`)
  chatPageToken = null
  pollChat(liveChatId, onMessages)
}

async function pollChat(liveChatId, onMessages) {
  try {
    const auth    = getOAuthClient()
    const youtube = require('googleapis').google.youtube({ version: 'v3', auth })

    const params = {
      liveChatId,
      part: ['snippet', 'authorDetails'],
      maxResults: 20,
    }
    if (chatPageToken) params.pageToken = chatPageToken

    const res = await youtube.liveChatMessages.list(params)
    const data = res.data

    // Update page token for next poll
    chatPageToken    = data.nextPageToken || chatPageToken
    chatPollInterval = data.pollingIntervalMillis || 10000

    const messages = (data.items || []).map(item => ({
      username: item.authorDetails?.displayName || 'Viewer',
      message:  item.snippet?.displayMessage     || '',
    })).filter(m => m.message)

    if (messages.length > 0) {
      onMessages(messages)
    }
  } catch (err) {
    // Don't log on expected errors (broadcast not live yet, etc.)
    if (!err.message?.includes('forbidden') && !err.message?.includes('404')) {
      console.warn('[Chat] Poll error:', err.message)
    }
  }

  // Schedule next poll using YouTube's recommended interval
  chatPollTimer = setTimeout(() => pollChat(liveChatId, onMessages), chatPollInterval)
}

function stopChatPolling() {
  if (chatPollTimer) { clearTimeout(chatPollTimer); chatPollTimer = null }
  chatPageToken = null
  console.log('[Chat] Polling stopped')
}

module.exports = { createLiveBroadcast, goLive, endLive, getWatchUrl, startChatPolling, stopChatPolling }
