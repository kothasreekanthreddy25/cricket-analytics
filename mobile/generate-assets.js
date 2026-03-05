/**
 * generate-assets.js
 * Run: node generate-assets.js
 * Generates icon.png (1024x1024), splash.png (1284x2778), adaptive-icon.png (1024x1024)
 * Uses only Node.js built-ins (zlib + fs) — no npm packages required.
 */
const zlib = require('zlib')
const fs   = require('fs')
const path = require('path')

// ─── Minimal PNG encoder ────────────────────────────────────────────────────

const _crc = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  _crc[i] = c
}
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = _crc[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
function makePNG(w, h, pixels /* Uint8Array RGB */) {
  const rows = Buffer.alloc(h * (1 + w * 3))
  for (let y = 0; y < h; y++) {
    rows[y * (1 + w * 3)] = 0
    rows.set(pixels.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rows, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

function px(buf, w, x, y, r, g, b, a = 1) {
  if (x < 0 || y < 0 || x >= w || y * w + x >= buf.length / 3) return
  const i = (y * w + x) * 3
  buf[i]   = Math.round(buf[i]   * (1 - a) + r * a)
  buf[i+1] = Math.round(buf[i+1] * (1 - a) + g * a)
  buf[i+2] = Math.round(buf[i+2] * (1 - a) + b * a)
}
function getPx(buf, w, x, y) {
  const i = (y * w + x) * 3; return [buf[i], buf[i+1], buf[i+2]]
}

/** Radial gradient fill */
function fillRadial(buf, w, h, cx, cy, inner, outer) {
  const maxD = Math.sqrt(Math.max(cx, w-cx) ** 2 + Math.max(cy, h-cy) ** 2)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = Math.min(1, Math.sqrt((x-cx)**2 + (y-cy)**2) / maxD)
    px(buf, w, x, y,
      inner[0]*(1-t)+outer[0]*t,
      inner[1]*(1-t)+outer[1]*t,
      inner[2]*(1-t)+outer[2]*t)
  }
}

/** Filled circle with soft edge */
function fillCircle(buf, w, h, cx, cy, r, color) {
  const [cr, cg, cb] = color
  const x0 = Math.max(0, Math.floor(cx - r - 1))
  const x1 = Math.min(w-1, Math.ceil(cx + r + 1))
  const y0 = Math.max(0, Math.floor(cy - r - 1))
  const y1 = Math.min(h-1, Math.ceil(cy + r + 1))
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.sqrt((x - cx)**2 + (y - cy)**2)
    if (d <= r + 1) {
      const a = d <= r ? 1 : r + 1 - d
      px(buf, w, x, y, cr, cg, cb, a)
    }
  }
}

/** Circle ring (outline) */
function strokeCircle(buf, w, h, cx, cy, r, lw, color) {
  const [cr, cg, cb] = color
  const x0 = Math.max(0, Math.floor(cx - r - lw - 1))
  const x1 = Math.min(w-1, Math.ceil(cx + r + lw + 1))
  const y0 = Math.max(0, Math.floor(cy - r - lw - 1))
  const y1 = Math.min(h-1, Math.ceil(cy + r + lw + 1))
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.abs(Math.sqrt((x - cx)**2 + (y - cy)**2) - r)
    if (d <= lw + 1) {
      const a = d <= lw ? 1 : lw + 1 - d
      px(buf, w, x, y, cr, cg, cb, a)
    }
  }
}

/** Bresenham line with thickness */
function drawLine(buf, w, h, x0, y0, x1, y1, lw, color) {
  const [cr, cg, cb] = color
  const dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx*dx + dy*dy)
  const steps = Math.ceil(len * 2) || 1
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const cx = x0 + dx * t, cy = y0 + dy * t
    const bx0 = Math.max(0, Math.floor(cx - lw - 1))
    const bx1 = Math.min(w-1, Math.ceil(cx + lw + 1))
    const by0 = Math.max(0, Math.floor(cy - lw - 1))
    const by1 = Math.min(h-1, Math.ceil(cy + lw + 1))
    for (let py = by0; py <= by1; py++) for (let px2 = bx0; px2 <= bx1; px2++) {
      const d = Math.sqrt((px2-cx)**2 + (py-cy)**2)
      if (d <= lw + 1) px(buf, w, px2, py, cr, cg, cb, d <= lw ? 1 : lw+1-d)
    }
  }
}

/** Cubic bezier rendered as line segments */
function drawBezier(buf, w, h, p0, p1, p2, p3, lw, color) {
  const steps = Math.ceil(
    Math.sqrt((p3[0]-p0[0])**2 + (p3[1]-p0[1])**2) * 3
  )
  let px0 = p0[0], py0 = p0[1]
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, mt = 1 - t
    const x = mt**3*p0[0] + 3*mt**2*t*p1[0] + 3*mt*t**2*p2[0] + t**3*p3[0]
    const y = mt**3*p0[1] + 3*mt**2*t*p1[1] + 3*mt*t**2*p2[1] + t**3*p3[1]
    drawLine(buf, w, h, px0, py0, x, y, lw, color)
    px0 = x; py0 = y
  }
}

/** Draw cricket seam — two S-curves at right angles */
function drawSeam(buf, w, h, cx, cy, r, seamColor, lw) {
  // Vertical seam curve
  drawBezier(buf, w, h,
    [cx, cy - r],
    [cx + r * 0.7, cy - r * 0.3],
    [cx - r * 0.7, cy + r * 0.3],
    [cx, cy + r],
    lw, seamColor
  )
  // Stitch dots along vertical seam
  const dotCount = 10
  for (let i = 0; i <= dotCount; i++) {
    const t = i / dotCount, mt = 1 - t
    const bx = mt**3*cx + 3*mt**2*t*(cx + r*0.7) + 3*mt*t**2*(cx - r*0.7) + t**3*cx
    const by = mt**3*(cy - r) + 3*mt**2*t*(cy - r*0.3) + 3*mt*t**2*(cy + r*0.3) + t**3*(cy + r)
    // Normal to curve (approx perpendicular offset)
    const off = lw * 3.5
    fillCircle(buf, w, h, bx - off, by, lw * 0.9, seamColor)
    fillCircle(buf, w, h, bx + off, by, lw * 0.9, seamColor)
  }
  // Horizontal seam curve (90° rotated)
  drawBezier(buf, w, h,
    [cx - r, cy],
    [cx - r * 0.3, cy - r * 0.7],
    [cx + r * 0.3, cy + r * 0.7],
    [cx + r, cy],
    lw, seamColor
  )
  const dotCount2 = 10
  for (let i = 0; i <= dotCount2; i++) {
    const t = i / dotCount2, mt = 1 - t
    const bx = mt**3*(cx-r) + 3*mt**2*t*(cx-r*0.3) + 3*mt*t**2*(cx+r*0.3) + t**3*(cx+r)
    const by = mt**3*cy + 3*mt**2*t*(cy-r*0.7) + 3*mt*t**2*(cy+r*0.7) + t**3*cy
    const off = lw * 3.5
    fillCircle(buf, w, h, bx, by - off, lw * 0.9, seamColor)
    fillCircle(buf, w, h, bx, by + off, lw * 0.9, seamColor)
  }
}

/** Draw horizontal decorative lines (splash screen) */
function drawHLines(buf, w, h, startY, count, spacing, color, alpha) {
  const [cr, cg, cb] = color
  for (let i = 0; i < count; i++) {
    const y = Math.round(startY + i * spacing)
    if (y >= h) break
    // Fade line from center outward
    for (let x = 0; x < w; x++) {
      const distFromCenter = Math.abs(x - w/2) / (w/2)
      const a = alpha * (1 - distFromCenter ** 1.5)
      if (a > 0.01) px(buf, w, x, y, cr, cg, cb, a)
    }
  }
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  bgDark:    [15, 23, 42],      // #0f172a
  bgMid:     [30, 41, 59],      // #1e293b
  bgLight:   [51, 65, 85],      // #334155
  emerald:   [16, 185, 129],    // #10b981
  emeraldD:  [5,  150, 105],    // #0596697
  emeraldL:  [52, 211, 153],    // #34d399
  white:     [255, 255, 255],
  seamWhite: [220, 238, 233],   // slightly warm white for seam
}

// ─── Image generators ────────────────────────────────────────────────────────

function makeIcon(w, h, ballRadius) {
  const buf = new Uint8Array(w * h * 3)
  const cx = w / 2, cy = h / 2

  // Background: dark radial gradient
  fillRadial(buf, w, h, cx, cy, C.bgMid, C.bgDark)

  // Outer glow ring
  strokeCircle(buf, w, h, cx, cy, ballRadius + 18, 16, [16, 185, 129, 0.15])
  strokeCircle(buf, w, h, cx, cy, ballRadius + 10, 8,  [16, 185, 129, 0.3])

  // Cricket ball — emerald filled circle
  fillCircle(buf, w, h, cx, cy, ballRadius, C.emeraldD)

  // Radial highlight on ball (lighter top-left)
  const hlR = Math.round(ballRadius * 0.55)
  const hlCx = cx - ballRadius * 0.22
  const hlCy = cy - ballRadius * 0.22
  for (let y = Math.floor(hlCy - hlR); y <= Math.ceil(hlCy + hlR); y++) {
    for (let x = Math.floor(hlCx - hlR); x <= Math.ceil(hlCx + hlR); x++) {
      const d = Math.sqrt((x-hlCx)**2 + (y-hlCy)**2)
      if (d <= hlR) {
        const t = 1 - d / hlR
        px(buf, w, x, y, C.emeraldL[0], C.emeraldL[1], C.emeraldL[2], t * 0.45)
      }
    }
  }

  // Seam lines
  const seamLW = Math.max(2, Math.round(ballRadius * 0.022))
  drawSeam(buf, w, h, cx, cy, ballRadius, C.seamWhite, seamLW)

  // Outer border ring
  strokeCircle(buf, w, h, cx, cy, ballRadius, 3, C.emeraldL)

  return buf
}

function makeSplash(w, h) {
  const buf = new Uint8Array(w * h * 3)
  const cx = w / 2

  // Background: solid dark with slight radial
  fillRadial(buf, w, h, cx, h * 0.38, C.bgMid, C.bgDark)

  // Decorative grid lines (very faint)
  drawHLines(buf, w, h, 0, h, 60, C.bgLight, 0.12)

  // Ball positioned in upper-center area
  const ballR = Math.round(w * 0.24)
  const ballCy = Math.round(h * 0.34)

  // Glow rings
  strokeCircle(buf, w, h, cx, ballCy, ballR + 30, 20, [16, 185, 129])
  strokeCircle(buf, w, h, cx, ballCy, ballR + 14, 10, [16, 185, 129])

  // Ball
  fillCircle(buf, w, h, cx, ballCy, ballR, C.emeraldD)

  // Highlight
  const hlR = Math.round(ballR * 0.55)
  const hlCx = cx - ballR * 0.22, hlCy = ballCy - ballR * 0.22
  for (let y = Math.floor(hlCy - hlR); y <= Math.ceil(hlCy + hlR); y++) {
    for (let x = Math.floor(hlCx - hlR); x <= Math.ceil(hlCx + hlR); x++) {
      const d = Math.sqrt((x-hlCx)**2 + (y-hlCy)**2)
      if (d <= hlR) {
        const t = 1 - d / hlR
        px(buf, w, x, y, C.emeraldL[0], C.emeraldL[1], C.emeraldL[2], t * 0.45)
      }
    }
  }

  // Seam
  const seamLW = Math.max(2, Math.round(ballR * 0.022))
  drawSeam(buf, w, h, cx, ballCy, ballR, C.seamWhite, seamLW)
  strokeCircle(buf, w, h, cx, ballCy, ballR, 3, C.emeraldL)

  // "CricketTips.ai" label — drawn as two decorative bars (text needs font)
  const barY = ballCy + ballR + 70
  const barW = Math.round(w * 0.52), barH = 6, barR = 3
  fillCircle(buf, w, h, cx - barW*0.18, barY, barH, C.emerald)
  fillCircle(buf, w, h, cx + barW*0.18, barY, barH, C.emerald)
  drawLine(buf, w, h, cx - barW*0.5, barY, cx - barW*0.05, barY, barH, C.emerald)
  drawLine(buf, w, h, cx + barW*0.05, barY, cx + barW*0.5, barY, barH, C.emerald)

  // Sub-label bar
  const sub = barY + 30
  drawLine(buf, w, h, cx - barW*0.25, sub, cx + barW*0.25, sub, 3, [16, 185, 129])

  // Bottom decorative dots
  const dotY = h * 0.88
  for (let i = -2; i <= 2; i++) {
    const alpha = i === 0 ? 1 : 0.4
    fillCircle(buf, w, h, cx + i * 22, dotY, i === 0 ? 7 : 5, [16*alpha+15*(1-alpha), 185*alpha+23*(1-alpha), 129*alpha+42*(1-alpha)])
  }

  return buf
}

// ─── Generate and save ────────────────────────────────────────────────────────

const outDir = path.join(__dirname, 'assets')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

console.log('Generating assets...')

// icon.png — 1024×1024, ball radius 380
const iconBuf = makeIcon(1024, 1024, 380)
fs.writeFileSync(path.join(outDir, 'icon.png'), makePNG(1024, 1024, iconBuf))
console.log('✅  assets/icon.png (1024×1024)')

// adaptive-icon.png — 1024×1024, smaller ball (Android safe zone = 66%)
const adaptiveBuf = makeIcon(1024, 1024, 310)
fs.writeFileSync(path.join(outDir, 'adaptive-icon.png'), makePNG(1024, 1024, adaptiveBuf))
console.log('✅  assets/adaptive-icon.png (1024×1024)')

// splash.png — 1284×2778
const splashBuf = makeSplash(1284, 2778)
fs.writeFileSync(path.join(outDir, 'splash.png'), makePNG(1284, 2778, splashBuf))
console.log('✅  assets/splash.png (1284×2778)')

console.log('\nDone! All assets written to mobile/assets/')
