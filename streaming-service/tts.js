/**
 * Text-to-Speech — OpenAI TTS
 */
const OpenAI = require('openai').default
const fs = require('fs')
const path = require('path')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const TMP_DIR = '/tmp/crickettips-audio'

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

async function textToSpeech(text, filename) {
  const filePath = path.join(TMP_DIR, filename)
  try {
    const res = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx',   // Deep, authoritative voice for cricket commentary
      input: text,
      response_format: 'mp3',
    })
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(filePath, buffer)
    return filePath
  } catch (err) {
    console.error('[TTS] Failed:', err.message)
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
      if (now - stat.mtimeMs > 10 * 60 * 1000) { // older than 10 min
        fs.unlinkSync(filePath)
      }
    }
  } catch {}
}

module.exports = { textToSpeech, cleanupOldAudio }
