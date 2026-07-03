'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Zap, Trophy, Sparkles, X } from 'lucide-react'
import { Shield } from 'lucide-react'
import Link from 'next/link'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: any) => { open(): void }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    icon: Zap,
    color: 'text-gray-400',
    border: 'border-gray-700',
    ring: '',
    features: ['3 AI predictions per week', 'Basic win probability', 'Match analysis cards'],
    cta: 'Continue with Free',
    ctaStyle: 'bg-gray-800 hover:bg-gray-700 text-white',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹299',
    period: '/month',
    amount: 29900,
    icon: Trophy,
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    ring: 'ring-1 ring-emerald-500/30',
    badge: 'Most Popular',
    features: ['Unlimited AI predictions', 'Live win probability', 'WhatsApp + Telegram tips', 'Early access to predictions'],
    cta: 'Subscribe to Pro',
    ctaStyle: 'bg-emerald-500 hover:bg-emerald-400 text-white',
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '₹699',
    period: '/month',
    amount: 69900,
    icon: Sparkles,
    color: 'text-yellow-400',
    border: 'border-yellow-500/30',
    ring: '',
    features: ['Everything in Pro', 'VIP WhatsApp group', 'Match previews 24h early', 'Dedicated 1-on-1 support'],
    cta: 'Subscribe to Elite',
    ctaStyle: 'bg-yellow-500 hover:bg-yellow-400 text-black',
  },
]

export default function SelectPlanPage() {
  const router = useRouter()
  const [paying, setPaying] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleFree() {
    router.push('/plans/free')
  }

  async function handlePaid(plan: typeof PLANS[1]) {
    setError('')
    setPaying(plan.id)

    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) { setError('Failed to load payment gateway.'); setPaying(null); return }

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setPaying(null); return }

      const rzKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!rzKey) {
        setError('Payment gateway not configured. Please contact support.')
        setPaying(null)
        return
      }

      const options = {
        key: rzKey,
        amount: data.amount,
        currency: data.currency,
        name: 'CricketTips AI',
        description: `${plan.name} Plan — Monthly`,
        order_id: data.orderId,
        theme: { color: '#10b981' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verify = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          const vData = await verify.json()
          if (vData.success) {
            router.push(`/plans/${vData.plan}`)
          } else {
            setError('Payment verification failed. Please contact support.')
            setPaying(null)
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(null)
            setError('Payment cancelled. You can continue with the Free plan or try again.')
          },
        },
      }

      const rz = new window.Razorpay(options)
      rz.open()
    } catch {
      setError('Something went wrong. Please try again.')
      setPaying(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Shield className="w-7 h-7 text-emerald-400" />
            <span className="text-lg font-extrabold text-white tracking-tight">
              CricketTips<span className="text-emerald-400">.ai</span>
            </span>
          </Link>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
              Account created
            </div>
            <div className="w-8 h-px bg-gray-700" />
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">2</span>
              Choose your plan
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Choose your plan</h1>
          <p className="text-gray-400 text-sm mt-2">
            Start free — upgrade anytime. Paid plans unlock unlimited AI predictions &amp; WhatsApp tips.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-start gap-3 max-w-lg mx-auto">
            <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => {
            const Icon = plan.icon
            const isPaying = paying === plan.id
            const isDisabled = paying !== null && !isPaying

            return (
              <div
                key={plan.id}
                className={`relative bg-gray-900 border rounded-2xl p-6 flex flex-col gap-4 transition-all ${plan.border} ${plan.ring} ${isDisabled ? 'opacity-50' : ''}`}
              >
                {'badge' in plan && plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${plan.id === 'pro' ? 'bg-emerald-500/15' : plan.id === 'elite' ? 'bg-yellow-500/10' : 'bg-gray-800'}`}>
                    <Icon className={`w-5 h-5 ${plan.color}`} />
                  </div>
                  <h2 className="text-lg font-extrabold text-white">{plan.name}</h2>
                  <div className="flex items-end gap-1 mt-1">
                    <span className={`text-2xl font-extrabold ${plan.color}`}>{plan.price}</span>
                    <span className="text-gray-500 text-sm mb-0.5">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.color}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => plan.id === 'free' ? handleFree() : handlePaid(plan as typeof PLANS[1])}
                  disabled={isDisabled || isPaying}
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-colors disabled:opacity-60 ${plan.ctaStyle}`}
                >
                  {isPaying ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Opening checkout…
                    </span>
                  ) : plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        <p className="text-center text-gray-600 text-xs mt-8">
          Payments secured by Razorpay · UPI, Cards, Net banking · Cancel anytime
        </p>
      </div>
    </div>
  )
}
