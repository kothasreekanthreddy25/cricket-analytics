/**
 * CricketTips.ai — Crowd Sound Effects
 *
 * Generates and plays crowd noise for live stream events:
 *   six      → loud sustained roar (3.5s)
 *   boundary → strong cheer (2.5s)
 *   wicket   → sharp burst + roar (3s)
 *   double   → medium applause (1.2s)
 *   single   → light clap (0.8s)
 *   dot      → silence
 *
 * Sounds are generated once on startup using FFmpeg synthesis,
 * then cached in ./sounds/ directory.
 * Replace any .mp3 file with a real crowd recording for better quality.
 */

const { spawnSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const SOUNDS_DIR = path.join(__dirname, 'sounds')

const SOUND_CONFIGS = {
  six:      { volume: 6, duration: 3.5, color: 'pink' },
  boundary: { volume: 4, duration: 2.5, color: 'pink' },
  wicket:   { volume: 5, duration: 3.0, color: 'white' },
  double:   { volume: 2.5, duration: 1.2, color: 'pink' },
  single:   { volume: 1.5, duration: 0.8, color: 'pink' },
}

function ensureSoundsExist() {
  if (!fs.existsSync(SOUNDS_DIR)) fs.mkdirSync(SOUNDS_DIR, { recursive: true })

  for (const [event, cfg] of Object.entries(SOUND_CONFIGS)) {
    const outPath = path.join(SOUNDS_DIR, `${event}.mp3`)
    if (fs.existsSync(outPath)) continue

    console.log(`[CrowdSounds] Generating ${event}.mp3...`)
    spawnSync('ffmpeg', [
      '-f', 'lavfi',
      '-i', `anoisesrc=d=${cfg.duration}:c=${cfg.color}:r=44100`,
      '-af', `volume=${cfg.volume},afade=in:st=0:d=0.2,afade=out:st=${cfg.duration - 0.3}:d=0.3`,
      '-y', outPath,
    ], { stdio: 'ignore' })

    console.log(`[CrowdSounds] ✓ ${event}.mp3 ready`)
  }
}

function playCrowdSound(eventType) {
  if (eventType === 'dot') return

  const soundPath = path.join(SOUNDS_DIR, `${eventType}.mp3`)
  if (!fs.existsSync(soundPath)) return

  // Play non-blocking via ffplay (system audio, separate from stream)
  const proc = spawn('ffplay', [
    '-nodisp',
    '-autoexit',
    '-volume', '80',
    soundPath,
  ], { detached: true, stdio: 'ignore' })
  proc.unref()

  console.log(`[CrowdSounds] Playing: ${eventType}`)
}

// Generate on module load
ensureSoundsExist()

module.exports = { playCrowdSound }
