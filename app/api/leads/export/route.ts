import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const adminSecret = process.env.ADMIN_SECRET || 'crickettips2026'

  if (secret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leads = await prisma.predictionLead.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const rows = [
    ['#', 'Name', 'Channel', 'WhatsApp', 'Telegram', 'Date (IST)'],
    ...leads.map((l, i) => [
      String(i + 1),
      l.name || '',
      l.whatsapp ? 'WhatsApp' : 'Telegram',
      l.whatsapp || '',
      l.telegram ? `@${l.telegram}` : '',
      new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    ]),
  ]

  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="crickettips-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
