/**
 * FFmpeg Stream Manager
 * Streams: colored background + score text overlay + TTS audio → YouTube RTMP
 */
const { spawn, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const SCORE_FILE = '/tmp/crickettips-score.txt'
const COMMENTARY_FILE = '/tmp/crickettips-commentary.txt'
const AUDIO_FIFO = '/tmp/crickettips-audio.pipe'
const FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const FONT_PATH_REG = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

let ffmpegProcess = null
let audioQueue = []
let isPlayingAudio = false

function initFiles(teamA, teamB) {
  fs.writeFileSync(SCORE_FILE, `${teamA} vs ${teamB} - LIVE`)
  fs.writeFileSync(COMMENTARY_FILE, 'CricketTips.ai - AI Powered Cricket Commentary')

  // Create audio FIFO
  try { fs.unlinkSync(AUDIO_FIFO) } catch {}
  execSync(`mkfifo ${AUDIO_FIFO}`)
}

function updateScore(scoreText) {
  fs.writeFileSync(SCORE_FILE, scoreText)
}

function updateCommentary(text) {
  // Truncate to fit on screen
  const short = text.length > 80 ? text.substring(0, 77) + '...' : text
  fs.writeFileSync(COMMENTARY_FILE, short)
}

function startFFmpeg(rtmpUrl) {
  const vf = [
    // Dark background
    `color=c=0x0f172a:s=1280x720:r=25`,
  ].join(',')

  // Complex video filter with text overlays
  const videoFilter = [
    // CricketTips logo area
    `drawtext=fontfile=${FONT_PATH}:text='🏏 CricketTips.ai':fontsize=28:fontcolor=0x10b981:x=40:y=30`,
    // LIVE badge
    `drawtext=fontfile=${FONT_PATH}:text='● LIVE':fontsize=22:fontcolor=red:x=1160:y=35:blink=1`,
    // Score (main - large)
    `drawtext=fontfile=${FONT_PATH}:textfile=${SCORE_FILE}:fontsize=42:fontcolor=white:x=40:y=300:reload=1`,
    // Commentary text (smaller, yellow)
    `drawtext=fontfile=${FONT_PATH_REG}:textfile=${COMMENTARY_FILE}:fontsize=26:fontcolor=0xfbbf24:x=40:y=380:reload=1`,
    // Footer
    `drawtext=fontfile=${FONT_PATH_REG}:text='AI-powered live commentary • crickettips.ai':fontsize=18:fontcolor=0x6b7280:x=40:y=680`,
  ].join(',')

  const args = [
    // Video source: colored background
    '-f', 'lavfi', '-i', `color=c=0x0f172a:s=1280x720:r=25`,
    // Audio source: FIFO pipe (raw PCM)
    '-f', 's16le', '-ar', '44100', '-ac', '2', '-i', AUDIO_FIFO,
    // Video filter with text overlays
    '-vf', videoFilter,
    // Video encoding
    '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2500k', '-g', '50',
    // Audio encoding
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    // Output format
    '-f', 'flv', rtmpUrl,
  ]

  console.log('[FFmpeg] Starting stream to YouTube RTMP...')
  ffmpegProcess = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

  ffmpegProcess.stderr.on('data', (data) => {
    const msg = data.toString()
    if (msg.includes('fps=') && !msg.includes('error')) {
      // Normal streaming output - log every 30s worth
      if (Math.random() < 0.02) console.log('[FFmpeg]', msg.trim().split('\n').pop())
    } else if (msg.toLowerCase().includes('error')) {
      console.error('[FFmpeg Error]', msg.trim())
    }
  })

  ffmpegProcess.on('close', (code) => {
    console.log(`[FFmpeg] Process exited with code ${code}`)
    ffmpegProcess = null
  })

  // Start silence writer to keep stream alive
  startSilenceWriter()

  return ffmpegProcess
}

// Write silence to FIFO to keep FFmpeg's audio pipe alive
function startSilenceWriter() {
  const SAMPLE_RATE = 44100
  const CHANNELS = 2
  const CHUNK_MS = 100 // 100ms chunks
  const SAMPLES_PER_CHUNK = Math.floor(SAMPLE_RATE * CHANNELS * (CHUNK_MS / 1000))
  const silence = Buffer.alloc(SAMPLES_PER_CHUNK * 2) // 16-bit = 2 bytes

  const audioPipe = fs.createWriteStream(AUDIO_FIFO)

  function writeSilenceLoop() {
    if (!ffmpegProcess) return

    if (!isPlayingAudio) {
      if (!audioPipe.write(silence)) {
        audioPipe.once('drain', writeSilenceLoop)
        return
      }
    }
    setTimeout(writeSilenceLoop, CHUNK_MS)
  }

  writeSilenceLoop()

  return audioPipe
}

async function playAudioFile(audioFilePath) {
  if (!audioFilePath || !fs.existsSync(audioFilePath)) return

  audioQueue.push(audioFilePath)

  if (!isPlayingAudio) {
    processAudioQueue()
  }
}

function processAudioQueue() {
  if (audioQueue.length === 0) {
    isPlayingAudio = false
    return
  }

  isPlayingAudio = true
  const filePath = audioQueue.shift()

  // Convert MP3 to raw PCM and write to FIFO using ffmpeg
  const convert = spawn('ffmpeg', [
    '-i', filePath,
    '-f', 's16le', '-ar', '44100', '-ac', '2',
    AUDIO_FIFO,
  ], { stdio: ['pipe', 'pipe', 'pipe'] })

  convert.on('close', () => {
    // Add small gap between balls
    setTimeout(processAudioQueue, 500)
  })

  convert.on('error', (err) => {
    console.error('[Audio] Conversion failed:', err.message)
    setTimeout(processAudioQueue, 500)
  })
}

function stopFFmpeg() {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGTERM')
    ffmpegProcess = null
  }
  audioQueue = []
  isPlayingAudio = false
  try { fs.unlinkSync(AUDIO_FIFO) } catch {}
  console.log('[FFmpeg] Stream stopped')
}

function isStreaming() {
  return ffmpegProcess !== null
}

module.exports = { initFiles, updateScore, updateCommentary, startFFmpeg, playAudioFile, stopFFmpeg, isStreaming }
