import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { whatsapp, telegram, email, name } = body

    if (!whatsapp && !telegram && !email) {
      return NextResponse.json({ success: false, error: 'Provide WhatsApp number, Telegram ID, or email' }, { status: 400 })
    }

    const cleanNumber = whatsapp ? whatsapp.replace(/[\s\-().]/g, '') : null
    const cleanTelegram = telegram ? telegram.replace(/^@/, '').trim() : null
    const cleanEmail = email ? email.trim().toLowerCase() : null

    const lead = await prisma.predictionLead.create({
      data: {
        whatsapp: cleanNumber || null,
        telegram: cleanTelegram || null,
        email: cleanEmail || null,
        emailOptIn: !!cleanEmail,
        name: name || null,
        source: 'popup',
      },
    })

    return NextResponse.json({ success: true, leadId: lead.id })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
