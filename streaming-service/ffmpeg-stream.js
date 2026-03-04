/**
 * FFmpeg Stream Manager — 1280×720 Full Overlay
 *
 * Layout:
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ TOP BAR: CricketTips.ai  ●LIVE  📱@crickettipsai  🔔SUBSCRIBE+LIKE          │ 0-65px
 * ├─────────────────────────────────────┬────────────────────────────────────────┤
 * │ LEFT PANEL (x 0-760)                │ RIGHT PANEL — LIVE CHAT (x 768-1275)   │
 * │  Score box                          │  💬 LIVE CHAT header                   │
 * │  1st-inn projected / 2nd-inn chase  │  User1: message...                     │
 * │  BATTING                            │  ────────────────────                  │
 * │    Striker  runs(balls) SR 4s 6s    │  User2: message...                     │
 * │    Tourn: runs | Avg | SR           │  ────────────────────                  │
 * │    Career T20I: Avg | SR            │  User3: message...                     │
 * │    Form: last 5 scores              │  ────────────────────                  │
 * │    Non-striker (same 3 lines)       │  User4: message...                     │
 * │  BOWLING  bowler stats              │                                        │
 * │  AI COMMENTARY                      │  ╔══════════════════╗                  │
 * │  TOURNAMENT STATS                   │  ║  SIX! / FOUR!    ║  (dynamic)       │
 * │                                     │  ║  WICKET!         ║                  │
 * │                                     │  ╚══════════════════╝                  │
 * ├─────────────────────────────────────┴────────────────────────────────────────┤
 * │ BOTTOM BAR: @crickettipsai on Telegram  |  🔔 SUBSCRIBE  👍 LIKE             │ 690-720px
 * └──────────────────────────────────────────────────────────────────────────────┘
 */

const { spawn, execSync } = require('child_process')
const fs   = require('fs')

// ─── Text overlay file paths ───────────────────────────────────────────────────
const SCORE_FILE          = '/tmp/crickettips-score.txt'
const COMMENTARY_FILE     = '/tmp/crickettips-commentary.txt'
const EVENT_FILE          = '/tmp/crickettips-event.txt'
const FIELD_FILE          = '/tmp/crickettips-field.txt'
const AUDIO_FIFO          = '/tmp/crickettips-audio.pipe'
const CONTEXT_FILE        = '/tmp/crickettips-context.txt'    // projected score or chase info
const BATSMAN1_FILE       = '/tmp/crickettips-batsman1.txt'   // striker match stats
const BATSMAN1_TOURN_FILE = '/tmp/crickettips-bat1tourn.txt'  // striker tourn + career
const BATSMAN1_CAREER_FILE= '/tmp/crickettips-bat1career.txt' // striker career T20I + form
const BATSMAN2_FILE       = '/tmp/crickettips-batsman2.txt'   // non-striker match stats
const BATSMAN2_TOURN_FILE = '/tmp/crickettips-bat2tourn.txt'  // non-striker tourn
const BATSMAN2_CAREER_FILE= '/tmp/crickettips-bat2career.txt' // non-striker career + form
const BOWLER_STATS_FILE   = '/tmp/crickettips-bowler-stats.txt'
const TOURN_RUNS_FILE     = '/tmp/crickettips-tourn-runs.txt'
const TOURN_WKTS_FILE     = '/tmp/crickettips-tourn-wkts.txt'
// Chat message slots (4 slots, 2 files each: username + message)
const CHAT1U = '/tmp/crickettips-c1u.txt'
const CHAT1M = '/tmp/crickettips-c1m.txt'
const CHAT2U = '/tmp/crickettips-c2u.txt'
const CHAT2M = '/tmp/crickettips-c2m.txt'
const CHAT3U = '/tmp/crickettips-c3u.txt'
const CHAT3M = '/tmp/crickettips-c3m.txt'
const CHAT4U = '/tmp/crickettips-c4u.txt'
const CHAT4M = '/tmp/crickettips-c4m.txt'

const CHAT_USER_FILES = [CHAT1U, CHAT2U, CHAT3U, CHAT4U]
const CHAT_MSG_FILES  = [CHAT1M, CHAT2M, CHAT3M, CHAT4M]

const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const FONT_REG  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

let ffmpegProcess   = null
let audioQueue      = []
let isPlayingAudio  = false
let eventClearTimer = null

// Chat ring buffer — oldest first, newest last
const chatBuffer = []
const MAX_CHAT   = 4

// ─── Helpers ───────────────────────────────────────────────────────────────────

const cap = (v, len = 72) => String(v || ' ').slice(0, len) || ' '

/** Strip characters that break FFmpeg drawtext when reading from a file */
function sanitizeText(str) {
  return String(str || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')  // control chars
    .replace(/[%\\]/g, ' ')                   // ffmpeg special chars
    .replace(/\s+/g, ' ')
    .trim() || ' '
}

// ─── File init ─────────────────────────────────────────────────────────────────

function initFiles(teamA, teamB) {
  fs.writeFileSync(SCORE_FILE,          `${teamA} vs ${teamB}  -  LIVE`)
  fs.writeFileSync(COMMENTARY_FILE,     'CricketTips.ai - AI Powered Commentary')
  fs.writeFileSync(EVENT_FILE,          ' ')
  fs.writeFileSync(FIELD_FILE,          ' ')
  fs.writeFileSync(CONTEXT_FILE,        'Match starting...')
  fs.writeFileSync(BATSMAN1_FILE,       'Waiting for play...')
  fs.writeFileSync(BATSMAN1_TOURN_FILE, ' ')
  fs.writeFileSync(BATSMAN1_CAREER_FILE,' ')
  fs.writeFileSync(BATSMAN2_FILE,       ' ')
  fs.writeFileSync(BATSMAN2_TOURN_FILE, ' ')
  fs.writeFileSync(BATSMAN2_CAREER_FILE,' ')
  fs.writeFileSync(BOWLER_STATS_FILE,   ' ')
  fs.writeFileSync(TOURN_RUNS_FILE,     ' ')
  fs.writeFileSync(TOURN_WKTS_FILE,     ' ')
  for (const f of [...CHAT_USER_FILES, ...CHAT_MSG_FILES]) fs.writeFileSync(f, ' ')

  // Audio via anullsrc (no FIFO needed)
}

// ─── Update functions ──────────────────────────────────────────────────────────

function updateScore(scoreText) {
  fs.writeFileSync(SCORE_FILE, cap(scoreText, 62))
}

/**
 * 1st innings: "PROJECTED TOTAL: 178-195  (CRR: 8.52)"
 * 2nd innings: "TARGET: 195  |  NEED 67 off 42 balls  |  RRR: 9.6"
 */
function updateInningsContext(contextText) {
  fs.writeFileSync(CONTEXT_FILE, cap(contextText, 72))
}

function updateCommentary(text) {
  fs.writeFileSync(COMMENTARY_FILE, cap(text, 74))
}

function updateEvent(text, field = '') {
  fs.writeFileSync(EVENT_FILE, cap(text, 12))
  fs.writeFileSync(FIELD_FILE, cap(field, 28))
  if (eventClearTimer) clearTimeout(eventClearTimer)
  eventClearTimer = setTimeout(() => {
    fs.writeFileSync(EVENT_FILE, ' ')
    fs.writeFileSync(FIELD_FILE, ' ')
  }, 3000)
}

/**
 * Update batting + bowling stat lines.
 * striker / nonStriker: { name, runs, balls, fours, sixes, strikeRate }
 * bowler:               { name, overs, runs, wickets, economy }
 */
function updateCurrentPlayers(striker, nonStriker, bowler) {
  if (striker?.name) {
    const sr = striker.strikeRate != null ? Number(striker.strikeRate).toFixed(1) : '-'
    fs.writeFileSync(BATSMAN1_FILE,
      cap(`${striker.name}   ${striker.runs ?? 0}(${striker.balls ?? 0})   SR:${sr}   4s:${striker.fours ?? 0}   6s:${striker.sixes ?? 0}   ON STRIKE`))
  } else {
    fs.writeFileSync(BATSMAN1_FILE, ' ')
    fs.writeFileSync(BATSMAN1_TOURN_FILE, ' ')
    fs.writeFileSync(BATSMAN1_CAREER_FILE, ' ')
  }

  if (nonStriker?.name) {
    const sr = nonStriker.strikeRate != null ? Number(nonStriker.strikeRate).toFixed(1) : '-'
    fs.writeFileSync(BATSMAN2_FILE,
      cap(`${nonStriker.name}   ${nonStriker.runs ?? 0}(${nonStriker.balls ?? 0})   SR:${sr}   4s:${nonStriker.fours ?? 0}   6s:${nonStriker.sixes ?? 0}`))
  } else {
    fs.writeFileSync(BATSMAN2_FILE, ' ')
    fs.writeFileSync(BATSMAN2_TOURN_FILE, ' ')
    fs.writeFileSync(BATSMAN2_CAREER_FILE, ' ')
  }

  if (bowler?.name) {
    const eco = bowler.economy != null ? Number(bowler.economy).toFixed(1) : '-'
    fs.writeFileSync(BOWLER_STATS_FILE,
      cap(`${bowler.name}   ${bowler.wickets ?? 0}/${bowler.runs ?? 0}   ${bowler.overs ?? '-'} ov   Eco:${eco}`))
  } else {
    fs.writeFileSync(BOWLER_STATS_FILE, ' ')
  }
}

/**
 * Update tournament + career stats shown beneath each batsman.
 * @param {{ tourn: string, career: string }|null} strikerExtra
 * @param {{ tourn: string, career: string }|null} nonStrikerExtra
 */
function updatePlayerExtras(strikerExtra, nonStrikerExtra) {
  fs.writeFileSync(BATSMAN1_TOURN_FILE,  cap(strikerExtra?.tourn  || ' ', 76))
  fs.writeFileSync(BATSMAN1_CAREER_FILE, cap(strikerExtra?.career || ' ', 76))
  fs.writeFileSync(BATSMAN2_TOURN_FILE,  cap(nonStrikerExtra?.tourn  || ' ', 76))
  fs.writeFileSync(BATSMAN2_CAREER_FILE, cap(nonStrikerExtra?.career || ' ', 76))
}

function updateTournamentStats(topScorers, topWicketTakers) {
  if (topScorers?.length > 0) {
    fs.writeFileSync(TOURN_RUNS_FILE,
      cap('RUNS: ' + topScorers.map(p => `${p.name} ${p.runs}`).join('  |  '), 80))
  } else {
    fs.writeFileSync(TOURN_RUNS_FILE, ' ')
  }
  if (topWicketTakers?.length > 0) {
    fs.writeFileSync(TOURN_WKTS_FILE,
      cap('WKTS: ' + topWicketTakers.map(p => `${p.name} ${p.wickets}`).join('  |  '), 80))
  } else {
    fs.writeFileSync(TOURN_WKTS_FILE, ' ')
  }
}

/**
 * Push new YouTube live chat messages into the 4-slot overlay.
 * @param {Array<{ username: string, message: string }>} messages  newest messages
 */
function updateChat(messages) {
  if (!messages?.length) return

  for (const m of messages) {
    chatBuffer.push({
      username: sanitizeText(m.username || 'Viewer').slice(0, 26),
      message:  sanitizeText(m.message  || '').slice(0, 42),
    })
    if (chatBuffer.length > MAX_CHAT) chatBuffer.shift()
  }

  // Slot 1 = oldest visible, slot 4 = newest
  for (let i = 0; i < MAX_CHAT; i++) {
    const slot = chatBuffer[i]
    fs.writeFileSync(CHAT_USER_FILES[i], slot ? slot.username : ' ')
    fs.writeFileSync(CHAT_MSG_FILES[i],  slot ? slot.message  : ' ')
  }
}

// ─── FFmpeg stream ─────────────────────────────────────────────────────────────

function startFFmpeg(rtmpUrl) {
  const args = [
    '-re', '-f', 'lavfi', '-i', `color=c=0x0a0f1a:s=854x480:r=25`,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-vf', buildVideoFilter(),
    '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-b:v', '800k', '-g', '25',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-f', 'flv', rtmpUrl,
  ]

  console.log('[FFmpeg] Starting live stream to YouTube...')
  ffmpegProcess = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

  ffmpegProcess.stderr.on('data', (data) => {
    const msg = data.toString()
    if (msg.includes('fps=') && Math.random() < 0.02)
      console.log('[FFmpeg]', msg.trim().split('\n').pop())
    else if (msg.toLowerCase().includes('error'))
      console.error('[FFmpeg Error]', msg.trim())
  })
  ffmpegProcess.on('close', (code) => {
    console.log(`[FFmpeg] Process exited with code ${code}`)
    ffmpegProcess = null
  })

  return ffmpegProcess
}

// ─── Video filter ──────────────────────────────────────────────────────────────

function buildVideoFilter() {
  const f = []

  // TOP BAR  (854x480)
  f.push(`drawbox=x=0:y=0:w=854:h=44:color=0x0f172a:t=fill`)
  f.push(`drawbox=x=0:y=0:w=854:h=3:color=0x10b981:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:text='AI Cricket Commentary':fontsize=18:fontcolor=0x10b981:x=14:y=12`)
  f.push(`drawbox=x=196:y=14:w=8:h=8:color=0xff0000:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:text='LIVE':fontsize=15:fontcolor=0xff0000:x=208:y=13`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:text='SUBSCRIBE + LIKE':fontsize=14:fontcolor=0xfca5a5:x=580:y=13`)

  // SCORE BOX  y=47-97
  f.push(`drawbox=x=5:y=47:w=844:h=48:color=0x1e293b:t=fill`)
  f.push(`drawbox=x=5:y=47:w=3:h=48:color=0x10b981:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:textfile=${SCORE_FILE}:fontsize=20:fontcolor=white:x=14:y=56:reload=1`)

  // INNINGS CONTEXT  y=98-124
  f.push(`drawbox=x=5:y=98:w=844:h=26:color=0x064e3b:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:textfile=${CONTEXT_FILE}:fontsize=13:fontcolor=0x6ee7b7:x=10:y=106:reload=1`)

  // BATTING label  y=128
  f.push(`drawtext=fontfile=${FONT_BOLD}:text='BATTING':fontsize=10:fontcolor=0x6b7280:x=8:y=128`)

  // Striker  y=138-158
  f.push(`drawbox=x=5:y=138:w=844:h=22:color=0x10b981@0.07:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:textfile=${BATSMAN1_FILE}:fontsize=12:fontcolor=white:x=10:y=143:reload=1`)

  // Non-striker  y=162-182
  f.push(`drawbox=x=5:y=162:w=844:h=22:color=0x1e293b:t=fill`)
  f.push(`drawtext=fontfile=${FONT_REG}:textfile=${BATSMAN2_FILE}:fontsize=12:fontcolor=0xd1d5db:x=10:y=167:reload=1`)

  // BOWLING label  y=188
  f.push(`drawtext=fontfile=${FONT_BOLD}:text='BOWLING':fontsize=10:fontcolor=0x6b7280:x=8:y=188`)

  // Bowler  y=198-218
  f.push(`drawbox=x=5:y=198:w=844:h=22:color=0xef4444@0.07:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:textfile=${BOWLER_STATS_FILE}:fontsize=12:fontcolor=white:x=10:y=203:reload=1`)

  // AI COMMENTARY  y=224-260
  f.push(`drawbox=x=5:y=224:w=844:h=38:color=0x0f172a:t=fill`)
  f.push(`drawbox=x=5:y=224:w=844:h=2:color=0xfbbf24:t=fill`)
  f.push(`drawtext=fontfile=${FONT_REG}:textfile=${COMMENTARY_FILE}:fontsize=13:fontcolor=0xfbbf24:x=10:y=234:reload=1`)

  // EVENT BANNER (center)  y=270-340
  f.push(`drawbox=x=200:y=270:w=454:h=70:color=0x0f172a@0.90:t=fill`)
  f.push(`drawbox=x=200:y=270:w=454:h=3:color=0x10b981:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:textfile=${EVENT_FILE}:fontsize=44:fontcolor=0xfbbf24:x=220:y=280:reload=1`)

  // BOTTOM BAR  y=454-480
  f.push(`drawbox=x=0:y=454:w=854:h=26:color=0x0f172a:t=fill`)
  f.push(`drawbox=x=0:y=454:w=854:h=2:color=0x10b981:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:text='AI-powered ball-by-ball cricket commentary':fontsize=12:fontcolor=0x7dd3fc:x=14:y=462`)

  return f.join(',')
}

// ─── Audio helpers ─────────────────────────────────────────────────────────────

function startSilenceWriter() {
  const SAMPLE_RATE = 44100
  const CHANNELS    = 2
  const CHUNK_MS    = 100
  const SAMPLES     = Math.floor(SAMPLE_RATE * CHANNELS * (CHUNK_MS / 1000))
  const silence     = Buffer.alloc(SAMPLES * 2)
  const audioPipe   = fs.createWriteStream(AUDIO_FIFO)

  function loop() {
    if (!ffmpegProcess) return
    if (!isPlayingAudio) {
      if (!audioPipe.write(silence)) { audioPipe.once('drain', loop); return }
    }
    setTimeout(loop, CHUNK_MS)
  }
  loop()
  return audioPipe
}

async function playAudioFile(audioFilePath) {
  if (!audioFilePath || !fs.existsSync(audioFilePath)) return
  audioQueue.push(audioFilePath)
  if (!isPlayingAudio) processAudioQueue()
}

function processAudioQueue() {
  if (audioQueue.length === 0) { isPlayingAudio = false; return }
  isPlayingAudio = true
  const filePath = audioQueue.shift()
  const convert = spawn('ffmpeg', [
    '-i', filePath, '-f', 's16le', '-ar', '44100', '-ac', '2', AUDIO_FIFO,
  ], { stdio: ['pipe', 'pipe', 'pipe'] })
  convert.on('close',  () => setTimeout(processAudioQueue, 500))
  convert.on('error', (err) => { console.error('[Audio]', err.message); setTimeout(processAudioQueue, 500) })
}

function stopFFmpeg() {
  if (eventClearTimer) clearTimeout(eventClearTimer)
  if (ffmpegProcess) { ffmpegProcess.kill('SIGTERM'); ffmpegProcess = null }
  audioQueue = []
  isPlayingAudio = false
  chatBuffer.length = 0
  try { fs.unlinkSync(AUDIO_FIFO) } catch {}
  console.log('[FFmpeg] Stream stopped')
}

function isStreaming() { return ffmpegProcess !== null }

module.exports = {
  initFiles,
  updateScore, updateInningsContext, updateCommentary, updateEvent,
  updateCurrentPlayers, updatePlayerExtras, updateTournamentStats, updateChat,
  startFFmpeg, playAudioFile, stopFFmpeg, isStreaming,
}
