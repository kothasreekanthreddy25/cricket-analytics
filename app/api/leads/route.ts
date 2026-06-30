import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { whatsapp, name } = body

    if (!whatsapp && !name) {
      return NextResponse.json({ success: false, error: 'No data provided' }, { status: 400 })
    }

    // Normalise WhatsApp number — strip spaces/dashes
    const cleanNumber = whatsapp ? whatsapp.replace(/[\s\-().]/g, '') : null

    await prisma.predictionLead.create({
      data: {
        whatsapp: cleanNumber,
        name: name || null,
        source: 'popup',
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
