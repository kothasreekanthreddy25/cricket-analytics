import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

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

    await prisma.subscription.update({
      where: { razorpayOrderId: razorpay_order_id },
      data: { razorpayPaymentId: razorpay_payment_id, status: 'paid' },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[verify-payment]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
