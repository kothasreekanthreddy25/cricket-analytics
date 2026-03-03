/**
 * CricketTips.ai — News Video Generator
 *
 * Pipeline:
 *   1. GPT-4o-mini → 90-second script (hook + 5 key points + outro)
 *   2. OpenAI TTS  → MP3 narration
 *   3. FFmpeg      → 1280x720 dark-themed video with text overlays
 *   4. YouTube API → upload as public video
 */

require('dotenv').config()
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const OpenAI = require('openai').default
const { textToSpeech } = require('./tts')
const { uploadToYouTube } = require('./youtube-upload')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const TMP_DIR = '/tmp/crickettips-videos'
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const FONT_REG  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

// ─── Script generation ────────────────────────────────────────────────────────

async function generateScript(title, excerpt) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `You are a cricket news presenter for CricketTips.ai.
Write a 90-second video script for this article.

Title: ${title}
Summary: ${excerpt}

Return ONLY valid JSON:
{
  "points": [
    "Short bullet point 1 (max 10 words)",
    "Short bullet point 2 (max 10 words)",
    "Short bullet point 3 (max 10 words)",
    "Short bullet point 4 (max 10 words)",
    "Short bullet point 5 (max 10 words)"
  ],
  "narration": "Natural spoken narration 80-100 words. Cover all 5 points. End with: For AI cricket predictions, visit crickettips dot ai and subscribe."
}`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })
  return JSON.parse(res.choices[0].message.content)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrapText(text, maxChars = 44) {
  const words = String(text).replace(/['"\\:]/g, ' ').split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    if (!w) continue
    if ((cur + ' ' + w).trim().length <= maxChars) {
      cur = (cur + ' ' + w).trim()
    } else {
      if (cur) lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines.join('\n')
}

function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    const p = spawn('ffprobe', [
      '-v', 'quiet', '-print_format', 'json', '-show_format', filePath,
    ])
    let out = ''
    p.stdout.on('data', d => { out += d.toString() })
    p.on('close', () => {
      try { resolve(parseFloat(JSON.parse(out).format.duration) || 90) }
      catch { resolve(90) }
    })
  })
}

// ─── FFmpeg video builder ─────────────────────────────────────────────────────

async function buildVideo(script, audioPath, outputPath, duration) {
  const id = Date.now()

  // Write text to temp files (avoids FFmpeg escaping headaches)
  const titleFile = path.join(TMP_DIR, `title-${id}.txt`)
  const pointsFile = path.join(TMP_DIR, `points-${id}.txt`)
  const ctaFile    = path.join(TMP_DIR, `cta-${id}.txt`)

  const wrappedTitle = wrapText(script.title || '', 36)
  const wrappedPoints = script.points
    .map((p, i) => `${i + 1}. ${wrapText(p, 42)}`)
    .join('\n\n')

  fs.writeFileSync(titleFile,  wrappedTitle)
  fs.writeFileSync(pointsFile, wrappedPoints)
  fs.writeFileSync(ctaFile,    'Visit crickettips.ai for daily AI cricket predictions\nSubscribe for more cricket news and tips!')

  // Timing
  const titleEnd  = Math.min(7, duration * 0.1)
  const pointsEnd = Math.max(duration - 5, titleEnd + 10)

  const vf = [
    // ── Always visible ──
    // Logo
    `drawtext=fontfile=${FONT_BOLD}:text='CricketTips.ai':fontsize=28:fontcolor=0x10b981:x=40:y=28`,
    // Horizontal rule (simulated)
    `drawtext=fontfile=${FONT_BOLD}:text='____________________________________________':fontsize=12:fontcolor=0x374151:x=40:y=62`,
    // Date
    `drawtext=fontfile=${FONT_REG}:text='${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}':fontsize=15:fontcolor=0x6b7280:x=1050:y=30`,
    // Footer
    `drawtext=fontfile=${FONT_REG}:text='AI-powered cricket analysis  •  crickettips.ai':fontsize=17:fontcolor=0x6b7280:x=40:y=682`,

    // ── Title slide (0 → titleEnd) ──
    `drawtext=fontfile=${FONT_BOLD}:text='BREAKING NEWS':fontsize=18:fontcolor=0xef4444:x=40:y=88:enable='between(t\\,0\\,${titleEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:textfile=${titleFile}:fontsize=40:fontcolor=white:x=40:y=130:line_spacing=10:enable='between(t\\,0\\,${titleEnd})'`,

    // ── Key points slide (titleEnd → pointsEnd) ──
    `drawtext=fontfile=${FONT_BOLD}:text='KEY POINTS':fontsize=18:fontcolor=0x10b981:x=40:y=88:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_REG}:textfile=${pointsFile}:fontsize=26:fontcolor=white:x=40:y=130:line_spacing=12:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,

    // ── CTA slide (pointsEnd → end) ──
    `drawtext=fontfile=${FONT_BOLD}:text='SUBSCRIBE FOR MORE':fontsize=22:fontcolor=0xfbbf24:x=40:y=250:enable='gte(t\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_REG}:textfile=${ctaFile}:fontsize=28:fontcolor=white:x=40:y=310:line_spacing=12:enable='gte(t\\,${pointsEnd})'`,
  ].join(',')

  const args = [
    '-f', 'lavfi', '-i', `color=c=0x0f172a:s=1280x720:r=25`,
    '-i', audioPath,
    '-vf', vf,
    '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2000k', '-g', '50',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-t', String(Math.ceil(duration) + 1),
    '-shortest',
    '-y', outputPath,
  ]

  return new Promise((resolve, reject) => {
    console.log('[VideoGen] Rendering...')
    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    proc.stderr.on('data', d => {
      const msg = d.toString()
      if (msg.toLowerCase().includes('error')) console.error('[FFmpeg]', msg.trim())
    })

    proc.on('close', code => {
      // Cleanup temp text files
      ;[titleFile, pointsFile, ctaFile].forEach(f => { try { fs.unlinkSync(f) } catch {} })
      if (code === 0) resolve(outputPath)
      else reject(new Error(`FFmpeg exited with code ${code}`))
    })
  })
}

// ─── Main export ──────────────────────────────────────────────────────────────

async function createNewsVideo({ title, excerpt, slug, keywords = [] }) {
  console.log(`[VideoGen] Starting for: "${title.slice(0, 60)}"`)
  const ts = Date.now()
  const audioPath = path.join(TMP_DIR, `narration-${ts}.mp3`)
  const videoPath = path.join(TMP_DIR, `news-${ts}.mp4`)

  try {
    // 1. Generate script
    const script = await generateScript(title, excerpt || title)
    script.title = title
    console.log('[VideoGen] Script ready —', script.points.length, 'points')

    // 2. TTS narration
    const ttsPath = await textToSpeech(script.narration, `narration-${ts}.mp3`)
    if (!ttsPath) throw new Error('TTS generation failed')

    // 3. Audio duration
    const duration = await getAudioDuration(ttsPath)
    console.log(`[VideoGen] Audio: ${duration.toFixed(1)}s`)

    // 4. Render video
    await buildVideo(script, ttsPath, videoPath, duration)
    console.log('[VideoGen] Video rendered:', videoPath)

    // 5. Upload to YouTube
    const articleUrl = `https://crickettips.ai/blog/${slug}`
    const description = [
      excerpt || title,
      '',
      `📖 Full article: ${articleUrl}`,
      '',
      '🏏 CricketTips.ai — AI-powered cricket predictions, live scores & analysis',
      '🔔 Subscribe for daily cricket news and AI predictions!',
      '',
      '#cricket #cricketpredictions #CricketTips #T20WorldCup2026',
      keywords.slice(0, 6).map(k => '#' + k.replace(/\s+/g, '')).join(' '),
    ].join('\n')

    const videoId = await uploadToYouTube({
      videoPath,
      title: `${title.slice(0, 90)} | CricketTips.ai`,
      description,
      tags: ['cricket', 'cricket news', 'cricket predictions', 'T20 World Cup 2026', 'CricketTips.ai', ...keywords.slice(0, 10)],
    })

    console.log(`[VideoGen] YouTube upload done: https://youtube.com/watch?v=${videoId}`)

    // Cleanup
    ;[ttsPath, videoPath].forEach(f => { try { fs.unlinkSync(f) } catch {} })

    return { success: true, videoId, url: `https://youtube.com/watch?v=${videoId}` }
  } catch (err) {
    console.error('[VideoGen] Failed:', err.message)
    ;[audioPath, videoPath].forEach(f => { try { fs.unlinkSync(f) } catch {} })
    return { success: false, error: err.message }
  }
}

module.exports = { createNewsVideo }
