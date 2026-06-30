import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = cookies()
  const session = cookieStore.get('ct_admin_session')
  const adminPass = process.env.ADMIN_PASSWORD || 'crickettips2026'

  if (!session || session.value !== adminPass) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leads = await prisma.predictionLead.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const rows = [
    ['#', 'Name', 'Channel', 'WhatsApp', 'Telegram', 'Registered (IST)'],
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
