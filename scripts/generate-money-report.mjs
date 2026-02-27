/**
 * Generates Money & Marketing Statistics PDF report
 * Run: node scripts/generate-money-report.mjs
 */

import fs from 'fs'
import path from 'path'

const OUTPUT_DIR = path.resolve('docs/reports')
const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Cricket Analytics — Money & Marketing Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; }

  /* COVER */
  .cover {
    background: linear-gradient(135deg, #0f3460 0%, #16213e 60%, #0d7377 100%);
    color: white; padding: 60px 50px;
  }
  .cover h1 { font-size: 32px; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px; }
  .cover h2 { font-size: 16px; font-weight: 400; opacity: 0.85; margin-bottom: 20px; }
  .cover .meta { font-size: 11px; opacity: 0.6; }
  .cover .badge {
    display: inline-block; background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    padding: 4px 14px; border-radius: 20px; font-size: 11px; margin-top: 14px;
  }

  /* STATS BAR */
  .stats-bar { display: flex; border-bottom: 3px solid #0d7377; }
  .stat-box { flex: 1; padding: 18px 16px; text-align: center; border-right: 1px solid #e5e7eb; }
  .stat-box:last-child { border-right: none; }
  .stat-box .num { font-size: 22px; font-weight: 800; color: #0d7377; }
  .stat-box .lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; }

  /* SECTIONS */
  .section { padding: 24px 40px; }
  .section-title {
    font-size: 16px; font-weight: 700; color: #0f3460;
    border-left: 4px solid #0d7377; padding-left: 12px;
    margin-bottom: 16px; margin-top: 4px;
  }
  .section-subtitle { font-size: 11px; color: #6b7280; margin-bottom: 14px; margin-left: 16px; }

  /* TABLES */
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #0f3460; color: white; padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 600; }
  td { padding: 8px 12px; vertical-align: top; border-bottom: 1px solid #f0f0f0; font-size: 11.5px; }
  tr.even td { background: #f8fafc; }
  tr.total td { background: #0f3460; color: white; font-weight: 700; font-size: 12px; }
  tr.highlight td { background: #ecfdf5; color: #065f46; font-weight: 600; }
  .right { text-align: right; }
  .center { text-align: center; }
  .green { color: #16a34a; font-weight: 700; }
  .red { color: #dc2626; font-weight: 700; }
  .orange { color: #d97706; font-weight: 700; }
  .blue { color: #0f3460; font-weight: 700; }

  /* CARDS */
  .card-row { display: flex; gap: 16px; margin-bottom: 16px; }
  .card {
    flex: 1; border: 1px solid #e5e7eb; border-radius: 10px;
    padding: 16px; background: #f8fafc;
  }
  .card.green-card { background: #f0fdf4; border-color: #bbf7d0; }
  .card.red-card { background: #fef2f2; border-color: #fecaca; }
  .card.blue-card { background: #eff6ff; border-color: #bfdbfe; }
  .card.yellow-card { background: #fffbeb; border-color: #fde68a; }
  .card h3 { font-size: 12px; font-weight: 700; margin-bottom: 8px; }
  .card .big { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .card .note { font-size: 10px; color: #6b7280; line-height: 1.5; }

  /* PROGRESS BAR */
  .bar-row { margin-bottom: 10px; }
  .bar-label { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
  .bar-bg { background: #e5e7eb; border-radius: 4px; height: 10px; }
  .bar-fill { height: 10px; border-radius: 4px; }

  /* TIMELINE */
  .timeline { margin-top: 10px; }
  .tl-item { display: flex; gap: 16px; margin-bottom: 14px; align-items: flex-start; }
  .tl-dot {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 12px; color: white;
  }
  .tl-content .title { font-weight: 700; font-size: 12px; color: #0f3460; }
  .tl-content .desc { font-size: 11px; color: #6b7280; margin-top: 2px; line-height: 1.4; }

  /* WARNING BOX */
  .warn-box {
    background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
    padding: 14px 16px; margin-bottom: 12px;
  }
  .warn-box h4 { font-size: 12px; font-weight: 700; color: #92400e; margin-bottom: 6px; }
  .warn-box ul { padding-left: 16px; }
  .warn-box li { font-size: 11px; color: #78350f; margin-bottom: 4px; line-height: 1.4; }

  .info-box {
    background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
    padding: 14px 16px; margin-bottom: 12px;
  }
  .info-box h4 { font-size: 12px; font-weight: 700; color: #1e40af; margin-bottom: 6px; }
  .info-box ul { padding-left: 16px; }
  .info-box li { font-size: 11px; color: #1e3a8a; margin-bottom: 4px; line-height: 1.4; }

  .success-box {
    background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
    padding: 14px 16px; margin-bottom: 12px;
  }
  .success-box h4 { font-size: 12px; font-weight: 700; color: #065f46; margin-bottom: 6px; }
  .success-box p { font-size: 11px; color: #064e3b; line-height: 1.6; }

  /* PAGE BREAK */
  .page-break { page-break-before: always; }
  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 8px 0 16px; }

  /* FOOTER */
  .footer {
    background: #f8fafc; padding: 14px 40px; text-align: center;
    font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; margin-top: 20px;
  }
</style>
</head>
<body>

<!-- ═══════════════ COVER ═══════════════ -->
<div class="cover">
  <h1>Cricket Analytics Platform</h1>
  <h2>Money & Marketing Statistics Report</h2>
  <div class="meta">Generated: ${now} &nbsp;|&nbsp; IPL 2026 Launch Planning</div>
  <div class="badge">📊 Confidential — Internal Reference</div>
</div>

<!-- ═══════════════ STATS BAR ═══════════════ -->
<div class="stats-bar">
  <div class="stat-box"><div class="num">₹2L</div><div class="lbl">Marketing Budget</div></div>
  <div class="stat-box"><div class="num">₹4.5–7L</div><div class="lbl">IPL Revenue Potential</div></div>
  <div class="stat-box"><div class="num">2x–3.5x</div><div class="lbl">Expected ROI</div></div>
  <div class="stat-box"><div class="num">12,000</div><div class="lbl">Est. Users (IPL)</div></div>
  <div class="stat-box"><div class="num">3</div><div class="lbl">Revenue Streams</div></div>
</div>

<!-- ═══════════════ SECTION 1: BUDGET BREAKDOWN ═══════════════ -->
<div class="section">
  <div class="section-title">1. Marketing Budget Breakdown — ₹2,00,000</div>
  <div class="section-subtitle">Recommended smart split across channels for maximum IPL 2026 reach</div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Channel</th>
        <th>Budget</th>
        <th>% of Total</th>
        <th>Expected Outcome</th>
      </tr>
    </thead>
    <tbody>
      <tr class="even">
        <td>1</td>
        <td><strong>Google Ads</strong> (Search Keywords)</td>
        <td class="right green">₹60,000</td>
        <td class="center">30%</td>
        <td>Target "today match prediction", "IPL tips" — high intent users</td>
      </tr>
      <tr>
        <td>2</td>
        <td><strong>Meta Ads</strong> (Facebook + Instagram)</td>
        <td class="right green">₹40,000</td>
        <td class="center">20%</td>
        <td>Cricket fan targeting, retargeting visitors</td>
      </tr>
      <tr class="even">
        <td>3</td>
        <td><strong>SEO / Blog Content Boost</strong></td>
        <td class="right green">₹20,000</td>
        <td class="center">10%</td>
        <td>Promote blog posts via social — long term free traffic</td>
      </tr>
      <tr>
        <td>4</td>
        <td><strong>Telegram Channel Setup & Promotion</strong></td>
        <td class="right green">₹20,000</td>
        <td class="center">10%</td>
        <td>Build tips community — free daily tips to attract followers</td>
      </tr>
      <tr class="even">
        <td>5</td>
        <td><strong>Influencer / Cricket Page Shoutout</strong></td>
        <td class="right green">₹20,000</td>
        <td class="center">10%</td>
        <td>One shoutout from 100k+ cricket Instagram/YouTube page</td>
      </tr>
      <tr>
        <td>6</td>
        <td><strong>YouTube Shorts / Instagram Reels</strong></td>
        <td class="right green">₹20,000</td>
        <td class="center">10%</td>
        <td>Short prediction videos — high organic reach potential</td>
      </tr>
      <tr class="even">
        <td>7</td>
        <td><strong>WhatsApp Group Network</strong></td>
        <td class="right green">₹10,000</td>
        <td class="center">5%</td>
        <td>Share tips in cricket groups — very high conversion in India</td>
      </tr>
      <tr>
        <td>8</td>
        <td><strong>Buffer / Unexpected Costs</strong></td>
        <td class="right orange">₹10,000</td>
        <td class="center">5%</td>
        <td>Always keep reserve for opportunities</td>
      </tr>
      <tr class="total">
        <td colspan="2">TOTAL BUDGET</td>
        <td class="right">₹2,00,000</td>
        <td class="center">100%</td>
        <td>Full IPL 2026 campaign</td>
      </tr>
    </tbody>
  </table>

  <!-- Budget Visual -->
  <div style="margin-top: 16px;">
    <div class="bar-row">
      <div class="bar-label"><span>Google Ads</span><span>₹60,000 (30%)</span></div>
      <div class="bar-bg"><div class="bar-fill" style="width:30%; background:#0d7377;"></div></div>
    </div>
    <div class="bar-row">
      <div class="bar-label"><span>Meta Ads</span><span>₹40,000 (20%)</span></div>
      <div class="bar-bg"><div class="bar-fill" style="width:20%; background:#0f3460;"></div></div>
    </div>
    <div class="bar-row">
      <div class="bar-label"><span>SEO / Blog</span><span>₹20,000 (10%)</span></div>
      <div class="bar-bg"><div class="bar-fill" style="width:10%; background:#6366f1;"></div></div>
    </div>
    <div class="bar-row">
      <div class="bar-label"><span>Telegram + WhatsApp</span><span>₹30,000 (15%)</span></div>
      <div class="bar-bg"><div class="bar-fill" style="width:15%; background:#16a34a;"></div></div>
    </div>
    <div class="bar-row">
      <div class="bar-label"><span>Influencer + Reels</span><span>₹40,000 (20%)</span></div>
      <div class="bar-bg"><div class="bar-fill" style="width:20%; background:#d97706;"></div></div>
    </div>
    <div class="bar-row">
      <div class="bar-label"><span>Buffer</span><span>₹10,000 (5%)</span></div>
      <div class="bar-bg"><div class="bar-fill" style="width:5%; background:#9ca3af;"></div></div>
    </div>
  </div>
</div>

<!-- ═══════════════ SECTION 2: TRAFFIC & USER PROJECTIONS ═══════════════ -->
<div class="page-break"></div>
<div class="section">
  <div class="section-title">2. Traffic & User Projections (IPL Season)</div>

  <table>
    <thead>
      <tr><th>Source</th><th>Budget Spent</th><th>Min Users</th><th>Max Users</th><th>Notes</th></tr>
    </thead>
    <tbody>
      <tr class="even">
        <td>Google Ads</td>
        <td>₹60,000</td>
        <td class="center">3,000</td>
        <td class="center">5,000</td>
        <td>High intent — search based</td>
      </tr>
      <tr>
        <td>Meta Ads</td>
        <td>₹40,000</td>
        <td class="center">2,000</td>
        <td class="center">4,000</td>
        <td>Interest-based targeting</td>
      </tr>
      <tr class="even">
        <td>Telegram + WhatsApp</td>
        <td>₹30,000</td>
        <td class="center">1,000</td>
        <td class="center">2,000</td>
        <td>Community followers</td>
      </tr>
      <tr>
        <td>Organic / SEO Blog</td>
        <td>₹20,000</td>
        <td class="center">500</td>
        <td class="center">1,000</td>
        <td>Long-term free traffic</td>
      </tr>
      <tr class="even">
        <td>Influencer + Reels</td>
        <td>₹40,000</td>
        <td class="center">500</td>
        <td class="center">2,000</td>
        <td>Variable — depends on virality</td>
      </tr>
      <tr class="total">
        <td>TOTAL</td>
        <td>₹1,90,000</td>
        <td class="center">7,000</td>
        <td class="center">14,000</td>
        <td>Estimated IPL season total</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ═══════════════ SECTION 3: REVENUE PROJECTIONS ═══════════════ -->
<div class="section">
  <div class="section-title">3. Revenue Projections — IPL 2026 (2 Months)</div>

  <table>
    <thead>
      <tr><th>Revenue Stream</th><th>Assumption</th><th>Unit Value</th><th>Min Revenue</th><th>Max Revenue</th></tr>
    </thead>
    <tbody>
      <tr class="even">
        <td><strong>Affiliate Signups</strong><br/><span style="font-size:10px;color:#6b7280;">Bookmaker referrals</span></td>
        <td>3% of 7,000–14,000 visitors<br/>= 210–420 signups</td>
        <td>₹2,000–₹3,000 per user</td>
        <td class="right green">₹4,20,000</td>
        <td class="right green">₹12,60,000</td>
      </tr>
      <tr>
        <td><strong>Premium Subscription</strong><br/><span style="font-size:10px;color:#6b7280;">Monthly membership</span></td>
        <td>1% of users × 2 months<br/>= ~65 subscribers</td>
        <td>₹499/month</td>
        <td class="right green">₹32,000</td>
        <td class="right green">₹65,000</td>
      </tr>
      <tr class="even">
        <td><strong>Ad Revenue</strong><br/><span style="font-size:10px;color:#6b7280;">Google AdSense / display</span></td>
        <td>10,000 visitors/month × 2 months</td>
        <td>₹5,000–₹15,000/month</td>
        <td class="right green">₹10,000</td>
        <td class="right green">₹30,000</td>
      </tr>
      <tr class="total">
        <td colspan="3">TOTAL ESTIMATED REVENUE (IPL Season)</td>
        <td class="right">₹4,62,000</td>
        <td class="right">₹13,55,000</td>
      </tr>
      <tr style="background:#fef9c3;">
        <td colspan="3" style="font-weight:700; color:#92400e;">Less: Marketing Investment</td>
        <td class="right red" colspan="2">— ₹2,00,000</td>
      </tr>
      <tr class="highlight">
        <td colspan="3" style="font-weight:700;">NET PROFIT (Conservative–Optimistic)</td>
        <td class="right green">₹2,62,000</td>
        <td class="right green">₹11,55,000</td>
      </tr>
    </tbody>
  </table>

  <!-- ROI Cards -->
  <div class="card-row" style="margin-top: 18px;">
    <div class="card green-card">
      <h3 style="color:#065f46;">Conservative ROI</h3>
      <div class="big" style="color:#16a34a;">2.3x</div>
      <div class="note">₹2L invested → ₹4.62L returned<br/>Net profit: ₹2.62L</div>
    </div>
    <div class="card blue-card">
      <h3 style="color:#1e40af;">Optimistic ROI</h3>
      <div class="big" style="color:#1d4ed8;">6.8x</div>
      <div class="note">₹2L invested → ₹13.55L returned<br/>Net profit: ₹11.55L</div>
    </div>
    <div class="card yellow-card">
      <h3 style="color:#92400e;">Realistic Target</h3>
      <div class="big" style="color:#d97706;">3.5x</div>
      <div class="note">₹2L invested → ₹7L returned<br/>Net profit: ₹5L</div>
    </div>
  </div>
</div>

<!-- ═══════════════ SECTION 4: GLOBAL MARKET ═══════════════ -->
<div class="page-break"></div>
<div class="section">
  <div class="section-title">4. Global Market — Affiliate Revenue Comparison</div>
  <div class="section-subtitle">Revenue potential per 100 users/month who sign up via affiliate links</div>

  <table>
    <thead>
      <tr><th>Country</th><th>Betting Status</th><th>Payout Per User</th><th>100 Users/Month</th><th>Priority</th></tr>
    </thead>
    <tbody>
      <tr class="even">
        <td>🇮🇳 India</td>
        <td><span class="orange">Grey Area</span></td>
        <td>₹2,000 – ₹5,000</td>
        <td class="right green">₹2L – ₹5L/month</td>
        <td><strong>Phase 1 — Launch Now</strong></td>
      </tr>
      <tr>
        <td>🇬🇧 England / UK</td>
        <td><span class="green">✅ Legal</span></td>
        <td>£50 – £150 (~₹5,500–₹17,000)</td>
        <td class="right green">₹5.5L – ₹17L/month</td>
        <td><strong>Phase 2 — Jun 2026</strong></td>
      </tr>
      <tr class="even">
        <td>🇦🇺 Australia</td>
        <td><span class="green">✅ Legal</span></td>
        <td>AUD $100–$300 (~₹5,500–₹16,500)</td>
        <td class="right green">₹5.5L – ₹16.5L/month</td>
        <td><strong>Phase 2 — Jun 2026</strong></td>
      </tr>
      <tr>
        <td>🇿🇦 South Africa</td>
        <td><span class="green">✅ Legal</span></td>
        <td>ZAR 500–1,500 (~₹2,300–₹7,000)</td>
        <td class="right green">₹2.3L – ₹7L/month</td>
        <td><strong>Phase 3</strong></td>
      </tr>
      <tr class="even">
        <td>🇦🇪 UAE / Gulf</td>
        <td><span class="green">✅ Regulated</span></td>
        <td>AED 200–600 (~₹4,500–₹13,500)</td>
        <td class="right green">₹4.5L – ₹13.5L/month</td>
        <td><strong>Phase 3</strong></td>
      </tr>
      <tr>
        <td>🇳🇿 New Zealand</td>
        <td><span class="green">✅ Legal</span></td>
        <td>NZD $80–$200 (~₹4,000–₹10,000)</td>
        <td class="right green">₹4L – ₹10L/month</td>
        <td><strong>Phase 3</strong></td>
      </tr>
      <tr class="total">
        <td colspan="3">COMBINED POTENTIAL (All markets, Phase 2+)</td>
        <td class="right">₹25L – ₹70L/month</td>
        <td>Long-term goal</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ═══════════════ SECTION 5: LAUNCH ROADMAP ═══════════════ -->
<div class="section">
  <div class="section-title">5. Launch & Revenue Roadmap</div>

  <div class="timeline">
    <div class="tl-item">
      <div class="tl-dot" style="background:#0d7377;">1</div>
      <div class="tl-content">
        <div class="title">Phase 1 — Pre-Launch (Now → IPL Start)</div>
        <div class="desc">Complete monetization features: affiliate links, premium subscription, Telegram bot.<br/>
        Register bookmaker affiliate accounts (Betway, 1xBet, Parimatch) — takes 1–2 weeks for approval.<br/>
        <strong>Budget: ₹0 (development only)</strong></div>
      </div>
    </div>
    <div class="tl-item">
      <div class="tl-dot" style="background:#0f3460;">2</div>
      <div class="tl-content">
        <div class="title">Phase 2 — IPL Launch (Week 1–2 of IPL)</div>
        <div class="desc">Spend first ₹50,000 on Google Ads + Meta Ads. Launch Telegram channel.<br/>
        Monitor conversion rate. Double down on what works.<br/>
        <strong>Budget: ₹50,000 | Expected users: 2,000–4,000</strong></div>
      </div>
    </div>
    <div class="tl-item">
      <div class="tl-dot" style="background:#6366f1;">3</div>
      <div class="tl-content">
        <div class="title">Phase 3 — IPL Mid-Season (Week 3–6)</div>
        <div class="desc">Spend remaining ₹1,50,000 based on what's converting.<br/>
        Activate influencer shoutouts during high-profile IPL matches.<br/>
        <strong>Budget: ₹1,50,000 | Expected users: 5,000–10,000 total</strong></div>
      </div>
    </div>
    <div class="tl-item">
      <div class="tl-dot" style="background:#16a34a;">4</div>
      <div class="tl-content">
        <div class="title">Phase 4 — Post IPL / Global Expansion (Jun 2026+)</div>
        <div class="desc">Reinvest IPL profits. Target UK (The Hundred) + Australia (BBL).<br/>
        Add currency switcher, UK/AU affiliate programs.<br/>
        <strong>Budget: Reinvest from IPL profits | Target: ₹10L+/month</strong></div>
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════ SECTION 6: KEY GOOGLE KEYWORDS ═══════════════ -->
<div class="page-break"></div>
<div class="section">
  <div class="section-title">6. High-Value Google Ad Keywords</div>
  <div class="section-subtitle">Keywords to target for maximum ROI — high search intent, active bettors</div>

  <table>
    <thead>
      <tr><th>Keyword</th><th>Market</th><th>Intent</th><th>Priority</th></tr>
    </thead>
    <tbody>
      <tr class="even"><td>ipl match prediction today</td><td>India</td><td class="green">Very High</td><td>🔴 Must Target</td></tr>
      <tr><td>ipl betting tips</td><td>India</td><td class="green">Very High</td><td>🔴 Must Target</td></tr>
      <tr class="even"><td>today cricket match winner</td><td>India / Global</td><td class="green">Very High</td><td>🔴 Must Target</td></tr>
      <tr><td>ipl 2026 tips free</td><td>India</td><td class="green">High</td><td>🔴 Must Target</td></tr>
      <tr class="even"><td>dream11 team today</td><td>India</td><td class="green">Very High</td><td>🔴 Must Target</td></tr>
      <tr><td>cricket betting tips today</td><td>UK</td><td class="green">Very High</td><td>🟡 Phase 2</td></tr>
      <tr class="even"><td>best cricket odds</td><td>UK / AU</td><td class="green">High</td><td>🟡 Phase 2</td></tr>
      <tr><td>t20 world cup prediction 2026</td><td>Global</td><td class="orange">Medium-High</td><td>🟡 Phase 2</td></tr>
      <tr class="even"><td>ashes 2026 betting tips</td><td>UK + AU</td><td class="green">High</td><td>🟡 Phase 2</td></tr>
      <tr><td>bbl betting tips</td><td>Australia</td><td class="green">High</td><td>🟢 Phase 3</td></tr>
    </tbody>
  </table>
</div>

<!-- ═══════════════ SECTION 7: WARNINGS & RISKS ═══════════════ -->
<div class="section">
  <div class="section-title">7. Risks & Important Warnings</div>

  <div class="warn-box">
    <h4>⚠️ Key Risks To Manage</h4>
    <ul>
      <li><strong>Legal Grey Area (India):</strong> Frame platform as "cricket analytics & predictions" — not "betting tips". Avoid using words like "bet", "wager" in ads.</li>
      <li><strong>Google Ads Policy:</strong> Google is strict on gambling content. Get ads pre-approved or risk account suspension.</li>
      <li><strong>Spending Too Fast:</strong> Do NOT spend entire ₹2L in week 1. Spread over 8 weeks of IPL to optimize as you learn.</li>
      <li><strong>No Affiliate Accounts Ready:</strong> Apply now — approval takes 1–2 weeks. No point running ads without monetization live.</li>
      <li><strong>App Performance:</strong> Slow app = poor ad conversion. Every second of load time costs users and money.</li>
    </ul>
  </div>

  <div class="info-box">
    <h4>💡 Must Do Before Spending A Single Rupee On Ads</h4>
    <ul>
      <li>✅ Affiliate links live on odds page</li>
      <li>✅ Premium subscription system working</li>
      <li>✅ App performance optimized (fast load)</li>
      <li>✅ Telegram channel created and active</li>
      <li>✅ Bookmaker affiliate accounts approved</li>
    </ul>
  </div>

  <div class="success-box">
    <h4>✅ Honest Verdict</h4>
    <p>
      ₹2 lakh <strong>is enough</strong> to get first users and first earnings during IPL 2026.<br/>
      You won't become a crorepati in one season — but <strong>₹3–6 lakh return is realistic</strong> if the app works well and affiliate links are in place.<br/><br/>
      The biggest advantage: your app is already <strong>57% feature complete</strong> with AI predictions, live odds, and a blog generating daily content automatically.<br/><br/>
      <strong>After IPL — reinvest profits into UK & Australia expansion. That's where it compounds.</strong>
    </p>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  Cricket Analytics Platform &nbsp;|&nbsp; Money & Marketing Statistics Report &nbsp;|&nbsp; ${now} &nbsp;|&nbsp; Confidential — Internal Reference Only
</div>

</body>
</html>`

fs.writeFileSync(path.join(OUTPUT_DIR, 'cricket-analytics-money-report.html'), html)
console.log(`✅ Money Report saved → docs/reports/cricket-analytics-money-report.html`)
console.log(`   → Open in browser → Ctrl+P → Save as PDF`)