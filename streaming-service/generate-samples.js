/**
 * CricketTips.ai — Sample Event Video Generator
 *
 * Generates 5 short demo MP4 videos showing what each event looks like
 * on the live stream overlay:
 *   six.mp4, four.mp4, wicket.mp4, single.mp4, dot.mp4
 *
 * Usage: node generate-samples.js
 * Output: ./samples/ directory
 */

require('dotenv').config()
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const FONT_REG  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
const OUT_DIR   = path.join(__dirname, 'samples')

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

const EVENTS = [
  {
    name: 'six',
    duration: 6,
    eventText: 'SIX!',
    fieldText: 'OVER LONG ON',
    eventColor: '0xfbbf24',   // gold
    accentColor: '0xfbbf24',
    score: 'IND 187/3 (16.2 ov)  vs  AUS',
    commentary: 'Rohit Sharma launches it way over long on for a massive SIX!',
  },
  {
    name: 'four',
    duration: 6,
    eventText: 'FOUR!',
    fieldText: 'THROUGH COVERS',
    eventColor: '0x4ade80',   // green
    accentColor: '0x4ade80',
    score: 'IND 145/2 (12.4 ov)  vs  AUS',
    commentary: 'Virat Kohli drives it beautifully through the covers for FOUR!',
  },
  {
    name: 'wicket',
    duration: 7,
    eventText: 'WICKET!',
    fieldText: 'LBW - ROHIT SHARMA',
    eventColor: '0xef4444',   // red
    accentColor: '0xef4444',
    score: 'IND 98/3 (9.1 ov)  vs  AUS',
    commentary: 'Rohit Sharma is OUT! Trapped LBW by Cummins. Big wicket for Australia!',
  },
  {
    name: 'single',
    duration: 5,
    eventText: '1 RUN',
    fieldText: 'MID WICKET',
    eventColor: 'white',
    accentColor: '0x94a3b8',
    score: 'IND 203/4 (18.3 ov)  vs  AUS',
    commentary: 'Dhoni clips it to mid wicket and scampers through for a single.',
  },
  {
    name: 'dot',
    duration: 5,
    eventText: 'DOT BALL',
    fieldText: 'DEFENDED',
    eventColor: '0x6b7280',   // gray
    accentColor: '0x475569',
    score: 'IND 67/1 (6.0 ov)  vs  AUS',
    commentary: 'Good length delivery, Gill defends it back down the pitch. Dot ball.',
  },
]

function buildFilter(event) {
  return [
    // ── Background ──
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x0a0f1a:t=fill`,

    // ── Top bar ──
    `drawbox=x=0:y=0:w=iw:h=70:color=0x0f172a@0.95:t=fill`,
    `drawbox=x=0:y=0:w=iw:h=4:color=0x10b981:t=fill`,
    `drawtext=fontfile=${FONT_BOLD}:text='CricketTips.ai':fontsize=28:fontcolor=0x10b981:x=40:y=20`,
    `drawbox=x=1160:y=22:w=14:h=14:color=red:t=fill`,
    `drawtext=fontfile=${FONT_BOLD}:text='LIVE':fontsize=20:fontcolor=red:x=1180:y=20`,

    // ── Bottom bar ──
    `drawbox=x=0:y=696:w=iw:h=24:color=0x0f172a@0.92:t=fill`,
    `drawtext=fontfile=${FONT_REG}:text='AI-powered live commentary  •  crickettips.ai':fontsize=16:fontcolor=0x6b7280:x=40:y=700`,

    // ── Score box ──
    `drawbox=x=30:y=280:w=740:h=60:color=0x1e293b@0.85:t=fill`,
    `drawtext=fontfile=${FONT_BOLD}:text='${event.score}':fontsize=32:fontcolor=white:x=50:y=292`,

    // ── Commentary box ──
    `drawbox=x=30:y=350:w=740:h=50:color=0x0f172a@0.7:t=fill`,
    `drawtext=fontfile=${FONT_REG}:text='${event.commentary.replace(/'/g, '')}':fontsize=20:fontcolor=0xfbbf24:x=50:y=363`,

    // ── Mini pitch map ──
    `drawbox=x=850:y=80:w=400:h=590:color=0x14532d@0.9:t=fill`,
    `drawbox=x=900:y=130:w=300:h=490:color=0x166534@0.8:t=fill`,
    `drawbox=x=1000:y=160:w=100:h=430:color=0x4ade80@0.5:t=fill`,
    `drawbox=x=1000:y=175:w=100:h=4:color=white:t=fill`,
    `drawbox=x=1000:y=574:w=100:h=4:color=white:t=fill`,
    // Stumps top
    `drawbox=x=1036:y=162:w=4:h=14:color=0xd4a017:t=fill`,
    `drawbox=x=1048:y=162:w=4:h=14:color=0xd4a017:t=fill`,
    `drawbox=x=1060:y=162:w=4:h=14:color=0xd4a017:t=fill`,
    // Stumps bottom
    `drawbox=x=1036:y=576:w=4:h=14:color=0xd4a017:t=fill`,
    `drawbox=x=1048:y=576:w=4:h=14:color=0xd4a017:t=fill`,
    `drawbox=x=1060:y=576:w=4:h=14:color=0xd4a017:t=fill`,
    // Batsman
    `drawbox=x=1038:y=556:w=24:h=18:color=0x3b82f6:t=fill`,
    // Bowler
    `drawbox=x=1038:y=178:w=24:h=18:color=0xef4444:t=fill`,
    // Ball position (changes per event)
    ...getBallPosition(event.name),
    // Field text
    `drawtext=fontfile=${FONT_REG}:text='${event.fieldText}':fontsize=15:fontcolor=0xfbbf24:x=870:y=640`,
    `drawtext=fontfile=${FONT_BOLD}:text='PITCH MAP':fontsize=14:fontcolor=0x6b7280:x=910:y=86`,

    // ── Event banner ──
    `drawbox=x=100:y=130:w=680:h=130:color=0x0f172a@0.88:t=fill`,
    `drawbox=x=100:y=130:w=680:h=5:color=${event.accentColor}:t=fill`,
    `drawbox=x=100:y=255:w=680:h=5:color=${event.accentColor}:t=fill`,
    `drawtext=fontfile=${FONT_BOLD}:text='${event.eventText}':fontsize=72:fontcolor=${event.eventColor}:x=120:y=148`,
  ].join(',')
}

function getBallPosition(eventName) {
  // Show ball position on pitch map
  switch (eventName) {
    case 'six':
      // Ball above the pitch (went over boundary)
      return [
        `drawbox=x=1050:y=100:w=14:h=14:color=red:t=fill`,
        `drawtext=fontfile=${FONT_REG}:text='6':fontsize=14:fontcolor=red:x=1052:y=100`,
      ]
    case 'four':
      // Ball to the right (covers boundary)
      return [
        `drawbox=x=1180:y=380:w=14:h=14:color=0x4ade80:t=fill`,
        `drawtext=fontfile=${FONT_REG}:text='4':fontsize=14:fontcolor=0x4ade80:x=1182:y=380`,
      ]
    case 'wicket':
      // X on the stumps
      return [
        `drawtext=fontfile=${FONT_BOLD}:text='X':fontsize=24:fontcolor=0xef4444:x=1042:y=550`,
      ]
    case 'single':
      // Ball in mid wicket area
      return [
        `drawbox=x=930:y=380:w=12:h=12:color=white:t=fill`,
        `drawtext=fontfile=${FONT_REG}:text='1':fontsize=12:fontcolor=white:x=932:y=380`,
      ]
    case 'dot':
    default:
      // Ball back to bowler
      return [
        `drawbox=x=1048:y=240:w=12:h=12:color=0x6b7280:t=fill`,
      ]
  }
}

function renderSample(event) {
  return new Promise((resolve, reject) => {
    const outPath = path.join(OUT_DIR, `${event.name}.mp4`)
    const vf = buildFilter(event)

    const args = [
      '-f', 'lavfi',
      '-i', `color=c=0x0a0f1a:s=1280x720:r=25`,
      '-f', 'lavfi',
      '-i', `anoisesrc=d=${event.duration}:c=pink:r=44100,volume=${event.name === 'six' ? 5 : event.name === 'wicket' ? 4 : event.name === 'four' ? 3 : 1.5}`,
      '-vf', vf,
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2000k',
      '-c:a', 'aac', '-b:a', '128k',
      '-t', String(event.duration),
      '-y', outPath,
    ]

    console.log(`[Samples] Rendering ${event.name}.mp4...`)
    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    proc.stderr.on('data', d => {
      const msg = d.toString()
      if (msg.toLowerCase().includes('error')) console.error('[FFmpeg]', msg.trim())
    })

    proc.on('close', code => {
      if (code === 0) {
        console.log(`[Samples] ✓ ${event.name}.mp4 saved to ${outPath}`)
        resolve(outPath)
      } else {
        reject(new Error(`FFmpeg exited ${code} for ${event.name}`))
      }
    })
  })
}

async function main() {
  console.log('[Samples] Generating sample event videos...\n')

  for (const event of EVENTS) {
    try {
      await renderSample(event)
    } catch (err) {
      console.error(`[Samples] Failed for ${event.name}:`, err.message)
    }
  }

  console.log(`\n[Samples] All done! Videos saved to: ${OUT_DIR}`)
  console.log('[Samples] Files:')
  EVENTS.forEach(e => console.log(`  → ${e.name}.mp4`))
}

main()
