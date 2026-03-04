import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'

export async function GET() {
  await requireRole(['ADMIN'])
  const url = process.env.STREAMING_SERVICE_URL
  if (!url) return NextResponse.json({ error: 'STREAMING_SERVICE_URL not set' }, { status: 503 })

  try {
    const res = await fetch(`${url}/video/recent`, { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
