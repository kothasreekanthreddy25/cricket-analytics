'use client'

import { useState } from 'react'

interface Props {
  plan: 'pro' | 'elite'
  label: string
  price: string
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (document.getElementById('razorpay-script')) { resolve(true); return }
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function RazorpayCheckout({ plan, label, price }: Props) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'idle' | 'form' | 'processing'>('idle')

  async function handlePay() {
    setLoading(true)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) { alert('Failed to load payment gateway. Please try again.'); return }

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, name, email, phone }),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: 'CricketTips AI',
        description: `${label} Plan — Monthly`,
        order_id: data.orderId,
        prefill: { name, email, contact: phone },
        theme: { color: '#10b981' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setStep('processing')
          const verify = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          const vData = await verify.json()
          if (vData.success) {
            window.location.href = '/pricing?success=1'
          } else {
            alert('Payment verification failed. Please contact support.')
            setStep('form')
          }
        },
        modal: {
          ondismiss: () => { setLoading(false); setStep('form') },
        },
      }

      const rz = new window.Razorpay(options)
      rz.open()
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('form')}
        className="w-full py-3 rounded-2xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-white transition-colors"
      >
        Get {label}
      </button>
    )
  }

  if (step === 'processing') {
    return (
      <div className="w-full py-3 rounded-2xl text-sm text-center text-gray-400 border border-gray-700">
        Verifying payment…
      </div>
    )
  }

  return (
    <div className="space-y-2 mt-2">
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"
      />
      <input
        type="email"
        placeholder="Email (optional)"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"
      />
      <input
        type="tel"
        placeholder="Phone (optional)"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"
      />
      <button
        onClick={handlePay}
        disabled={loading || !name}
        className="w-full py-3 rounded-2xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white transition-colors"
      >
        {loading ? 'Opening checkout…' : `Pay ${price} →`}
      </button>
      <button
        onClick={() => setStep('idle')}
        className="w-full text-xs text-gray-600 hover:text-gray-400 py-1 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
