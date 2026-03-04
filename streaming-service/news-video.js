/**
 * CricketTips.ai — News Video Generator
 *
 * Pipeline:
 *   1. GPT-4o-mini → 90-second script (hook + 5 key points + outro)
 *   2. Google Cloud TTS (en-IN) → MP3 narration with Indian accent
 *   3. Pexels API → free cricket/stadium/ground image (no player closeups = no image rights issues)
 *      Fallback: FFmpeg gradient background if Pexels unavailable
 *   4. FFmpeg → 1280x720 video with image + text overlays
 *   5. YouTube API → upload as public video
 *
 * Image safety:
 *   - Pexels License: free for commercial use, no attribution required
 *   - Queries only fetch venues/equipment/grounds — NOT player closeups
 *   - YouTube Content ID will NOT flag Pexels images
 *   Set PEXELS_API_KEY in .env (free at pexels.com/api) — falls back to gradient if not set.
 */

require('dotenv').config()
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const OpenAI = require('openai').default
const { textToSpeech } = require('./tts')
const { uploadToYouTube } = require('./youtube-upload')
const { generateHeyGenVideo } = require('./heygen')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const TMP_DIR = '/tmp/crickettips-videos'
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const FONT_REG  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

// Presenter image is generated ONCE and cached permanently on the VPS
const PRESENTER_IMAGE_PATH = '/tmp/crickettips-presenter.png'

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

// ─── AI Presenter Image ───────────────────────────────────────────────────────
// Generated once with DALL-E 3, saved to disk, reused for every video.
// No recurring cost — ~$0.04 one-time.

async function ensurePresenterImage() {
  // Already generated — reuse it
  if (fs.existsSync(PRESENTER_IMAGE_PATH)) return PRESENTER_IMAGE_PATH

  if (!process.env.OPENAI_API_KEY) return null

  try {
    console.log('[Presenter] Generating AI anchor image (one-time setup)...')
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Professional Indian female cricket news anchor, aged 28-32, wearing a formal blazer in dark navy blue with a white collared shirt, sitting at a news desk. She has long dark hair, natural makeup, warm confident smile, looking directly at camera. Studio lighting, clean professional TV news broadcast background (blurred dark blue/teal). Ultra realistic, photographic quality, suitable for a cricket sports news channel. No text, no logos. Full upper body shot, centered in frame.`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
    })

    const b64 = response.data[0].b64_json
    const buffer = Buffer.from(b64, 'base64')
    fs.writeFileSync(PRESENTER_IMAGE_PATH, buffer)
    console.log('[Presenter] AI anchor image saved:', PRESENTER_IMAGE_PATH)
    return PRESENTER_IMAGE_PATH
  } catch (err) {
    console.warn('[Presenter] DALL-E image generation failed (non-fatal):', err.message)
    return null
  }
}

// ─── Pexels image fetch — copyright-safe cricket visuals ──────────────────────
// Queries are carefully chosen to return venues/equipment, NOT player images.
// Pexels License = free commercial use, no attribution, no Content ID risk.

const PEXELS_QUERIES = [
  { q: 'cricket stadium aerial view',    tags: ['stadium', 'venue', 'ipl', 'tournament', 'general'] },
  { q: 'cricket pitch green ground',     tags: ['pitch', 'ground', 'test', 'odi', 'field'] },
  { q: 'cricket ball stumps close up',   tags: ['ball', 'stumps', 'wicket', 'bowling'] },
  { q: 'cricket ground night lights',    tags: ['night', 't20', 'ipl', 'bbl'] },
  { q: 'cricket bat equipment',          tags: ['bat', 'equipment', 'batting'] },
  { q: 'sports stadium floodlights',     tags: ['final', 'result', 'win', 'record'] },
  { q: 'cricket field oval top view',    tags: ['analysis', 'stats', 'prediction', 'ranking'] },
]

function pickPexelsQuery(title, keywords) {
  const terms = [...(keywords || []), ...title.toLowerCase().split(/\s+/)]
  let best = PEXELS_QUERIES[0], bestScore = -1
  for (const item of PEXELS_QUERIES) {
    let score = Math.random() * 0.3
    for (const tag of item.tags) {
      if (terms.some(t => String(t).toLowerCase().includes(tag) || tag.includes(String(t).toLowerCase()))) score += 2
    }
    if (score > bestScore) { bestScore = score; best = item }
  }
  return best.q
}

async function fetchPexelsImage(title, keywords) {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) return null

  try {
    const query = pickPexelsQuery(title, keywords)
    const res = await axios.get('https://api.pexels.com/v1/search', {
      headers: { Authorization: apiKey },
      params: { query, per_page: 10, orientation: 'landscape' },
      timeout: 10000,
    })
    const photos = res.data?.photos || []
    if (!photos.length) return null

    // Pick a random photo from results for variety
    const photo = photos[Math.floor(Math.random() * photos.length)]
    const imageUrl = photo.src?.large2x || photo.src?.large || photo.src?.original
    if (!imageUrl) return null

    const bgPath = path.join(TMP_DIR, `bg-${Date.now()}.jpg`)
    const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 })
    fs.writeFileSync(bgPath, imgRes.data)
    console.log(`[VideoGen] Pexels image: "${query}" — ${photo.photographer}`)
    return bgPath
  } catch (err) {
    console.warn('[VideoGen] Pexels fetch failed (using gradient fallback):', err.message)
    return null
  }
}

// ─── Gradient fallback themes — used when PEXELS_API_KEY not set ──────────────

const BG_THEMES = [
  { color1: '0x0f172a', color2: '0x134e4a', tags: ['general', 'test', 'odi'] },
  { color1: '0x052e16', color2: '0x166534', tags: ['pitch', 'ground', 'venue', 'field'] },
  { color1: '0x0c0a3e', color2: '0x312e81', tags: ['night', 't20', 'ipl', 'bbl', 'tournament'] },
  { color1: '0x450a0a', color2: '0x7f1d1d', tags: ['win', 'loss', 'result', 'final', 'record'] },
  { color1: '0x0f172a', color2: '0x1e3a5f', tags: ['stats', 'analysis', 'prediction', 'ranking'] },
]

function pickTheme(title, keywords) {
  const terms = [...(keywords || []), ...title.toLowerCase().split(/\s+/)]
  let best = BG_THEMES[0], bestScore = -1
  for (const theme of BG_THEMES) {
    let score = Math.random() * 0.3
    for (const tag of theme.tags) {
      if (terms.some(t => String(t).toLowerCase().includes(tag) || tag.includes(String(t).toLowerCase()))) score += 2
    }
    if (score > bestScore) { bestScore = score; best = theme }
  }
  return best
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

async function buildVideo(script, audioPath, outputPath, duration, themeOrImage, presenterImagePath) {
  const id = Date.now()

  const titleFile  = path.join(TMP_DIR, `title-${id}.txt`)
  const pointsFile = path.join(TMP_DIR, `points-${id}.txt`)
  const ctaFile    = path.join(TMP_DIR, `cta-${id}.txt`)

  fs.writeFileSync(titleFile,  wrapText(script.title || '', 36))
  fs.writeFileSync(pointsFile, script.points.map((p, i) => `${i + 1}. ${wrapText(p, 42)}`).join('\n\n'))
  fs.writeFileSync(ctaFile,    'Visit crickettips.ai for daily AI cricket predictions\nSubscribe for more cricket news and tips!')

  const titleEnd  = Math.min(7, duration * 0.1)
  const pointsEnd = Math.max(duration - 5, titleEnd + 10)

  const useImage    = typeof themeOrImage === 'string' && fs.existsSync(themeOrImage)
  const theme       = useImage ? null : (themeOrImage || BG_THEMES[0])
  const hasPresenter = !!(presenterImagePath && fs.existsSync(presenterImagePath))

  // Presenter placed bottom-right: x=870, y=330, 380x300px → bottom edge = y=630
  // Name bar goes below the image at y=634 (630 + 4px gap)
  const PRES_X = 870, PRES_Y = 330, PRES_W = 380, PRES_H = 300
  const NAME_Y = PRES_Y + PRES_H + 4   // y=634

  // Text content width: narrower when presenter shown to avoid overlap
  const textMaxX = hasPresenter ? 840 : 1240

  const textFilters = [
    // ── Semi-transparent dark panel over Pexels image for readability ──
    ...(useImage ? [`drawbox=x=0:y=0:w=iw:h=ih:color=black@0.52:t=fill`] : []),
    // ── Green accent bar at top ──
    `drawbox=x=0:y=0:w=iw:h=5:color=0x10b981:t=fill`,
    // ── Bottom bar ──
    `drawbox=x=0:y=696:w=iw:h=24:color=black@0.7:t=fill`,
    // ── Logo + date + footer ──
    `drawtext=fontfile=${FONT_BOLD}:text='CricketTips.ai':fontsize=30:fontcolor=0x10b981:x=40:y=18`,
    `drawtext=fontfile=${FONT_REG}:text='${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}':fontsize=15:fontcolor=0xd1d5db:x=1020:y=24`,
    `drawtext=fontfile=${FONT_REG}:text='AI-powered cricket analysis  •  crickettips.ai':fontsize=16:fontcolor=0x9ca3af:x=40:y=700`,
    // ── Title slide ──
    `drawbox=x=30:y=68:w=${textMaxX - 30}:h=3:color=0xef4444:t=fill:enable='between(t\\,0\\,${titleEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:text='BREAKING NEWS':fontsize=18:fontcolor=0xef4444:x=40:y=78:enable='between(t\\,0\\,${titleEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:textfile=${titleFile}:fontsize=42:fontcolor=white:x=40:y=122:line_spacing=12:enable='between(t\\,0\\,${titleEnd})'`,
    // ── Key points slide ──
    `drawbox=x=30:y=68:w=${textMaxX - 30}:h=3:color=0x10b981:t=fill:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:text='KEY POINTS':fontsize=18:fontcolor=0x10b981:x=40:y=78:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_REG}:textfile=${pointsFile}:fontsize=27:fontcolor=white:x=40:y=122:line_spacing=14:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,
    // ── CTA slide ──
    `drawbox=x=30:y=68:w=${textMaxX - 30}:h=3:color=0xfbbf24:t=fill:enable='gte(t\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:text='SUBSCRIBE FOR MORE':fontsize=24:fontcolor=0xfbbf24:x=40:y=230:enable='gte(t\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_REG}:textfile=${ctaFile}:fontsize=28:fontcolor=white:x=40:y=295:line_spacing=14:enable='gte(t\\,${pointsEnd})'`,
    // ── Presenter name bar — below image (image ends at PRES_Y+PRES_H=630) ──
    ...(hasPresenter ? [
      `drawbox=x=${PRES_X - 10}:y=${NAME_Y}:w=${PRES_W + 10}:h=34:color=0x10b981@0.92:t=fill`,
      `drawtext=fontfile=${FONT_BOLD}:text='Priya Sharma  |  CricketTips.ai':fontsize=15:fontcolor=white:x=${PRES_X}:y=${NAME_Y + 9}`,
    ] : []),
  ]

  // Build gradient expression for non-image backgrounds
  function gradientFilter(c1, c2) {
    const c1r = parseInt(c1.slice(2,4),16), c1g = parseInt(c1.slice(4,6),16), c1b = parseInt(c1.slice(6,8),16)
    const c2r = parseInt(c2.slice(2,4),16), c2g = parseInt(c2.slice(4,6),16), c2b = parseInt(c2.slice(6,8),16)
    return `geq=r='${c1r}+(${c2r-c1r})*Y/H':g='${c1g}+(${c2g-c1g})*Y/H':b='${c1b}+(${c2b-c1b})*Y/H'`
  }

  let args

  if (hasPresenter) {
    // ── 3 inputs: [0]=bg, [1]=audio, [2]=presenter image ──
    // filter_complex: background + text overlays → [bg]; scale presenter → [anchor]; overlay → [out]
    const bgChain = useImage
      ? `[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,${textFilters.join(',')}`
      : `[0:v]${gradientFilter(theme.color1, theme.color2)},${textFilters.filter(f => !f.startsWith('drawbox=x=0:y=0:w=iw:h=ih')).join(',')}`

    const filterComplex = [
      `${bgChain}[bg]`,
      `[2:v]scale=${PRES_W}:${PRES_H}[anchor]`,
      `[bg][anchor]overlay=x=${PRES_X}:y=${PRES_Y}[out]`,
    ].join(';')

    const bgInput = useImage
      ? ['-loop', '1', '-i', themeOrImage]
      : ['-f', 'lavfi', '-i', `color=c=black:s=1280x720:r=25`]

    args = [
      ...bgInput,
      '-i', audioPath,
      '-loop', '1', '-i', presenterImagePath,
      '-filter_complex', filterComplex,
      '-map', '[out]',   // ← correct: map the filter_complex output
      '-map', '1:a',
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2000k', '-g', '50',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
      '-t', String(Math.ceil(duration) + 1), '-shortest', '-y', outputPath,
    ]
  } else {
    // ── 2 inputs: [0]=bg, [1]=audio — simple -vf pipeline ──
    const vfChain = useImage
      ? textFilters.join(',')
      : `${gradientFilter(theme.color1, theme.color2)},${textFilters.filter(f => !f.startsWith('drawbox=x=0:y=0:w=iw:h=ih')).join(',')}`

    const bgInput = useImage
      ? ['-loop', '1', '-i', themeOrImage]
      : ['-f', 'lavfi', '-i', `color=c=black:s=1280x720:r=25`]

    args = [
      ...bgInput,
      '-i', audioPath,
      '-vf', vfChain,
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2000k', '-g', '50',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
      '-t', String(Math.ceil(duration) + 1), '-shortest', '-y', outputPath,
    ]
  }

  return new Promise((resolve, reject) => {
    console.log(`[VideoGen] Rendering — bg: ${useImage ? 'Pexels' : 'gradient'}, presenter: ${hasPresenter ? 'yes' : 'none'} ...`)
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

// ─── Text overlay on HeyGen video ────────────────────────────────────────────
// Adds branding + title + key points over a HeyGen MP4

async function addTextOverlays(script, inputPath, outputPath) {
  const id = Date.now()
  const titleFile  = path.join(TMP_DIR, `title-${id}.txt`)
  const pointsFile = path.join(TMP_DIR, `points-${id}.txt`)

  fs.writeFileSync(titleFile,  wrapText(script.title || '', 40))
  fs.writeFileSync(pointsFile, script.points.map((p, i) => `${i + 1}. ${wrapText(p, 44)}`).join('\n\n'))

  // Get duration of HeyGen video
  const duration = await getAudioDuration(inputPath)
  const titleEnd  = Math.min(8, duration * 0.15)
  const pointsEnd = Math.max(duration - 6, titleEnd + 12)

  const vf = [
    // Top green bar + logo
    `drawbox=x=0:y=0:w=iw:h=5:color=0x10b981:t=fill`,
    `drawtext=fontfile=${FONT_BOLD}:text='CricketTips.ai':fontsize=28:fontcolor=0x10b981:x=20:y=16`,
    `drawtext=fontfile=${FONT_REG}:text='${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}':fontsize=14:fontcolor=0xd1d5db:x=1020:y=20`,
    // Bottom bar
    `drawbox=x=0:y=696:w=iw:h=24:color=black@0.7:t=fill`,
    `drawtext=fontfile=${FONT_REG}:text='crickettips.ai  •  AI cricket predictions':fontsize=15:fontcolor=0x9ca3af:x=20:y=700`,
    // Title slide
    `drawbox=x=0:y=630:w=iw:h=62:color=black@0.75:t=fill:enable='between(t\\,0\\,${titleEnd})'`,
    `drawbox=x=0:y=630:w=8:h=62:color=0xef4444:t=fill:enable='between(t\\,0\\,${titleEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:textfile=${titleFile}:fontsize=22:fontcolor=white:x=20:y=638:line_spacing=8:enable='between(t\\,0\\,${titleEnd})'`,
    // Key points lower-third
    `drawbox=x=0:y=560:w=iw:h=132:color=black@0.75:t=fill:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,
    `drawbox=x=0:y=560:w=8:h=132:color=0x10b981:t=fill:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:text='KEY POINTS':fontsize=14:fontcolor=0x10b981:x=20:y=564:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_REG}:textfile=${pointsFile}:fontsize=18:fontcolor=white:x=20:y=584:line_spacing=10:enable='between(t\\,${titleEnd}\\,${pointsEnd})'`,
    // CTA
    `drawbox=x=0:y=630:w=iw:h=62:color=black@0.75:t=fill:enable='gte(t\\,${pointsEnd})'`,
    `drawbox=x=0:y=630:w=8:h=62:color=0xfbbf24:t=fill:enable='gte(t\\,${pointsEnd})'`,
    `drawtext=fontfile=${FONT_BOLD}:text='Subscribe for AI cricket predictions at crickettips.ai':fontsize=20:fontcolor=white:x=20:y=646:enable='gte(t\\,${pointsEnd})'`,
  ].join(',')

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-i', inputPath,
      '-vf', vf,
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2500k',
      '-c:a', 'aac', '-b:a', '128k',
      '-y', outputPath,
    ], { stdio: ['pipe', 'pipe', 'pipe'] })

    proc.stderr.on('data', d => {
      const msg = d.toString()
      if (msg.toLowerCase().includes('error')) console.error('[FFmpeg overlay]', msg.trim())
    })
    proc.on('close', code => {
      ;[titleFile, pointsFile].forEach(f => { try { fs.unlinkSync(f) } catch {} })
      if (code === 0) resolve(outputPath)
      else reject(new Error(`FFmpeg overlay exited with code ${code}`))
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

    // 2. Try HeyGen first (real talking avatar presenter — $29/month unlimited)
    let usedHeyGen = false
    if (process.env.HEYGEN_API_KEY) {
      const heygenPath = path.join(TMP_DIR, `heygen-${ts}.mp4`)
      const heygenResult = await generateHeyGenVideo(script.narration, heygenPath)
      if (heygenResult) {
        usedHeyGen = true
        console.log('[VideoGen] HeyGen avatar video ready — adding text overlays...')
        // Add text overlays (title, key points, logo) on top of HeyGen video
        await addTextOverlays(script, heygenResult, videoPath)
        console.log('[VideoGen] Video ready:', videoPath)
        try { fs.unlinkSync(heygenResult) } catch {}
      }
    }

    if (!usedHeyGen) {
      // Fallback: Pexels background + DALL-E static presenter + TTS audio
      console.log('[VideoGen] Using fallback: Pexels + TTS + AI photo presenter')

      // Fetch Pexels cricket image (copyright-safe)
      const bgImagePath = await fetchPexelsImage(title, keywords)
      const background = bgImagePath || pickTheme(title, keywords)

      // Ensure AI presenter image exists (generated once, reused forever)
      const presenterPath = await ensurePresenterImage()

      // TTS narration
      const ttsPath = await textToSpeech(script.narration, `narration-${ts}.mp3`)
      if (!ttsPath) throw new Error('TTS generation failed')

      const duration = await getAudioDuration(ttsPath)
      console.log(`[VideoGen] Audio: ${duration.toFixed(1)}s`)

      await buildVideo(script, ttsPath, videoPath, duration, background, presenterPath)
      console.log('[VideoGen] Video rendered:', videoPath)

      try { fs.unlinkSync(ttsPath) } catch {}
      if (bgImagePath) try { fs.unlinkSync(bgImagePath) } catch {}
    }

    // Upload to YouTube
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
    try { fs.unlinkSync(videoPath) } catch {}

    return { success: true, videoId, url: `https://youtube.com/watch?v=${videoId}`, presenter: usedHeyGen ? 'heygen' : 'photo' }
  } catch (err) {
    console.error('[VideoGen] Failed:', err.message)
    ;[audioPath, videoPath].forEach(f => { if (f) try { fs.unlinkSync(f) } catch {} })
    return { success: false, error: err.message }
  }
}

module.exports = { createNewsVideo }
