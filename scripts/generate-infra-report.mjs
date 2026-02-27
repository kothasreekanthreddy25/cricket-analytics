import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../docs/reports')
mkdirSync(OUT_DIR, { recursive: true })

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cricket Analytics — Production Infrastructure & Pricing</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f4f6f9;
      color: #1a1a2e;
      padding: 40px 20px;
    }
    .container { max-width: 960px; margin: 0 auto; }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: white;
      padding: 40px;
      border-radius: 16px;
      margin-bottom: 32px;
      text-align: center;
    }
    .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .header p { font-size: 15px; color: #a0c4ff; margin-bottom: 4px; }
    .header .date { font-size: 13px; color: #6c8ebf; margin-top: 12px; }
    .badge {
      display: inline-block;
      background: #e94560;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 12px;
    }

    /* Section */
    .section {
      background: white;
      border-radius: 12px;
      padding: 28px 32px;
      margin-bottom: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.07);
      border-left: 5px solid #0f3460;
    }
    .section.warning { border-left-color: #e94560; }
    .section.success { border-left-color: #2ecc71; }
    .section.info { border-left-color: #3498db; }
    .section h2 {
      font-size: 18px;
      font-weight: 700;
      color: #0f3460;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section.warning h2 { color: #e94560; }
    .section.success h2 { color: #27ae60; }
    .section.info h2 { color: #2980b9; }

    /* Alert box */
    .alert {
      background: #fff5f5;
      border: 1px solid #ffcccc;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #c0392b;
      line-height: 1.6;
    }
    .alert strong { display: block; margin-bottom: 4px; font-size: 15px; }

    .note {
      background: #f0f9ff;
      border: 1px solid #bce4ff;
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 13px;
      color: #1a6090;
      margin-top: 12px;
      line-height: 1.6;
    }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
    thead tr { background: #0f3460; color: white; }
    thead th { padding: 12px 14px; text-align: left; font-weight: 600; }
    tbody tr { border-bottom: 1px solid #eef0f4; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #eef6ff; }
    td { padding: 11px 14px; vertical-align: top; line-height: 1.5; }
    td:first-child { font-weight: 600; color: #0f3460; }
    .pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .pill.green { background: #d4edda; color: #155724; }
    .pill.red { background: #f8d7da; color: #721c24; }
    .pill.blue { background: #cce5ff; color: #004085; }
    .pill.orange { background: #fff3cd; color: #856404; }
    .pill.purple { background: #e2d9f3; color: #4b0082; }

    /* Option cards */
    .options { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .option-card {
      border-radius: 10px;
      padding: 20px;
      border: 2px solid #e2e8f0;
    }
    .option-card.recommended {
      border-color: #27ae60;
      background: #f0fff4;
    }
    .option-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .option-card .price {
      font-size: 22px;
      font-weight: 800;
      color: #0f3460;
      margin-bottom: 10px;
    }
    .option-card .price span { font-size: 13px; font-weight: 400; color: #888; }
    .option-card ul { padding-left: 18px; font-size: 13px; color: #444; line-height: 1.8; }
    .rec-badge {
      display: inline-block;
      background: #27ae60;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 20px;
      margin-bottom: 8px;
    }

    /* Summary table */
    .total-row td { background: #0f3460 !important; color: white !important; font-weight: 700; font-size: 15px; }
    .total-row td:first-child { color: white !important; }

    /* Timeline */
    .timeline { margin-top: 12px; }
    .step {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      align-items: flex-start;
    }
    .step-num {
      min-width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0f3460;
      color: white;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .step-content h4 { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .step-content p { font-size: 13px; color: #555; line-height: 1.5; }
    code {
      background: #f1f3f5;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      color: #e94560;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px;
      color: #888;
      font-size: 13px;
      margin-top: 8px;
    }

    @media print {
      body { background: white; padding: 0; }
      .section { box-shadow: none; break-inside: avoid; }
      .options { break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="header">
    <h1>🏏 Cricket Analytics Platform</h1>
    <p>Production Infrastructure &amp; Hosting Cost Report</p>
    <p>Deployment Options, Pricing &amp; Recommendations</p>
    <div class="date">Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    <div class="badge">Confidential</div>
  </div>

  <!-- Critical Warning -->
  <div class="section warning">
    <h2>⚠️ Critical Issue — Socket.IO on Vercel</h2>
    <div class="alert">
      <strong>Socket.IO will NOT work on Vercel (Serverless)</strong>
      The live score feature uses Socket.IO attached to a persistent Node.js HTTP server
      (<code>res.socket.server</code> in <code>pages/api/socket.ts</code>).
      Vercel's serverless functions are stateless — they spin up and die per request.
      There is no persistent server to attach Socket.IO to.
      This means <strong>all real-time live score updates will be broken</strong> if deployed to Vercel without changes.
    </div>
    <div class="note">
      ✅ This is NOT a code bug — the implementation is correct for a Node.js server environment.
      The fix is simply choosing the right hosting platform that supports persistent connections,
      or separating the Socket.IO server to a dedicated host.
    </div>
  </div>

  <!-- Hosting Options -->
  <div class="section">
    <h2>🏗️ Hosting Options Compared</h2>
    <div class="options">
      <div class="option-card">
        <h3>Option A — Vercel + Railway</h3>
        <div class="price">$25 <span>/ month</span></div>
        <ul>
          <li>Vercel Pro — Next.js frontend + APIs</li>
          <li>Railway — Socket.IO live score server</li>
          <li>Best for teams familiar with Vercel</li>
          <li>Daily cron jobs work out of the box</li>
          <li>Needs minor config to split Socket.IO</li>
        </ul>
      </div>
      <div class="option-card recommended">
        <div class="rec-badge">✅ RECOMMENDED</div>
        <h3>Option B — Railway (All-in-One)</h3>
        <div class="price">$5–10 <span>/ month</span></div>
        <ul>
          <li>Full Node.js server — everything works</li>
          <li>Socket.IO works natively, zero changes</li>
          <li>Cheapest option — one platform</li>
          <li>Custom domain support</li>
          <li>Auto-deploy from GitHub</li>
          <li>PostgreSQL add-on available</li>
        </ul>
      </div>
    </div>
    <div class="options" style="margin-top:16px;">
      <div class="option-card">
        <h3>Option C — Render</h3>
        <div class="price">$7 <span>/ month</span></div>
        <ul>
          <li>Similar to Railway — full Node.js</li>
          <li>Free tier available (sleeps after 15 min)</li>
          <li>Paid plan keeps server always on</li>
          <li>Socket.IO works natively</li>
          <li>Good free PostgreSQL tier</li>
        </ul>
      </div>
      <div class="option-card">
        <h3>Option D — DigitalOcean App Platform</h3>
        <div class="price">$12 <span>/ month</span></div>
        <ul>
          <li>Full control, managed Node.js</li>
          <li>Socket.IO works natively</li>
          <li>More setup required than Railway</li>
          <li>Good for scaling later</li>
          <li>Managed PostgreSQL available ($15+/month)</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Full Cost Breakdown -->
  <div class="section info">
    <h2>💰 Full Monthly Cost Breakdown (Recommended Stack)</h2>
    <table>
      <thead>
        <tr>
          <th>Service</th>
          <th>Purpose</th>
          <th>Plan</th>
          <th>Monthly Cost</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Railway</td>
          <td>App Hosting (Next.js + Socket.IO)</td>
          <td>Starter / Pro</td>
          <td>$5 – $10</td>
          <td><span class="pill green">Recommended</span></td>
        </tr>
        <tr>
          <td>Neon PostgreSQL</td>
          <td>Database (already set up)</td>
          <td>Free / Launch ($19)</td>
          <td>$0 – $19</td>
          <td><span class="pill blue">Already Active</span></td>
        </tr>
        <tr>
          <td>CricAPI</td>
          <td>Live Cricket Scores (all global matches)</td>
          <td>~$100/month plan</td>
          <td>~$100</td>
          <td><span class="pill orange">Upgrade Needed</span></td>
        </tr>
        <tr>
          <td>Roanuz Cricket API</td>
          <td>Tournament Data (fallback)</td>
          <td>Current Plan</td>
          <td>TBD</td>
          <td><span class="pill blue">Active</span></td>
        </tr>
        <tr>
          <td>Sanity CMS</td>
          <td>Blog / News Content</td>
          <td>Free (Growth $15)</td>
          <td>$0 – $15</td>
          <td><span class="pill blue">Active</span></td>
        </tr>
        <tr>
          <td>OpenAI API</td>
          <td>AI Blog Generation + Analysis</td>
          <td>Pay-per-use</td>
          <td>~$5 – $20</td>
          <td><span class="pill blue">Active</span></td>
        </tr>
        <tr>
          <td>Domain Name</td>
          <td>Custom domain (e.g. crickettips.in)</td>
          <td>Annual</td>
          <td>~$1 – $2</td>
          <td><span class="pill orange">To Purchase</span></td>
        </tr>
        <tr>
          <td>Cloudflare</td>
          <td>DNS + CDN + DDoS Protection</td>
          <td>Free</td>
          <td>$0</td>
          <td><span class="pill green">Recommended</span></td>
        </tr>
        <tr class="total-row">
          <td colspan="3">💰 TOTAL ESTIMATED (Minimum)</td>
          <td>~$111 / month</td>
          <td></td>
        </tr>
        <tr class="total-row" style="opacity:0.85;">
          <td colspan="3">💰 TOTAL ESTIMATED (Maximum)</td>
          <td>~$149 / month</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <div class="note">
      💡 The biggest cost is CricAPI (~$100/month) for 5-second live score polling of all global matches.
      If you reduce polling to 30 seconds, a cheaper CricAPI plan (~$20–30/month) would suffice.
      Total drops to <strong>~$50–70/month</strong>.
    </div>
  </div>

  <!-- Vercel-only pricing -->
  <div class="section">
    <h2>📊 Vercel Pricing (For Reference)</h2>
    <table>
      <thead>
        <tr>
          <th>Plan</th>
          <th>Cost</th>
          <th>Bandwidth</th>
          <th>Serverless Invocations</th>
          <th>Commercial Use</th>
          <th>Socket.IO</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Hobby</td>
          <td>Free</td>
          <td>100 GB</td>
          <td>1M / month</td>
          <td><span class="pill red">❌ Not Allowed</span></td>
          <td><span class="pill red">❌ Broken</span></td>
        </tr>
        <tr>
          <td>Pro</td>
          <td>$20 / month</td>
          <td>1 TB</td>
          <td>10M / month</td>
          <td><span class="pill green">✅ Allowed</span></td>
          <td><span class="pill red">❌ Broken</span></td>
        </tr>
        <tr>
          <td>Enterprise</td>
          <td>Custom (~$20K/yr)</td>
          <td>Custom</td>
          <td>Custom</td>
          <td><span class="pill green">✅ Allowed</span></td>
          <td><span class="pill red">❌ Broken</span></td>
        </tr>
      </tbody>
    </table>
    <div class="alert" style="margin-top:16px;">
      <strong>Important:</strong> Even on Vercel Pro ($20/month), Socket.IO live scores will NOT work
      due to serverless architecture limitations. This is true on all Vercel plans.
    </div>
  </div>

  <!-- What's Already Done -->
  <div class="section success">
    <h2>✅ Already Production-Ready</h2>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Status</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>TypeScript</td>
          <td><span class="pill green">✅ 0 Errors</span></td>
          <td>Clean build — npx tsc --noEmit passes</td>
        </tr>
        <tr>
          <td>.env excluded from Git</td>
          <td><span class="pill green">✅ Safe</span></td>
          <td>.gitignore correctly excludes .env</td>
        </tr>
        <tr>
          <td>Vercel Cron Job</td>
          <td><span class="pill green">✅ Ready</span></td>
          <td>vercel.json — daily blog at 6 AM UTC</td>
        </tr>
        <tr>
          <td>Database Schema</td>
          <td><span class="pill green">✅ Ready</span></td>
          <td>Neon PostgreSQL — run prisma db push on prod</td>
        </tr>
        <tr>
          <td>CricAPI Fallback</td>
          <td><span class="pill green">✅ Done</span></td>
          <td>Roanuz primary → CricAPI fallback on all routes</td>
        </tr>
        <tr>
          <td>Live Score Poller</td>
          <td><span class="pill green">✅ Rewritten</span></td>
          <td>CricAPI-powered, 1 call per 5s, all global matches</td>
        </tr>
        <tr>
          <td>Role-Based Access</td>
          <td><span class="pill green">✅ Done</span></td>
          <td>ADMIN / TIPSTER / USER roles enforced</td>
        </tr>
        <tr>
          <td>Auth URLs</td>
          <td><span class="pill red">❌ Update Needed</span></td>
          <td>BETTER_AUTH_URL still set to localhost:3000</td>
        </tr>
        <tr>
          <td>Blog Secret</td>
          <td><span class="pill orange">⚠️ Empty</span></td>
          <td>BLOG_GENERATE_SECRET is blank — anyone can trigger generation</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Deployment Steps -->
  <div class="section">
    <h2>🚀 Deployment Steps (Railway — Recommended)</h2>
    <div class="timeline">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-content">
          <h4>Register Domain</h4>
          <p>Buy domain (Namecheap / Cloudflare Domains). Set nameservers to Cloudflare for free CDN + DDoS protection.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-content">
          <h4>Push Code to GitHub</h4>
          <p>Create a GitHub repo and push. Railway deploys automatically on every push to main branch.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-content">
          <h4>Create Railway Project</h4>
          <p>Go to railway.app → New Project → Deploy from GitHub repo → Select your repo.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div class="step-content">
          <h4>Set Environment Variables</h4>
          <p>In Railway dashboard → Variables → Add all keys from your .env file. Change <code>BETTER_AUTH_URL</code> to your prod domain. Set a strong <code>BLOG_GENERATE_SECRET</code>.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num">5</div>
        <div class="step-content">
          <h4>Run Database Migration</h4>
          <p>In Railway terminal or locally: <code>npx prisma db push</code> against prod <code>DATABASE_URL</code>.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num">6</div>
        <div class="step-content">
          <h4>Connect Custom Domain</h4>
          <p>In Railway → Settings → Domains → Add custom domain → Point DNS A/CNAME records to Railway.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num">7</div>
        <div class="step-content">
          <h4>Test Live Scores</h4>
          <p>Open your prod URL → check live matches page → verify Socket.IO connects and score:update events arrive every 5 seconds.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num">8</div>
        <div class="step-content">
          <h4>Upgrade CricAPI Plan</h4>
          <p>Before IPL season, upgrade CricAPI to ~$100/month unlimited plan to support 5-second polling for all global matches.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Future Costs -->
  <div class="section info">
    <h2>📈 Future Cost Estimate (After Subscriptions Launch)</h2>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Cost</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Razorpay</td>
          <td>2% per transaction</td>
          <td>India payments — UPI, Cards, Net Banking</td>
        </tr>
        <tr>
          <td>Stripe</td>
          <td>1.4% + 20p (EU) / 2.9% + 30¢ (US)</td>
          <td>Global payments — Cards, Apple/Google Pay</td>
        </tr>
        <tr>
          <td>Railway (scaled)</td>
          <td>$20 – $50 / month</td>
          <td>More resources as user base grows</td>
        </tr>
        <tr>
          <td>Neon PostgreSQL (scaled)</td>
          <td>$19 / month</td>
          <td>Launch plan for production workloads</td>
        </tr>
        <tr>
          <td>Push Notifications (future)</td>
          <td>$0 – $25 / month</td>
          <td>Firebase Cloud Messaging (free) or OneSignal</td>
        </tr>
        <tr class="total-row">
          <td colspan="2">💰 Estimated Total (After Subscriptions)</td>
          <td>~$160 – $200 / month</td>
        </tr>
      </tbody>
    </table>
    <div class="note">
      📊 Break-even: At ₹499/month per subscriber → need only <strong>17–20 paid Indian subscribers</strong> to cover all infrastructure costs.
      At $9.99/month global → need only <strong>16–20 global subscribers</strong>.
    </div>
  </div>

  <div class="footer">
    Cricket Analytics Platform — Infrastructure Report &nbsp;|&nbsp; Confidential &nbsp;|&nbsp;
    ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
  </div>

</div>
</body>
</html>`

const outPath = join(OUT_DIR, 'cricket-analytics-infra-report.html')
writeFileSync(outPath, html, 'utf8')
console.log(`✅ Report saved to: ${outPath}`)
console.log(`   Open in browser and use Ctrl+P → Save as PDF`)
