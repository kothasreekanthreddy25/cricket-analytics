import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signSession, sessionCookieOptions } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { name, email, password, phone } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, phone: phone || null, passwordHash, role: 'USER', plan: 'free' },
    })

    const token = await signSession({ userId: user.id, email: user.email, name: user.name, plan: user.plan, role: user.role })

    const res = NextResponse.json({ success: true, plan: user.plan })
    res.cookies.set(sessionCookieOptions(token))
    return res
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
