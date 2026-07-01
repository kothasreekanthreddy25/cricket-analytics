'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  plan: 'pro' | 'elite'
  label: string
  price: string
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: any) => { open(): void }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const existing = document.getElementById('razorpay-script')
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      return
    }
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function RazorpayCheckout({ plan, label, price }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  async function handlePay() {
    if (!name.trim()) { setError('Please enter your name'); return }
    setError('')
    setLoading(true)

    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) { setError('Failed to load payment gateway. Please try again.'); setLoading(false); return }

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, name, email, phone }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }

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
          const verify = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          const vData = await verify.json()
          if (vData.success) {
            window.location.href = '/pricing?success=1'
          } else {
            setError('Payment verification failed. Please contact support.')
            setLoading(false)
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      }

      setOpen(false)
      const rz = new window.Razorpay(options)
      rz.open()
    } catch (e) {
      console.error(e)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-2xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white transition-colors cursor-pointer"
      >
        Get {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />

          {/* Modal */}
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-white font-extrabold text-lg mb-1">Subscribe to {label}</h3>
            <p className="text-gray-400 text-sm mb-5">{price} · Cancel anytime</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Your name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email (optional)</label>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Phone (optional)</label>
                <input
                  type="tel"
                  placeholder="+91 9999999999"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={loading}
                className="w-full py-3 rounded-2xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white transition-colors mt-1"
              >
                {loading ? 'Opening checkout…' : `Pay ${price} →`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
