/**
 * Generates feature report as Excel (.xlsx) and PDF-ready HTML
 * Run: node scripts/generate-reports.mjs
 */

import xlsx from 'xlsx'
import fs from 'fs'
import path from 'path'

const OUTPUT_DIR = path.resolve('docs/reports')

// ─── DATA ─────────────────────────────────────────────────────────────────────

const implemented = [
  { feature: 'Match Predictions with Confidence %', category: 'Predictions', priority: 'High', where: '/analysis, /predictions pages + TensorFlow.js engine', status: 'Implemented' },
  { feature: 'AI-Powered Match Tips', category: 'Predictions', priority: 'High', where: '/api/analysis — tips, reasoning, confidence badge', status: 'Implemented' },
  { feature: 'Live Odds Tracker', category: 'Odds', priority: 'High', where: '/odds page — decimal, fractional odds, implied probability', status: 'Implemented' },
  { feature: 'Head-to-Head Stats', category: 'Analytics', priority: 'High', where: '/api/analysis/insights + AI analysis page', status: 'Implemented' },
  { feature: 'Players to Watch', category: 'Analytics', priority: 'High', where: 'AI Analysis page — role, runs, wickets, SR, economy', status: 'Implemented' },
  { feature: 'Pitch & Weather Conditions', category: 'Analytics', priority: 'High', where: 'AI Analysis page — pitch type, weather impact, toss advice', status: 'Implemented' },
  { feature: 'Live Win Probability', category: 'Live', priority: 'High', where: '/live/[matchKey] — real-time win probability', status: 'Implemented' },
  { feature: 'Ball-by-Ball Commentary', category: 'Live', priority: 'High', where: '/live/[matchKey] — over.ball badges, wicket/4/6 highlights', status: 'Implemented' },
  { feature: 'Match Charts (Worm, Manhattan, Run Rate)', category: 'Analytics', priority: 'Medium', where: '/live/[matchKey] — Recharts visualizations', status: 'Implemented' },
  { feature: 'Investment Simulation (₹10,000)', category: 'Betting', priority: 'High', where: '/predictions — ROI, net profit/loss tracking', status: 'Implemented' },
  { feature: 'Tipster System', category: 'Community', priority: 'High', where: 'Tipster dashboard — create tips, confidence, odds', status: 'Implemented' },
  { feature: 'User Dashboard', category: 'User', priority: 'High', where: '/dashboard/user — tips by match, favorites', status: 'Implemented' },
  { feature: 'Admin Dashboard', category: 'Admin', priority: 'High', where: '/dashboard/admin — manage users, roles, tips', status: 'Implemented' },
  { feature: 'Role-Based Access (Admin/Tipster/User)', category: 'Auth', priority: 'High', where: 'BetterAuth + Prisma — 3 role levels', status: 'Implemented' },
  { feature: 'Tournament APIs', category: 'Data', priority: 'Medium', where: '/api/cricket/tournament — fixtures, stats, details (API only)', status: 'Implemented' },
  { feature: 'Live Scores (Socket.IO)', category: 'Live', priority: 'High', where: 'Homepage — real-time updates every 5 seconds', status: 'Implemented' },
  { feature: 'Upcoming Matches Carousel', category: 'Live', priority: 'Medium', where: 'Homepage — with AI confidence levels', status: 'Implemented' },
  { feature: 'AI-Generated Blog / News', category: 'Content', priority: 'Medium', where: '/blog — daily RSS scrape + OpenAI rewrite → Sanity CMS', status: 'Implemented' },
  { feature: 'Prediction Performance Tracker', category: 'Predictions', priority: 'High', where: '/predictions — win rate, ROI, per-stage breakdown', status: 'Implemented' },
  { feature: 'Background Scheduler', category: 'System', priority: 'Medium', where: 'lib/scheduler.ts — predictions every 6h, blog daily', status: 'Implemented' },
  { feature: 'Recent Form (Last 7 Matches)', category: 'Analytics', priority: 'Medium', where: 'AI Analysis page — win/loss trend display', status: 'Implemented' },
]

const notImplemented = [
  // High Priority
  { feature: 'Odds Movement / Line Movement Chart', category: 'Odds', priority: 'High', where: '—', status: 'Not Implemented', notes: 'Bettors track odds shifts to spot sharp money — currently static snapshots only' },
  { feature: 'Bookmaker Odds Comparison Table', category: 'Odds', priority: 'High', where: '—', status: 'Not Implemented', notes: 'Compare odds across Bet365, Betway, etc. per match' },
  { feature: 'Player Form Tracker (Dedicated Page)', category: 'Analytics', priority: 'High', where: '—', status: 'Not Implemented', notes: 'Last 5/10 match trends, form badges, injury status' },
  { feature: 'Toss Result Tracker', category: 'Analytics', priority: 'High', where: '—', status: 'Not Implemented', notes: 'Toss advice exists but no historical toss → result correlation by venue' },
  { feature: 'Run Chase Calculator', category: 'Live', priority: 'High', where: '—', status: 'Not Implemented', notes: 'Required RR, balls remaining, wickets — critical live betting tool' },
  // Medium Priority
  { feature: 'Community Tipster Leaderboard', category: 'Community', priority: 'Medium', where: '—', status: 'Not Implemented', notes: 'Tipster system exists but no public leaderboard ranked by accuracy %' },
  { feature: 'Fantasy XI Suggester', category: 'Fantasy', priority: 'Medium', where: '—', status: 'Not Implemented', notes: 'Dream11 team builder based on pitch, weather & form' },
  { feature: 'Tournament Points Table UI', category: 'Tournaments', priority: 'Medium', where: '—', status: 'Not Implemented', notes: 'API exists but no visual standings page' },
  { feature: 'Top Run-scorers / Wicket-takers Widget', category: 'Analytics', priority: 'Medium', where: '—', status: 'Not Implemented', notes: "Today's performers — bettors track in-form players" },
  { feature: 'Team Selection / Playing XI Feed', category: 'Data', priority: 'Medium', where: '—', status: 'Not Implemented', notes: 'Critical for last-minute betting decisions' },
  { feature: 'Push / Email Notifications', category: 'Notifications', priority: 'Medium', where: '—', status: 'Not Implemented', notes: 'Odds alert, match start, wicket alerts' },
  // Nice to Have
  { feature: 'Personal Bet Tracker (Bankroll Manager)', category: 'Betting', priority: 'Low', where: '—', status: 'Not Implemented', notes: 'Log own bets, track P&L, ROI — only ₹10k simulation exists currently' },
  { feature: '"What If" Match Simulator', category: 'Analytics', priority: 'Low', where: '—', status: 'Not Implemented', notes: 'Simulate outcomes based on squad changes' },
  { feature: 'Betting Glossary / Education Section', category: 'Content', priority: 'Low', where: '—', status: 'Not Implemented', notes: 'Retain new bettors — explain odds, implied prob, Kelly criterion' },
  { feature: 'Venue Historical Stats Page', category: 'Analytics', priority: 'Low', where: '—', status: 'Not Implemented', notes: '"At this ground, chasing teams win 65% of T20s"' },
  { feature: 'Social Sharing for Tips', category: 'Community', priority: 'Low', where: '—', status: 'Not Implemented', notes: 'Share tips to WhatsApp/Twitter to drive traffic' },
]

const allFeatures = [...implemented, ...notImplemented]

// ─── EXCEL ────────────────────────────────────────────────────────────────────

function generateExcel() {
  const wb = xlsx.utils.book_new()

  // Sheet 1: All Features Overview
  const overviewData = [
    ['#', 'Feature', 'Category', 'Priority', 'Status', 'Where / Notes'],
    ...allFeatures.map((f, i) => [
      i + 1,
      f.feature,
      f.category,
      f.priority,
      f.status,
      f.where !== '—' ? f.where : (f.notes || ''),
    ])
  ]
  const wsOverview = xlsx.utils.aoa_to_sheet(overviewData)
  wsOverview['!cols'] = [{ wch: 4 }, { wch: 42 }, { wch: 16 }, { wch: 10 }, { wch: 18 }, { wch: 60 }]
  xlsx.utils.book_append_sheet(wb, wsOverview, 'All Features')

  // Sheet 2: Implemented
  const implData = [
    ['#', 'Feature', 'Category', 'Priority', 'Where Implemented'],
    ...implemented.map((f, i) => [i + 1, f.feature, f.category, f.priority, f.where])
  ]
  const wsImpl = xlsx.utils.aoa_to_sheet(implData)
  wsImpl['!cols'] = [{ wch: 4 }, { wch: 42 }, { wch: 16 }, { wch: 10 }, { wch: 60 }]
  xlsx.utils.book_append_sheet(wb, wsImpl, 'Implemented (21)')

  // Sheet 3: Not Implemented
  const notImplData = [
    ['#', 'Feature', 'Category', 'Priority', 'Notes'],
    ...notImplemented.map((f, i) => [i + 1, f.feature, f.category, f.priority, f.notes])
  ]
  const wsNotImpl = xlsx.utils.aoa_to_sheet(notImplData)
  wsNotImpl['!cols'] = [{ wch: 4 }, { wch: 42 }, { wch: 16 }, { wch: 10 }, { wch: 65 }]
  xlsx.utils.book_append_sheet(wb, wsNotImpl, 'To Implement (16)')

  // Sheet 4: Summary
  const high = notImplemented.filter(f => f.priority === 'High')
  const medium = notImplemented.filter(f => f.priority === 'Medium')
  const low = notImplemented.filter(f => f.priority === 'Low')

  const summaryData = [
    ['Cricket Analytics — Feature Report Summary'],
    ['Generated', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })],
    [],
    ['Metric', 'Count'],
    ['Total Features Identified', allFeatures.length],
    ['Already Implemented', implemented.length],
    ['Yet to Implement', notImplemented.length],
    [],
    ['To-Do Breakdown', ''],
    ['High Priority', high.length],
    ['Medium Priority', medium.length],
    ['Low Priority', low.length],
    [],
    ['Recommended Build Order', ''],
    ['1st', 'Odds Movement Chart'],
    ['2nd', 'Bookmaker Comparison Table'],
    ['3rd', 'Run Chase Calculator'],
    ['4th', 'Community Tipster Leaderboard'],
    ['5th', 'Tournament Points Table UI'],
  ]
  const wsSummary = xlsx.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 35 }]
  xlsx.utils.book_append_sheet(wb, wsSummary, 'Summary')

  const excelPath = path.join(OUTPUT_DIR, 'cricket-analytics-features.xlsx')
  xlsx.writeFile(wb, excelPath)
  console.log(`✅ Excel saved → ${excelPath}`)
}

// ─── PDF (HTML) ───────────────────────────────────────────────────────────────

function generatePDF() {
  const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  const implRows = implemented.map((f, i) => `
    <tr class="${i % 2 === 0 ? 'even' : ''}">
      <td>${i + 1}</td>
      <td>${f.feature}</td>
      <td><span class="tag tag-${f.category.toLowerCase().replace(/\s+/g,'-')}">${f.category}</span></td>
      <td><span class="priority priority-${f.priority.toLowerCase()}">${f.priority}</span></td>
      <td class="small">${f.where}</td>
    </tr>`).join('')

  const notImplRows = notImplemented.map((f, i) => `
    <tr class="${i % 2 === 0 ? 'even' : ''}">
      <td>${i + 1}</td>
      <td>${f.feature}</td>
      <td><span class="tag">${f.category}</span></td>
      <td><span class="priority priority-${f.priority.toLowerCase()}">${f.priority}</span></td>
      <td class="small">${f.notes}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Cricket Analytics — Feature Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; }

  .cover { background: linear-gradient(135deg, #0f3460 0%, #16213e 60%, #0d7377 100%);
    color: white; padding: 60px 50px; min-height: 220px; }
  .cover h1 { font-size: 30px; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px; }
  .cover .sub { font-size: 14px; opacity: 0.8; margin-bottom: 20px; }
  .cover .meta { font-size: 11px; opacity: 0.65; }

  .stats-bar { display: flex; gap: 0; border-bottom: 3px solid #0d7377; }
  .stat-box { flex: 1; padding: 18px 20px; text-align: center; border-right: 1px solid #e5e7eb; }
  .stat-box:last-child { border-right: none; }
  .stat-box .num { font-size: 28px; font-weight: 800; color: #0d7377; }
  .stat-box .lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

  .section { padding: 28px 40px; }
  .section-title { font-size: 17px; font-weight: 700; color: #0f3460; border-left: 4px solid #0d7377;
    padding-left: 12px; margin-bottom: 16px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #0f3460; color: white; padding: 9px 10px; text-align: left; font-size: 11px; font-weight: 600; }
  td { padding: 7px 10px; vertical-align: top; border-bottom: 1px solid #f0f0f0; }
  tr.even td { background: #f8fafc; }
  td.small { font-size: 10.5px; color: #4b5563; line-height: 1.4; }

  .priority { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .priority-high { background: #fef2f2; color: #dc2626; }
  .priority-medium { background: #fffbeb; color: #d97706; }
  .priority-low { background: #f0fdf4; color: #16a34a; }

  .tag { display: inline-block; padding: 2px 7px; border-radius: 8px; font-size: 10px;
    background: #e0f2fe; color: #0369a1; font-weight: 500; }

  .status-done { color: #16a34a; font-weight: 600; }
  .status-todo { color: #dc2626; font-weight: 600; }

  .roadmap { margin-top: 16px; }
  .roadmap-item { display: flex; align-items: flex-start; gap: 14px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
  .roadmap-num { background: #0d7377; color: white; border-radius: 50%; width: 26px; height: 26px;
    display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .roadmap-item .title { font-weight: 600; font-size: 12px; color: #0f3460; }
  .roadmap-item .desc { font-size: 11px; color: #6b7280; margin-top: 2px; }

  .page-break { page-break-before: always; }
  .footer { background: #f8fafc; padding: 14px 40px; text-align: center; font-size: 10px;
    color: #9ca3af; border-top: 1px solid #e5e7eb; margin-top: 20px; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <h1>Cricket Analytics</h1>
  <div class="sub">Betting Feature Analysis Report</div>
  <div class="meta">Generated: ${now} &nbsp;|&nbsp; Prepared for internal reference</div>
</div>

<!-- STATS BAR -->
<div class="stats-bar">
  <div class="stat-box"><div class="num">37</div><div class="lbl">Total Features</div></div>
  <div class="stat-box"><div class="num">21</div><div class="lbl">Implemented</div></div>
  <div class="stat-box"><div class="num">16</div><div class="lbl">To Implement</div></div>
  <div class="stat-box"><div class="num">5</div><div class="lbl">High Priority Gaps</div></div>
  <div class="stat-box"><div class="num">57%</div><div class="lbl">Completion</div></div>
</div>

<!-- IMPLEMENTED -->
<div class="section">
  <div class="section-title">✅ Implemented Features (21)</div>
  <table>
    <thead>
      <tr><th>#</th><th>Feature</th><th>Category</th><th>Priority</th><th>Where</th></tr>
    </thead>
    <tbody>${implRows}</tbody>
  </table>
</div>

<!-- NOT IMPLEMENTED -->
<div class="page-break"></div>
<div class="section">
  <div class="section-title">🔧 Features To Implement (16)</div>
  <table>
    <thead>
      <tr><th>#</th><th>Feature</th><th>Category</th><th>Priority</th><th>Notes</th></tr>
    </thead>
    <tbody>${notImplRows}</tbody>
  </table>
</div>

<!-- ROADMAP -->
<div class="section">
  <div class="section-title">🗺️ Recommended Build Roadmap</div>
  <div class="roadmap">
    <div class="roadmap-item">
      <div class="roadmap-num">1</div>
      <div><div class="title">Odds Movement / Line Movement Chart</div>
      <div class="desc">Show odds history timeline per match. Bettors spot sharp money by tracking shifts.</div></div>
    </div>
    <div class="roadmap-item">
      <div class="roadmap-num">2</div>
      <div><div class="title">Bookmaker Odds Comparison Table</div>
      <div class="desc">Aggregate odds from Bet365, Betway, etc. — biggest single demand from bettors.</div></div>
    </div>
    <div class="roadmap-item">
      <div class="roadmap-num">3</div>
      <div><div class="title">Run Chase Calculator</div>
      <div class="desc">Required RR, balls left, wickets in hand — essential live betting companion tool.</div></div>
    </div>
    <div class="roadmap-item">
      <div class="roadmap-num">4</div>
      <div><div class="title">Community Tipster Leaderboard</div>
      <div class="desc">Public leaderboard ranked by accuracy %. Drives engagement and trust in tipsters.</div></div>
    </div>
    <div class="roadmap-item">
      <div class="roadmap-num">5</div>
      <div><div class="title">Tournament Points Table UI</div>
      <div class="desc">Visual standings page — API is already built, just needs a frontend page.</div></div>
    </div>
  </div>
</div>

<div class="footer">Cricket Analytics Platform &nbsp;|&nbsp; Feature Report &nbsp;|&nbsp; ${now} &nbsp;|&nbsp; Confidential — Internal Use Only</div>

</body>
</html>`

  const htmlPath = path.join(OUTPUT_DIR, 'cricket-analytics-features.html')
  fs.writeFileSync(htmlPath, html)
  console.log(`✅ PDF-ready HTML saved → ${htmlPath}`)
  console.log(`   → Open in browser and press Ctrl+P → Save as PDF`)
}

// ─── RUN ──────────────────────────────────────────────────────────────────────

generateExcel()
generatePDF()
console.log('\n📁 Both files saved to: docs/reports/')