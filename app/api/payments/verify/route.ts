import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSession, signSession, sessionCookieOptions } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

    const secret = process.env.RAZORPAY_KEY_SECRET!
    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 })
    }

    const sub = await prisma.subscription.update({
      where: { razorpayOrderId: razorpay_order_id },
      data: { razorpayPaymentId: razorpay_payment_id, status: 'paid' },
    })

    // If user is logged in, upgrade their plan in DB and refresh their JWT
    const session = await getSession()
    let newToken: string | null = null
    if (session) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { plan: sub.plan },
      })
      newToken = await signSession({ ...session, plan: sub.plan })
    }

    const res = NextResponse.json({ success: true, plan: sub.plan })

    // Refresh JWT with new plan if user was logged in
    if (newToken) res.cookies.set(sessionCookieOptions(newToken))

    // Set plan cookie (30 days)
    res.cookies.set('ct_plan', sub.plan, {
      httpOnly: false, // readable by client for UI
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    res.cookies.set('ct_sub_id', sub.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return res
  } catch (err) {
    console.error('[verify-payment]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
