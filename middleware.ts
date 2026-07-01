import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.BETTER_AUTH_SECRET || 'ct-fallback-secret-change-in-prod'
)

async function getSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get('ct_user_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { userId: string; plan: string; role: string }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Sign in / sign up — redirect to dashboard if already logged in
  if (pathname === '/auth/signin' || pathname === '/auth/signup') {
    const session = await getSessionFromRequest(request)
    if (session) {
      return NextResponse.redirect(new URL(`/plans/${session.plan}`, request.url))
    }
    return NextResponse.next()
  }

  // Select plan — must be logged in, but if already paid redirect to their dashboard
  if (pathname === '/auth/select-plan') {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signup', request.url))
    }
    // Already on a paid plan → skip straight to dashboard
    if (session.plan !== 'free') {
      return NextResponse.redirect(new URL(`/plans/${session.plan}`, request.url))
    }
    return NextResponse.next()
  }

  // Plan dashboards — require login
  if (pathname.startsWith('/plans/')) {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // Free users trying to access pro/elite → redirect to select-plan
    if (pathname.startsWith('/plans/pro') && session.plan === 'free') {
      return NextResponse.redirect(new URL('/auth/select-plan', request.url))
    }
    if (pathname.startsWith('/plans/elite') && session.plan !== 'elite') {
      return NextResponse.redirect(new URL('/auth/select-plan', request.url))
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/auth/signin', '/auth/signup', '/auth/select-plan', '/plans/:path*'],
}
