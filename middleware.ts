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

  // Auth pages — redirect to dashboard if already logged in
  if (pathname.startsWith('/auth/signin') || pathname.startsWith('/auth/signup')) {
    const session = await getSessionFromRequest(request)
    if (session) {
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

    // Gate Pro/Elite pages by plan
    if (pathname.startsWith('/plans/pro') && session.plan === 'free') {
      return NextResponse.redirect(new URL('/plans/free?upgrade=pro', request.url))
    }
    if (pathname.startsWith('/plans/elite') && session.plan !== 'elite') {
      return NextResponse.redirect(new URL(`/plans/${session.plan}?upgrade=elite`, request.url))
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/auth/signin', '/auth/signup', '/plans/:path*'],
}
