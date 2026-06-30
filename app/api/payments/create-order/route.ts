import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const PLANS = {
  pro: { amount: 29900, label: 'Pro' },    // ₹299 in paise
  elite: { amount: 69900, label: 'Elite' }, // ₹699 in paise
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: Request) {
  try {
    const { plan, name, email, phone } = await req.json()

    if (!plan || !(plan in PLANS)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { amount, label } = PLANS[plan as keyof typeof PLANS]

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
  } catch (err) {
    console.error('[create-order]', err)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
