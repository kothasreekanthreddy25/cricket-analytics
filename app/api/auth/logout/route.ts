import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(clearSessionCookie())
  res.cookies.set({ name: 'ct_plan', value: '', maxAge: 0, path: '/' })
  return res
}
