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

function withCountry(response: NextResponse, country: string): NextResponse {
  response.headers.set('x-country', country)
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const country =
    request.geo?.country ||
    request.headers.get('cf-ipcountry') ||
    'ZA'

  // Sign in / sign up — redirect if already logged in
  if (pathname === '/auth/signin' || pathname === '/auth/signup') {
    const session = await getSessionFromRequest(request)
    if (session) {
      return withCountry(NextResponse.redirect(new URL(`/plans/${session.plan}`, request.url)), country)
    }
    return withCountry(NextResponse.next(), country)
  }

  // Select plan — must be logged in
  if (pathname === '/auth/select-plan') {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return withCountry(NextResponse.redirect(new URL('/auth/signup', request.url)), country)
    }
    if (session.plan !== 'free') {
      return withCountry(NextResponse.redirect(new URL(`/plans/${session.plan}`, request.url)), country)
    }
    return withCountry(NextResponse.next(), country)
  }

  // Plan dashboards — require login
  if (pathname.startsWith('/plans/')) {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return withCountry(NextResponse.redirect(new URL('/auth/signin', request.url)), country)
    }
    if (pathname.startsWith('/plans/pro') && session.plan === 'free') {
      return withCountry(NextResponse.redirect(new URL('/auth/select-plan', request.url)), country)
    }
    if (pathname.startsWith('/plans/elite') && session.plan !== 'elite') {
      return withCountry(NextResponse.redirect(new URL('/auth/select-plan', request.url)), country)
    }
    return withCountry(NextResponse.next(), country)
  }

  return withCountry(NextResponse.next(), country)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
