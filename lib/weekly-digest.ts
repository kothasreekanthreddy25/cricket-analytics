import { prisma } from './prisma'
import { sendEmail, isResendConfigured } from './resend'
import { getTopWeeklyPredictions, type TopWeeklyPrediction } from './top-weekly'

const BASE_URL = 'https://crickettips.ai'

interface DigestStats {
  settled: number
  correct: number
  accuracy: number
}

// Lightweight DB-only accuracy count — deliberately not the live
// SportMonks-settling version in /api/predictions/performance, which takes
// 30s+ per request. The digest just needs a headline number, not a fetch
// loop over every unsettled match.
async function getRecentAccuracyStats(): Promise<DigestStats> {
  const records = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { matchKey: true, teamA: true, teamB: true, winProbabilityA: true, winProbabilityB: true, rawData: true },
  })

  const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'test', 'unknown'])
  const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())
  const norm = (p: number) => p > 1 ? p / 100 : p

  const seen = new Set<string>()
  let settled = 0
  let correct = 0
  for (const r of records) {
    if (isDummy(r.teamA) || isDummy(r.teamB)) continue
    if (seen.has(r.matchKey)) continue
    seen.add(r.matchKey)

    const raw = r.rawData as any
    const actualWinner: string | null = raw?.actualWinner || null
    if (!actualWinner) continue

    const pA = norm(Math.max(0.01, r.winProbabilityA))
    const pB = norm(Math.max(0.01, r.winProbabilityB))
    const total = pA + pB
    const normA = total > 0 ? pA / total : 0.5
    const predictedWinner = normA >= 0.5 ? r.teamA : r.teamB

    settled++
    if (actualWinner === predictedWinner) correct++
  }

  return { settled, correct, accuracy: settled > 0 ? Math.round((correct / settled) * 100) : 0 }
}

function formatPrediction(p: TopWeeklyPrediction): string {
  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #262626;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#ffffff;">${p.teamA} vs ${p.teamB}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
          Pick: <strong style="color:#34d399;">${p.predictedWinner}</strong> (${p.winPct}%) ·
          ${p.confidence.replace('_', ' ')} confidence
        </p>
        ${p.tip ? `<p style="margin:0 0 8px;font-size:13px;color:#d1d5db;">${p.tip}</p>` : ''}
        <a href="${BASE_URL}/analysis?match=${p.matchKey}" style="font-size:13px;color:#34d399;text-decoration:none;">View full analysis &rarr;</a>
      </td>
    </tr>`
}

function buildDigestHtml({
  name,
  stats,
  predictions,
  unsubscribeUrl,
}: {
  name: string | null
  stats: DigestStats
  predictions: TopWeeklyPrediction[]
  unsubscribeUrl: string
}): string {
  const greeting = name ? `Hi ${name},` : 'Hi there,'
  return `
  <div style="background:#0a0a0a;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:18px;font-weight:800;color:#ffffff;">CricketTips<span style="color:#34d399;">.ai</span></span>
        </td>
      </tr>
      <tr>
        <td style="background:#111111;border:1px solid #262626;border-radius:16px;padding:28px;">
          <p style="margin:0 0 4px;font-size:14px;color:#9ca3af;">${greeting}</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">This Week's Top AI Predictions</h1>

          ${stats.settled >= 10 ? `
          <table role="presentation" width="100%" style="margin-bottom:20px;">
            <tr>
              <td style="background:#0a0a0a;border-radius:12px;padding:14px 18px;">
                <span style="font-size:13px;color:#9ca3af;">Track record so far: </span>
                <strong style="font-size:15px;color:#34d399;">${stats.accuracy}% accuracy</strong>
                <span style="font-size:13px;color:#6b7280;"> (${stats.correct}/${stats.settled} settled)</span>
              </td>
            </tr>
          </table>` : ''}

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${predictions.map(formatPrediction).join('')}
          </table>

          <table role="presentation" width="100%" style="margin-top:24px;">
            <tr>
              <td style="text-align:center;">
                <a href="${BASE_URL}/predictions" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;">
                  See All Predictions
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top:20px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;color:#6b7280;">
            18+ For informational purposes only. Past accuracy does not guarantee future results.
          </p>
          <p style="margin:0;font-size:11px;color:#6b7280;">
            <a href="${unsubscribeUrl}" style="color:#6b7280;">Unsubscribe from weekly emails</a>
          </p>
        </td>
      </tr>
    </table>
  </div>`
}

export async function sendWeeklyDigest(): Promise<{ sent: number; failed: number }> {
  if (!isResendConfigured()) return { sent: 0, failed: 0 }

  const leads = await prisma.predictionLead.findMany({
    where: { email: { not: null }, emailOptIn: true },
    select: { id: true, email: true, name: true },
  })
  if (leads.length === 0) return { sent: 0, failed: 0 }

  const [stats, allPredictions] = await Promise.all([
    getRecentAccuracyStats(),
    getTopWeeklyPredictions(),
  ])
  const predictions = allPredictions.slice(0, 5)
  if (predictions.length === 0) return { sent: 0, failed: 0 }

  let sent = 0
  let failed = 0
  for (const lead of leads) {
    if (!lead.email) continue
    const unsubscribeUrl = `${BASE_URL}/api/leads/unsubscribe?id=${lead.id}`
    const html = buildDigestHtml({ name: lead.name, stats, predictions, unsubscribeUrl })
    const ok = await sendEmail({
      to: lead.email,
      subject: `This Week's Top AI Cricket Predictions${stats.settled >= 10 ? ` — ${stats.accuracy}% Accuracy` : ''}`,
      html,
    })
    if (ok) sent++
    else failed++
    // Gentle rate limit — Resend's free tier caps at ~2 requests/second
    await new Promise(r => setTimeout(r, 250))
  }

  return { sent, failed }
}
