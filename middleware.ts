import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths that don't require authentication
  const publicPaths = ['/auth/signin', '/auth/signup', '/api/auth']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // Check if user has session cookie
  const sessionCookie = request.cookies.get('better-auth.session_token')

  // If accessing auth pages while logged in, redirect to dashboard
  if (isPublicPath && sessionCookie && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If accessing protected pages without session, redirect to signin
  if (!isPublicPath && !sessionCookie && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*']
}
