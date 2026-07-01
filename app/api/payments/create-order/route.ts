import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const PLANS = {
  pro: { amount: 29900, label: 'Pro' },
  elite: { amount: 69900, label: 'Elite' },
}

function getRazorpay() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Razorpay = require('razorpay')
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

export async function POST(req: Request) {
  try {
    const { plan, name, email, phone } = await req.json()

    if (!plan || !(plan in PLANS)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { amount, label } = PLANS[plan as keyof typeof PLANS]
    const razorpay = getRazorpay()

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `ct_${plan}_${Date.now()}`,
      notes: { plan: label, name: name || '', email: email || '' },
    })

    await prisma.subscription.create({
      data: {
        razorpayOrderId: order.id,
        plan,
        amount,
        currency: 'INR',
        status: 'created',
        name: name || null,
        email: email || null,
        phone: phone || null,
      },
    })

    return NextResponse.json({ orderId: order.id, amount, currency: 'INR', plan })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[create-order]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
