import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST() {
  // Use Next.js cookie store to delete — most reliable method
  cookies().delete('ct_user_session')
  return NextResponse.json({ success: true })
}
