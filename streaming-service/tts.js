/**
 * Text-to-Speech
 *
 * Primary:  Google Cloud TTS — en-IN-Wavenet-D (Indian male accent)
 * Fallback: OpenAI TTS — onyx voice
 *
 * Set GOOGLE_TTS_API_KEY in .env to enable Indian accent.
 * If not set, falls back to OpenAI TTS automatically.
 */
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const OpenAI = require('openai').default

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const TMP_DIR = '/tmp/crickettips-audio'

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

/**
 * Google Cloud TTS — Indian English accent (en-IN-Wavenet-D)
 * Requires GOOGLE_TTS_API_KEY in .env
 */
async function googleTTS(text, filePath) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) return false

  try {
    const res = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        input: { text },
        voice: {
          languageCode: 'en-IN',
          name: 'en-IN-Wavenet-D',   // Indian male voice
          ssmlGender: 'MALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.05,          // Slightly faster — energetic delivery
          pitch: 0,
          effectsProfileId: ['headphone-class-device'],
        },
      },
      { timeout: 15000 }
    )

    const audioBuffer = Buffer.from(res.data.audioContent, 'base64')
    fs.writeFileSync(filePath, audioBuffer)
    console.log('[TTS] Google Cloud TTS (en-IN) — done')
    return true
  } catch (err) {
    console.warn('[TTS] Google Cloud TTS failed:', err.response?.data?.error?.message || err.message)
    return false
  }
}

/**
 * OpenAI TTS — fallback if Google TTS not configured
 */
async function openaiTTS(text, filePath) {
  try {
    const res = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx',
      input: text,
      response_format: 'mp3',
    })
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(filePath, buffer)
    console.log('[TTS] OpenAI TTS (fallback) — done')
    return true
  } catch (err) {
    console.error('[TTS] OpenAI TTS failed:', err.message)
    return false
  }
}

async function textToSpeech(text, filename) {
  const filePath = path.join(TMP_DIR, filename)
  try {
    // Try Google Cloud TTS first (Indian accent)
    const googleOk = await googleTTS(text, filePath)
    if (googleOk) return filePath

    // Fallback to OpenAI TTS
    const openaiOk = await openaiTTS(text, filePath)
    if (openaiOk) return filePath

    return null
  } catch (err) {
    console.error('[TTS] All TTS providers failed:', err.message)
    return null
  }
}

function cleanupOldAudio() {
  try {
    const files = fs.readdirSync(TMP_DIR)
    const now = Date.now()
    for (const file of files) {
      const filePath = path.join(TMP_DIR, file)
      const stat = fs.statSync(filePath)
      if (now - stat.mtimeMs > 10 * 60 * 1000) {
        fs.unlinkSync(filePath)
      }
    }
  } catch {}
}

module.exports = { textToSpeech, cleanupOldAudio }
