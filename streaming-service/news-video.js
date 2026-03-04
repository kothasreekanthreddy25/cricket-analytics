/**
 * CricketTips.ai — News Video Generator
 *
 * Pipeline:
 *   1. GPT-4o-mini → 90-second script (hook + 5 key points + outro)
 *   2. Google Cloud TTS (en-IN) → MP3 narration with Indian accent
 *   3. Fetch cricket background image (Unsplash curated pool)
 *   4. FFmpeg → 1280x720 video with image background + text overlays
 *   5. YouTube API → upload as public video
 */

require('dotenv').config()
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const OpenAI = require('openai').default
const { textToSpeech } = require('./tts')
const { uploadToYouTube } = require('./youtube-upload')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const TMP_DIR = '/tmp/crickettips-videos'
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const FONT_REG  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

// ─── Curated cricket background images (Unsplash, no API key needed) ──────────

const CRICKET_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1280&q=80', tags: ['bat', 'equipment', 'general', 'test'] },
  { url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1280&q=80', tags: ['stadium', 'venue', 'match', 'night', 't20'] },
  { url: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=1280&q=80', tags: ['batting', 'player', 'action', 'match'] },
  { url: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=1280&q=80', tags: ['ball', 'bowling', 'equipment', 'general'] },
  { url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1280&q=80', tags: ['ground', 'aerial', 'stadium', 'venue'] },
  { url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1280&q=80', tags: ['stumps', 'wicket', 'bowling', 'general'] },
  { url: 'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=1280&q=80', tags: ['match', 'playing', 'action', 'game'] },
  { url: 'https://images.unsplash.com/photo-1554178286-db408c69256a?w=1280&q=80', tags: ['bowling', 'bowler', 'action', 'player'] },
  { url: 'https://images.unsplash.com/photo-1593766788306-28561086694e?w=1280&q=80', tags: ['fans', 'crowd', 'stadium', 'tournament'] },
  { url: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1280&q=80', tags: ['pitch', 'ground', 'venue', 'test'] },
]

function pickImageUrl(title, keywords) {
  const terms = [...keywords, ...title.toLowerCase().split(/\s+/)].map(t => t.toLowerCase())
  let bestIdx = 0, bestScore = -1
  for (let i = 0; i < CRICKET_IMAGES.length; i++) {
    let score = Math.random() * 0.5
    for (const tag of CRICKET_IMAGES[i].tags) {
      if (terms.some(t => t.includes(tag) || tag.includes(t))) score += 2
    }
    if (score > bestScore) { bestScore = score; bestIdx = i }
  }
  return CRICKET_IMAGES[bestIdx].url
}

async function fetchBackgroundImage(title, keywords) {
  try {
    const url = pickImageUrl(title, keywords)
    const bgPath = path.join(TMP_DIR, `bg-${Date.now()}.jpg`)
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 12000,
      headers: { 'User-Agent': 'CricketTips/1.0 (video-gen)' },
    })
    fs.writeFileSync(bgPath, res.data)
    console.log('[VideoGen] Background image downloaded')
    return bgPath
  } catch (err) {
    console.warn('[VideoGen] Background image fetch failed (using dark fallback):', err.message)
    return null
  }
}

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

async function buildVideo(script, audioPath, outputPath, duration, bgImagePath) {
  const id = Date.now()

  const titleFile  = path.join(TMP_DIR, `title-${id}.txt`)
  const pointsFile = path.join(TMP_DIR, `points-${id}.txt`)
  const ctaFile    = path.join(TMP_DIR, `cta-${id}.txt`)

  const wrappedTitle = wrapText(script.title || '', 36)
  const wrappedPoints = script.points
    .map((p, i) => `${i + 1}. ${wrapText(p, 42)}`)
    .join('\n\n')

  fs.writeFileSync(titleFile,  wrappedTitle)
  fs.writeFileSync(pointsFile, wrappedPoints)
  fs.writeFileSync(ctaFile,    'Visit crickettips.ai for daily AI cricket predictions\nSubscribe for more cricket news and tips!')

  const titleEnd  = Math.min(7, duration * 0.1)
  const pointsEnd = Math.max(duration - 5, titleEnd + 10)

  const overlays = [
    // ── Semi-transparent dark panel for readability ──
    `drawbox=x=0:y=0:w=iw:h=ih:color=black@0.55:t=fill`,

    // ── Green accent bar at top ──
    `drawbox=x=0:y=0:w=iw:h=5:color=0x10b981:t=fill`,

    // ── Bottom bar ──
    `drawbox=x=0:y=696:w=iw:h=24:color=0x0f172a@0.92:t=fill`,

    // ── Always visible: logo + date + footer ──
    `drawtext=fontfile=${FONT_BOLD}:text='CricketTips.ai':fontsize=30:fontcolor=0x10b981:x=40:y=20`,
    `drawtext=fontfile=${FONT_REG}:text='${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}':fontsize=15:fontcolor=0xd1d5db:x=1040:y=26`,
    `drawtext=fontfile=${FONT_REG}:text='AI-powered cricket analysis  •  crickettips.ai':fontsize=16:fontcolor=0x9ca3af:x=40:y=700`,

    // ── Title slide (0 → titleEnd) ──
    `drawbox=x=30:y=72:w=iw-60:h=3:color=0xef4444:t=fill:enable='between(t\\,0\\,${titleEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:text='BREAKING NEWS':fontsize=18:fontcolor=0xef4444:x=40:y=82:enable='between(t\\,0\\,${titleEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:textfile=${titleFile}:fontsize=42:fontcolor=white:x=40:y=126:line_spacing=12:enable='between(t\\,0\\,${titleEnd})'`,

    // ── Key points slide (titleEnd → pointsEnd) ──
    `drawbox=x=30:y=72:w=iw-60:h=3:color=0x10b981:t=fill:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:text='KEY POINTS':fontsize=18:fontcolor=0x10b981:x=40:y=82:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_REG}:textfile=${pointsFile}:fontsize=27:fontcolor=white:x=40:y=126:line_spacing=14:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,

    // ── CTA slide (pointsEnd → end) ──
    `drawbox=x=30:y=72:w=iw-60:h=3:color=0xfbbf24:t=fill:enable='gte(t\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:text='SUBSCRIBE FOR MORE':fontsize=24:fontcolor=0xfbbf24:x=40:y=230:enable='gte(t\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_REG}:textfile=${ctaFile}:fontsize=28:fontcolor=white:x=40:y=295:line_spacing=14:enable='gte(t\\,${pointsEnd})'`,
  ].join(',')

  let args

  if (bgImagePath && fs.existsSync(bgImagePath)) {
    // Cricket background image with dark overlay
    const vf = `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,${overlays}`
    args = [
      '-loop', '1', '-i', bgImagePath,
      '-i', audioPath,
      '-vf', vf,
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2000k', '-g', '50',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
      '-t', String(Math.ceil(duration) + 1),
      '-shortest',
      '-y', outputPath,
    ]
  } else {
    // Fallback: plain dark background
    args = [
      '-f', 'lavfi', '-i', `color=c=0x0f172a:s=1280x720:r=25`,
      '-i', audioPath,
      '-vf', overlays,
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2000k', '-g', '50',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
      '-t', String(Math.ceil(duration) + 1),
      '-shortest',
      '-y', outputPath,
    ]
  }

  return new Promise((resolve, reject) => {
    console.log('[VideoGen] Rendering with', bgImagePath ? 'cricket background image' : 'dark background', '...')
    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    proc.stderr.on('data', d => {
      const msg = d.toString()
      if (msg.toLowerCase().includes('error')) console.error('[FFmpeg]', msg.trim())
    })

    proc.on('close', code => {
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
  let bgImagePath = null

  try {
    // 1. Generate script
    const script = await generateScript(title, excerpt || title)
    script.title = title
    console.log('[VideoGen] Script ready —', script.points.length, 'points')

    // 2. Fetch cricket background image
    bgImagePath = await fetchBackgroundImage(title, keywords)

    // 3. TTS narration (Indian accent via Google Cloud TTS)
    const ttsPath = await textToSpeech(script.narration, `narration-${ts}.mp3`)
    if (!ttsPath) throw new Error('TTS generation failed')

    // 4. Audio duration
    const duration = await getAudioDuration(ttsPath)
    console.log(`[VideoGen] Audio: ${duration.toFixed(1)}s`)

    // 5. Render video with background image
    await buildVideo(script, ttsPath, videoPath, duration, bgImagePath)
    console.log('[VideoGen] Video rendered:', videoPath)

    // 6. Upload to YouTube
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
    ;[ttsPath, videoPath, bgImagePath].forEach(f => { if (f) try { fs.unlinkSync(f) } catch {} })

    return { success: true, videoId, url: `https://youtube.com/watch?v=${videoId}` }
  } catch (err) {
    console.error('[VideoGen] Failed:', err.message)
    ;[audioPath, videoPath, bgImagePath].forEach(f => { if (f) try { fs.unlinkSync(f) } catch {} })
    return { success: false, error: err.message }
  }
}

module.exports = { createNewsVideo }
