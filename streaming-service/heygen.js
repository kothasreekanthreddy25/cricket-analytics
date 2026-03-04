/**
 * HeyGen API integration — AI avatar presenter for news videos
 *
 * Plan: Creator $29/month — unlimited videos, up to 30 min each, 700+ avatars
 *
 * Pipeline:
 *   1. Send narration script to HeyGen → avatar reads it on camera
 *   2. Poll for completion (usually 1–3 minutes)
 *   3. Download MP4 → return path for FFmpeg overlay step
 *
 * Required env vars:
 *   HEYGEN_API_KEY    — from app.heygen.com → Settings → API
 *   HEYGEN_AVATAR_ID  — optional, defaults to a professional Indian female avatar
 *   HEYGEN_VOICE_ID   — optional, defaults to Indian English female voice
 */

require('dotenv').config()
const axios = require('axios')
const fs = require('fs')

const BASE_URL = 'https://api.heygen.com'

// Default: professional Indian female avatar — change to any ID from your HeyGen library
// Browse avatars at: https://app.heygen.com/avatars
const DEFAULT_AVATAR_ID = process.env.HEYGEN_AVATAR_ID || 'Susan_expressive_20240820'

// Default: Indian English female voice
// Browse voices at: https://app.heygen.com/voices
const DEFAULT_VOICE_ID = process.env.HEYGEN_VOICE_ID || 'e9a9dc96f1784d9a9ecff09f6e1fb04c'

/**
 * Generate a talking presenter video via HeyGen API.
 * @param {string} narrationText  — full script narration (80–150 words)
 * @param {string} outputPath     — local path to save the downloaded MP4
 * @returns {string|null}         — outputPath on success, null on failure
 */
async function generateHeyGenVideo(narrationText, outputPath) {
  const apiKey = process.env.HEYGEN_API_KEY
  if (!apiKey) {
    console.log('[HeyGen] HEYGEN_API_KEY not set — skipping avatar presenter')
    return null
  }

  try {
    // ── Step 1: Create video ──────────────────────────────────────────────────
    console.log('[HeyGen] Creating avatar video...')
    const createRes = await axios.post(
      `${BASE_URL}/v2/video/generate`,
      {
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: DEFAULT_AVATAR_ID,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            input_text: narrationText.slice(0, 1500), // HeyGen max ~1500 chars per segment
            voice_id: DEFAULT_VOICE_ID,
            speed: 1.05,
          },
          background: {
            type: 'color',
            value: '#0f172a',   // dark navy — matches our brand
          },
        }],
        dimension: { width: 1280, height: 720 },
        aspect_ratio: '16:9',
      },
      {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    )

    const videoId = createRes.data?.data?.video_id
    if (!videoId) {
      console.error('[HeyGen] No video_id in response:', JSON.stringify(createRes.data))
      return null
    }
    console.log(`[HeyGen] Video queued: ${videoId}`)

    // ── Step 2: Poll for completion (max 15 min, check every 15 sec) ─────────
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise(r => setTimeout(r, 15000))

      const statusRes = await axios.get(
        `${BASE_URL}/v1/video_status.get?video_id=${videoId}`,
        {
          headers: { 'X-Api-Key': apiKey },
          timeout: 10000,
        }
      )

      const { status, video_url, error } = statusRes.data?.data || {}
      console.log(`[HeyGen] Status: ${status} (attempt ${attempt + 1}/60)`)

      if (status === 'completed' && video_url) {
        // ── Step 3: Download MP4 ──────────────────────────────────────────────
        console.log('[HeyGen] Downloading video...')
        const videoRes = await axios.get(video_url, {
          responseType: 'arraybuffer',
          timeout: 120000,
        })
        fs.writeFileSync(outputPath, videoRes.data)
        const sizeMB = (videoRes.data.byteLength / 1024 / 1024).toFixed(1)
        console.log(`[HeyGen] Downloaded ${sizeMB}MB → ${outputPath}`)
        return outputPath
      }

      if (status === 'failed') {
        console.error('[HeyGen] Video generation failed:', error || 'unknown error')
        return null
      }
    }

    console.error('[HeyGen] Timed out waiting for video (15 minutes)')
    return null
  } catch (err) {
    console.error('[HeyGen] API error:', err.response?.data?.message || err.message)
    return null
  }
}

/**
 * List available avatars — run once to find a good Indian female avatar ID.
 * Usage: node -e "require('./heygen').listAvatars()"
 */
async function listAvatars() {
  const apiKey = process.env.HEYGEN_API_KEY
  if (!apiKey) { console.error('HEYGEN_API_KEY not set'); return }
  try {
    const res = await axios.get(`${BASE_URL}/v2/avatars`, {
      headers: { 'X-Api-Key': apiKey },
    })
    const avatars = res.data?.data?.avatars || []
    console.log(`Found ${avatars.length} avatars:`)
    avatars.forEach(a => console.log(`  ${a.avatar_id}  —  ${a.avatar_name}`))
  } catch (err) {
    console.error('Error:', err.response?.data || err.message)
  }
}

module.exports = { generateHeyGenVideo, listAvatars }
