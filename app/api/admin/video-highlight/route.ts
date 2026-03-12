import { NextRequest, NextResponse } from 'next/server'

const STREAMING_URL = process.env.STREAMING_SERVICE_URL || ''

export async function POST(req: NextRequest) {
  try {
    const { topic, stats, type, keywords } = await req.json()
    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 })
    }
    if (!STREAMING_URL) {
      return NextResponse.json({ error: 'STREAMING_SERVICE_URL not configured' }, { status: 500 })
    }

    const res = await fetch(`${STREAMING_URL}/video/highlight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic.trim(), stats, type, keywords }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
