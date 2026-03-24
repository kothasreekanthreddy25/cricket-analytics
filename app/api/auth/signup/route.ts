// Signup is handled by BetterAuth at /api/auth/[...all]
// This route is kept for legacy compatibility but redirects to BetterAuth
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Please use the main signup form' },
    { status: 410 }
  )
}
