import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
