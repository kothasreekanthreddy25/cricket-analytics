/**
 * FFmpeg Stream Manager — 854×480 Full Overlay
 *
 * Layout:
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ TOP BAR: AI Cricket Commentary  ●LIVE                   SUBSCRIBE + LIKE     │ 0-44px
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ SCORE BOX                                                                    │ 47-97px
 * │ INNINGS CONTEXT (CRR / TARGET / RRR)                                         │ 98-124px
 * │ BATTING / BOWLING player stats                                               │ 128-218px
 * │ AI COMMENTARY                                                                │ 224-262px
 * │ PITCH REPORT banner (when set)                                               │ 266-292px
 * │ ANNOUNCEMENT banner (when set, flashing)                                     │ 296-326px
 * │ EVENT BANNER (SIX! / FOUR! / WICKET!)                                        │ 340-410px
 * │                         (blank space)                                        │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ BOTTOM BAR                                                                   │ 454-480px
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Audio:
 *   Named FIFO → single persistent write end (r+ flag, avoids blocking).
 *   Only ONE writer at a time: silence loop OR TTS audio (never both).
 *   Audio conversion uses -re flag to write at real-time speed (prevents deadlock).
 */

const { spawn, execSync } = require('child_process')
const fs   = require('fs')

// ─── Text overlay file paths ───────────────────────────────────────────────────
const SCORE_FILE          = '/tmp/crickettips-score.txt'
const COMMENTARY_FILE     = '/tmp/crickettips-commentary.txt'
const EVENT_FILE          = '/tmp/crickettips-event.txt'
const FIELD_FILE          = '/tmp/crickettips-field.txt'
const AUDIO_FIFO          = '/tmp/crickettips-audio.pipe'
const CONTEXT_FILE        = '/tmp/crickettips-context.txt'
const BATSMAN1_FILE       = '/tmp/crickettips-batsman1.txt'
const BATSMAN1_TOURN_FILE = '/tmp/crickettips-bat1tourn.txt'
const BATSMAN1_CAREER_FILE= '/tmp/crickettips-bat1career.txt'
const BATSMAN2_FILE       = '/tmp/crickettips-batsman2.txt'
const BATSMAN2_TOURN_FILE = '/tmp/crickettips-bat2tourn.txt'
const BATSMAN2_CAREER_FILE= '/tmp/crickettips-bat2career.txt'
const BOWLER_STATS_FILE   = '/tmp/crickettips-bowler-stats.txt'
const TOURN_RUNS_FILE     = '/tmp/crickettips-tourn-runs.txt'
const TOURN_WKTS_FILE     = '/tmp/crickettips-tourn-wkts.txt'
const PITCH_REPORT_FILE   = '/tmp/crickettips-pitch.txt'      // pitch conditions overlay
const ANNOUNCE_FILE       = '/tmp/crickettips-announce.txt'   // custom announcement overlay

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
let announceTimer   = null   // auto-clear announcement after 30s

// Chat ring buffer — oldest first, newest last
const chatBuffer = []
const MAX_CHAT   = 4

// ─── Helpers ───────────────────────────────────────────────────────────────────

const cap = (v, len = 72) => String(v || ' ').slice(0, len) || ' '

function sanitizeText(str) {
  return String(str || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[%\\]/g, ' ')
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
  fs.writeFileSync(PITCH_REPORT_FILE,   ' ')
  fs.writeFileSync(ANNOUNCE_FILE,       ' ')
  for (const f of [...CHAT_USER_FILES, ...CHAT_MSG_FILES]) fs.writeFileSync(f, ' ')
}

// ─── Update functions ──────────────────────────────────────────────────────────

function updateScore(scoreText) {
  fs.writeFileSync(SCORE_FILE, cap(scoreText, 62))
}

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
 * Show a pitch report banner on the stream.
 * Stays on screen until cleared or replaced.
 * @param {string} text  e.g. "PITCH: Dry surface, good for spinners. Expected to assist turn."
 */
function updatePitchReport(text) {
  fs.writeFileSync(PITCH_REPORT_FILE, cap(sanitizeText(text), 90))
}

function clearPitchReport() {
  fs.writeFileSync(PITCH_REPORT_FILE, ' ')
}

/**
 * Show a custom announcement banner on the stream for 30 seconds (auto-clears).
 * Also queued for TTS so it gets spoken on stream.
 * @param {string} text  e.g. "NZ need 45 runs from 30 balls!"
 */
function updateAnnouncement(text) {
  fs.writeFileSync(ANNOUNCE_FILE, cap(sanitizeText(text), 80))
  if (announceTimer) clearTimeout(announceTimer)
  announceTimer = setTimeout(() => {
    fs.writeFileSync(ANNOUNCE_FILE, ' ')
    announceTimer = null
  }, 30000)
}

function clearAnnouncement() {
  if (announceTimer) { clearTimeout(announceTimer); announceTimer = null }
  fs.writeFileSync(ANNOUNCE_FILE, ' ')
}

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

function updateChat(messages) {
  if (!messages?.length) return

  for (const m of messages) {
    chatBuffer.push({
      username: sanitizeText(m.username || 'Viewer').slice(0, 26),
      message:  sanitizeText(m.message  || '').slice(0, 42),
    })
    if (chatBuffer.length > MAX_CHAT) chatBuffer.shift()
  }

  for (let i = 0; i < MAX_CHAT; i++) {
    const slot = chatBuffer[i]
    fs.writeFileSync(CHAT_USER_FILES[i], slot ? slot.username : ' ')
    fs.writeFileSync(CHAT_MSG_FILES[i],  slot ? slot.message  : ' ')
  }
}

// ─── Audio FIFO ─────────────────────────────────────────────────────────────────
//
// Architecture:
//   fifoWriteStream — persistent write handle (r+ = O_RDWR, non-blocking on FIFO)
//   silenceProc     — FFmpeg generating silence, stdout piped to fifoWriteStream
//   audioConvProc   — FFmpeg converting TTS file, stdout piped to fifoWriteStream
//
//   Rule: only ONE of silenceProc / audioConvProc runs at a time.
//   When audio is queued: kill silenceProc → start audioConvProc → when done → restart silence.
//   The -re flag on audioConvProc ensures it outputs at real-time speed → prevents FIFO overflow.

let fifoWriteStream = null
let silenceProc     = null
let audioConvProc   = null
let _isWritingAudio = false

function _pipeTo(proc) {
  proc.stdout.on('data', (chunk) => {
    if (fifoWriteStream && !fifoWriteStream.destroyed) {
      if (!fifoWriteStream.write(chunk)) {
        proc.stdout.pause()
        fifoWriteStream.once('drain', () => proc.stdout.resume())
      }
    }
  })
}

function _writeSilence() {
  if (!ffmpegProcess || _isWritingAudio) return
  if (silenceProc) return   // already running

  silenceProc = spawn('ffmpeg', [
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-t', '2',     // 2-second silence chunk
    '-f', 's16le', '-ar', '44100', '-ac', '2',
    'pipe:1',
  ], { stdio: ['ignore', 'pipe', 'pipe'] })

  _pipeTo(silenceProc)

  silenceProc.on('close', () => {
    silenceProc = null
    if (!_isWritingAudio && ffmpegProcess) {
      if (audioQueue.length > 0) _processNextAudio()
      else _writeSilence()
    }
  })
  silenceProc.on('error', (err) => {
    console.warn('[Silence]', err.message)
    silenceProc = null
    if (!_isWritingAudio && ffmpegProcess) setTimeout(_writeSilence, 500)
  })
}

function _processNextAudio() {
  if (!ffmpegProcess) { isPlayingAudio = false; _isWritingAudio = false; return }

  if (audioQueue.length === 0) {
    _isWritingAudio = false
    isPlayingAudio  = false
    _writeSilence()
    return
  }

  // Kill silence proc to ensure single writer
  if (silenceProc) { silenceProc.kill('SIGKILL'); silenceProc = null }

  const filePath = audioQueue.shift()
  if (!filePath || !fs.existsSync(filePath)) {
    // Skip missing files
    _processNextAudio()
    return
  }

  _isWritingAudio = true
  isPlayingAudio  = true

  audioConvProc = spawn('ffmpeg', [
    '-re',          // CRITICAL: real-time output prevents FIFO overflow / deadlock
    '-i', filePath,
    '-f', 's16le', '-ar', '44100', '-ac', '2',
    'pipe:1',
  ], { stdio: ['ignore', 'pipe', 'pipe'] })

  _pipeTo(audioConvProc)

  audioConvProc.on('close', () => {
    audioConvProc   = null
    _isWritingAudio = false
    isPlayingAudio  = false
    // Brief pause so FIFO reader doesn't stall between clips (≤50ms is fine —
    // kernel FIFO buffer holds ~370ms of audio at 44100 Hz stereo 16-bit)
    setTimeout(_processNextAudio, 50)
  })
  audioConvProc.on('error', (err) => {
    console.error('[AudioConv]', err.message)
    audioConvProc   = null
    _isWritingAudio = false
    isPlayingAudio  = false
    setTimeout(_processNextAudio, 500)
  })
}

function _openAudioFIFO() {
  try { execSync(`rm -f "${AUDIO_FIFO}" && mkfifo "${AUDIO_FIFO}"`) } catch (e) {
    console.warn('[FIFO] setup:', e.message)
  }
  // r+ (O_RDWR) opens without blocking — no reader required at this point.
  fifoWriteStream = fs.createWriteStream(AUDIO_FIFO, { flags: 'r+' })
  fifoWriteStream.on('error', (err) => console.warn('[FIFO write]', err.message))
}

// ─── FFmpeg stream ─────────────────────────────────────────────────────────────

function startFFmpeg(rtmpUrl) {
  // Set up audio FIFO before starting FFmpeg so the write end is open
  _openAudioFIFO()

  const args = [
    // Video: solid dark background at 854×480 25fps, real-time
    '-re', '-f', 'lavfi', '-i', `color=c=0x0a0f1a:s=854x480:r=25`,
    // Audio: raw PCM from FIFO — one persistent writer (silence or TTS)
    '-f', 's16le', '-ar', '44100', '-ac', '2', '-i', AUDIO_FIFO,
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

  // Start audio silence loop — FFmpeg will unblock reading from FIFO once it opens it
  setTimeout(_writeSilence, 200)

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

  // AI COMMENTARY  y=224-262
  f.push(`drawbox=x=5:y=224:w=844:h=38:color=0x0f172a:t=fill`)
  f.push(`drawbox=x=5:y=224:w=844:h=2:color=0xfbbf24:t=fill`)
  f.push(`drawtext=fontfile=${FONT_REG}:textfile=${COMMENTARY_FILE}:fontsize=13:fontcolor=0xfbbf24:x=10:y=234:reload=1`)

  // PITCH REPORT banner  y=266-290  (hidden when text is blank)
  f.push(`drawbox=x=5:y=266:w=844:h=24:color=0x1e3a5f:t=fill`)
  f.push(`drawbox=x=5:y=266:w=3:h=24:color=0x3b82f6:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:textfile=${PITCH_REPORT_FILE}:fontsize=12:fontcolor=0x93c5fd:x=14:y=274:reload=1`)

  // ANNOUNCEMENT banner  y=296-324  (highlighted, auto-clears after 30s)
  f.push(`drawbox=x=5:y=296:w=844:h=28:color=0x422006:t=fill`)
  f.push(`drawbox=x=5:y=296:w=3:h=28:color=0xfbbf24:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:textfile=${ANNOUNCE_FILE}:fontsize=14:fontcolor=0xfde68a:x=14:y=306:reload=1`)

  // EVENT BANNER (center)  y=340-410
  f.push(`drawbox=x=200:y=340:w=454:h=70:color=0x0f172a@0.90:t=fill`)
  f.push(`drawbox=x=200:y=340:w=454:h=3:color=0x10b981:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:textfile=${EVENT_FILE}:fontsize=44:fontcolor=0xfbbf24:x=220:y=350:reload=1`)
  f.push(`drawtext=fontfile=${FONT_REG}:textfile=${FIELD_FILE}:fontsize=13:fontcolor=0x6ee7b7:x=220:y=398:reload=1`)

  // BOTTOM BAR  y=454-480
  f.push(`drawbox=x=0:y=454:w=854:h=26:color=0x0f172a:t=fill`)
  f.push(`drawbox=x=0:y=454:w=854:h=2:color=0x10b981:t=fill`)
  f.push(`drawtext=fontfile=${FONT_BOLD}:text='AI-powered ball-by-ball cricket commentary':fontsize=12:fontcolor=0x7dd3fc:x=14:y=462`)

  return f.join(',')
}

// ─── Audio helpers (public) ────────────────────────────────────────────────────

async function playAudioFile(audioFilePath) {
  if (!audioFilePath || !fs.existsSync(audioFilePath)) return
  audioQueue.push(audioFilePath)
  if (!isPlayingAudio && !_isWritingAudio) _processNextAudio()
}

function stopFFmpeg() {
  if (eventClearTimer) clearTimeout(eventClearTimer)
  if (announceTimer)   { clearTimeout(announceTimer); announceTimer = null }

  if (audioConvProc) { audioConvProc.kill('SIGKILL'); audioConvProc = null }
  if (silenceProc)   { silenceProc.kill('SIGKILL');   silenceProc   = null }
  if (fifoWriteStream && !fifoWriteStream.destroyed) {
    fifoWriteStream.destroy()
    fifoWriteStream = null
  }

  if (ffmpegProcess) { ffmpegProcess.kill('SIGTERM'); ffmpegProcess = null }

  audioQueue      = []
  isPlayingAudio  = false
  _isWritingAudio = false
  chatBuffer.length = 0

  try { fs.unlinkSync(AUDIO_FIFO) } catch {}
  console.log('[FFmpeg] Stream stopped')
}

function isStreaming() { return ffmpegProcess !== null }

module.exports = {
  initFiles,
  updateScore, updateInningsContext, updateCommentary, updateEvent,
  updateCurrentPlayers, updatePlayerExtras, updateTournamentStats, updateChat,
  updatePitchReport, clearPitchReport, updateAnnouncement, clearAnnouncement,
  startFFmpeg, playAudioFile, stopFFmpeg, isStreaming,
}
