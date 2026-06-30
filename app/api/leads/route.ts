import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kothasreekanthreddy25@gmail.com'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { whatsapp, telegram, name } = body

    if (!whatsapp && !telegram) {
      return NextResponse.json({ success: false, error: 'Provide WhatsApp number or Telegram ID' }, { status: 400 })
    }

    const cleanNumber = whatsapp ? whatsapp.replace(/[\s\-().]/g, '') : null
    const cleanTelegram = telegram ? telegram.replace(/^@/, '').trim() : null

    await prisma.predictionLead.create({
      data: {
        whatsapp: cleanNumber || null,
        telegram: cleanTelegram || null,
        name: name || null,
        source: 'popup',
      },
    })

    // Send email notification (fire-and-forget — don't block the response)
    if (process.env.RESEND_API_KEY) {
      const channel = cleanTelegram ? 'Telegram' : 'WhatsApp'
      const contact = cleanTelegram ? `@${cleanTelegram}` : cleanNumber
      resend.emails.send({
        from: 'CricketTips Leads <onboarding@resend.dev>',
        to: ADMIN_EMAIL,
        subject: `🏏 New Lead — ${name || 'Anonymous'} via ${channel}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:24px;border-radius:12px">
            <h2 style="color:#34d399;margin:0 0 16px">New CricketTips Lead 🎉</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#94a3b8;width:120px">Name</td><td style="padding:8px 0;font-weight:bold">${name || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#94a3b8">Channel</td><td style="padding:8px 0;font-weight:bold;color:${cleanTelegram ? '#60a5fa' : '#4ade80'}">${channel}</td></tr>
              <tr><td style="padding:8px 0;color:#94a3b8">Contact</td><td style="padding:8px 0;font-weight:bold">${contact}</td></tr>
              <tr><td style="padding:8px 0;color:#94a3b8">Time</td><td style="padding:8px 0">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
            </table>
            <a href="https://crickettips.ai/admin/leads" style="display:inline-block;margin-top:20px;background:#34d399;color:#0f172a;padding:10px 20px;border-radius:8px;font-weight:bold;text-decoration:none">View All Leads →</a>
          </div>
        `,
      }).catch(() => {}) // silently ignore email errors
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
